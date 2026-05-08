import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, ChevronDown, ChevronUp, Activity, GitBranch, Info, HelpCircle, X } from 'lucide-react';

// ============================================================
// CONSTANTS — the locked Tier 1 economics
// ============================================================
const DEFAULT_GOLD_PRICE_PER_GRAM = 150;
const GRAMS_PER_TROY_OZ = 31.1035;
const AGREEMENT_YEARLY_OZ = 1250;
const CONSTRUCTION_WEEKS = 4; // ~30 days
const PROCESSING_FEE = 0.02;

const TIER_SPECS = {
  spark: { name: 'Spark', lockWeeks: 26,  discount: 0.025 },
  flow:  { name: 'Flow',  lockWeeks: 52,  discount: 0.07  },
  vein:  { name: 'Vein',  lockWeeks: 104, discount: 0.188 },
};

// ============================================================
// PERSONAS — three archetypes of users we serve
// ============================================================
// Curious: top-of-funnel testers. Try a Spark, maybe buy again, mostly churn.
// Saver:   disciplined monthly savers building a long-horizon gold position.
// Whale:   HNW buyers using musa as a discounted physical-gold channel.
//
// Tier weights are relative preferences (the allocator normalises them).
const PERSONAS = {
  curious: {
    name: 'Curious',
    color: '#9a9185',
    frequency: 2,      // purchases per year
    avgTicket: 60,     // $
    tierWeights: { spark: 80, flow: 15, vein: 5 },
    baseWeeklyChurn: 0.030,  // 3.0%/week → ~80%/yr compounded
  },
  saver: {
    name: 'Saver',
    color: '#C9A961',
    frequency: 12,     // monthly DCA cadence
    avgTicket: 200,
    tierWeights: { spark: 20, flow: 55, vein: 25 },
    baseWeeklyChurn: 0.005,  // 0.5%/week → ~23%/yr
  },
  whale: {
    name: 'Whale',
    color: '#E4C57E',
    frequency: 2,      // rare but large
    avgTicket: 7500,
    tierWeights: { spark: 5, flow: 25, vein: 70 },
    baseWeeklyChurn: 0.003,  // 0.3%/week → ~14%/yr
  },
  megawhale: {
    name: 'MegaWhale',
    color: '#F4DE9D',
    frequency: 1,      // 1 big annual allocation
    avgTicket: 50000,
    tierWeights: { spark: 0, flow: 10, vein: 90 },
    baseWeeklyChurn: 0.002,  // 0.2%/week → ~10%/yr — stickiest cohort
  },
};

const PERSONA_KEYS = Object.keys(PERSONAS);

// Helper: pick a tier from persona weights (proportional allocation).
// Returns a count-per-tier given a total unit count to distribute.
function allocateTiers(totalUnits, tierWeights) {
  const total = tierWeights.spark + tierWeights.flow + tierWeights.vein;
  const sparkUnits = Math.round(totalUnits * (tierWeights.spark / total));
  const flowUnits  = Math.round(totalUnits * (tierWeights.flow  / total));
  const veinUnits  = totalUnits - sparkUnits - flowUnits;
  return { spark: sparkUnits, flow: flowUnits, vein: veinUnits };
}

// ============================================================
// SCENARIOS
// ============================================================
const SCENARIOS = {
  base: {
    label: 'PWA Base',
    marketingBudgetWeek: 3000,
    cacPerUser: 35,
    organicMultiplier: 30,
    personaMix: { curious: 80, saver: 15, whale: 4, megawhale: 1 },
    audienceVolume: 1.0,
    frequencyMultiplier: 1.0,
    platformMargin: 3.0,
    maxReserveCap: 200_000,
    reserveYieldAnnual: 4.0,
    goldPricePerGram: DEFAULT_GOLD_PRICE_PER_GRAM,
    churnMultiplier: 1.0,
    earlyExitRate: 5,
    defaultRatePerYear: 2,
    monthlyOverhead: 12000,
    reserveContribution: 1.0,
  },
  optimistic: {
    label: 'PWA + PMF',
    marketingBudgetWeek: 5000,
    cacPerUser: 20,
    organicMultiplier: 50,
    personaMix: { curious: 62, saver: 25, whale: 10, megawhale: 3 },
    audienceVolume: 1.3,
    frequencyMultiplier: 1.2,
    platformMargin: 3.0,
    maxReserveCap: 500_000,
    reserveYieldAnnual: 5.0,
    goldPricePerGram: DEFAULT_GOLD_PRICE_PER_GRAM,
    churnMultiplier: 0.6,
    earlyExitRate: 3,
    defaultRatePerYear: 1,
    monthlyOverhead: 15000,
    reserveContribution: 1.0,
  },
  stressed: {
    label: 'Native Cold',
    marketingBudgetWeek: 6000,
    cacPerUser: 80,
    organicMultiplier: 15,
    personaMix: { curious: 88, saver: 10, whale: 2, megawhale: 0 },
    audienceVolume: 0.7,
    frequencyMultiplier: 0.8,
    platformMargin: 3.0,
    maxReserveCap: 300_000,
    reserveYieldAnnual: 3.0,
    goldPricePerGram: DEFAULT_GOLD_PRICE_PER_GRAM,
    churnMultiplier: 2.5,
    earlyExitRate: 15,
    defaultRatePerYear: 6,
    monthlyOverhead: 20000,
    reserveContribution: 1.0,
  },
};

// ============================================================
// SIMULATION STEP
// ============================================================
function createInitialState() {
  return {
    week: 0,
    // Per-persona active user counts (replaces the flat `users` number)
    usersByPersona: { curious: 0, saver: 0, whale: 0, megawhale: 0 },
    totalUsersEver: 0,
    // Per-persona active locked units (for lock-in churn protection)
    lockedUnitsByPersona: { curious: 0, saver: 0, whale: 0, megawhale: 0 },
    activeUnits: 0,
    totalUnitsSold: 0,
    totalCashInflow: 0,
    totalToMiners: 0,
    totalPlatformRevenue: 0,
    totalPlatformCosts: 0,
    totalMarketingSpend: 0,
    totalOverhead: 0,
    totalProcessingFees: 0,
    totalDefaultLosses: 0,
    totalReserveYield: 0,
    totalReserveOverflow: 0,
    reserveBalance: 0,
    totalReserveContributed: 0,
    cumulativeProfit: 0,
    workingCapitalInFlight: 0,
    totalGoldGramsDelivered: 0,
    totalGoldGramsCommitted: 0,
    defaultCount: 0,
    history: [],
    currentFlows: {
      userToPlatform: 0,
      platformToMiner: 0,
      minerToPlatform: 0,
      platformToUser: 0,
    },
    lastEvents: [],
  };
}

function stepSimulation(state, inputs) {
  const next = { ...state };
  next.week += 1;

  // Clone persona maps so we can mutate safely
  next.usersByPersona = { ...state.usersByPersona };
  next.lockedUnitsByPersona = { ...state.lockedUnitsByPersona };

  const totalUsersNow = () =>
    PERSONA_KEYS.reduce((s, k) => s + next.usersByPersona[k], 0);

  // ==== 1. ACQUISITION (distributed across personas by mix) ====
  const paidUsers = inputs.cacPerUser > 0
    ? Math.floor(inputs.marketingBudgetWeek / inputs.cacPerUser)
    : 0;
  const organicMult = (inputs.organicMultiplier || 0) / 100;
  const referralUsers = Math.floor(totalUsersNow() * 0.001);
  const organicUsers = Math.floor(paidUsers * organicMult) + referralUsers;
  const newUsers = paidUsers + organicUsers;

  // Distribute across personas based on configured mix
  const mix = inputs.personaMix || { curious: 80, saver: 15, whale: 4, megawhale: 1 };
  const mixTotal = PERSONA_KEYS.reduce((s, k) => s + (mix[k] || 0), 0);
  let assigned = 0;
  for (let i = 0; i < PERSONA_KEYS.length; i++) {
    const k = PERSONA_KEYS[i];
    const n = i === PERSONA_KEYS.length - 1
      ? newUsers - assigned
      : Math.round(newUsers * ((mix[k] || 0) / mixTotal));
    next.usersByPersona[k] += n;
    assigned += n;
  }
  next.totalUsersEver += newUsers;

  // ==== 2. CHURN (per-persona, lock-in protected) ==========
  // Each persona has its own intrinsic weekly churn rate. The global
  // `churnMultiplier` scales all three together for stress-testing.
  // Users with active locked units (Flow or Vein) can't churn.
  const churnMult = inputs.churnMultiplier || 1.0;
  for (const pKey of PERSONA_KEYS) {
    const p = PERSONAS[pKey];
    const count = next.usersByPersona[pKey];
    if (count === 0) continue;
    const locked = Math.min(count, Math.floor(next.lockedUnitsByPersona[pKey]));
    const eligible = Math.max(0, count - locked);
    const personaChurnRate = p.baseWeeklyChurn * churnMult;
    const churnLoss = Math.floor(eligible * personaChurnRate);
    next.usersByPersona[pKey] = Math.max(0, count - churnLoss);
  }

  // ==== 3. PURCHASES (per-persona) ==========================
  // Each persona has its own frequency and ticket size. A global
  // frequencyMultiplier and audienceVolume scale all personas together.
  const freqMult = inputs.frequencyMultiplier || 1.0;
  const volumeMult = inputs.audienceVolume || 1.0;

  let totalUserCashThisWeek = 0;
  let totalToMinersThisWeek = 0;
  let totalPlatformRevThisWeek = 0;
  let totalReserveThisWeek = 0;
  let totalProcessingThisWeek = 0;
  let unitsAddedThisWeek = 0;
  let gramsCommittedThisWeek = 0;
  // Track new locked units by persona (for future churn protection)
  const newLockedByPersona = { curious: 0, saver: 0, whale: 0, megawhale: 0 };

  for (const pKey of PERSONA_KEYS) {
    const p = PERSONAS[pKey];
    const count = next.usersByPersona[pKey];
    if (count === 0) continue;

    // Expected purchases this week for this persona
    const purchasesPerWeek = (p.frequency * freqMult / 52) * count;
    let unitsPurchased = Math.floor(purchasesPerWeek);
    if (Math.random() < (purchasesPerWeek - unitsPurchased)) unitsPurchased += 1;
    if (unitsPurchased === 0) continue;

    // Allocate to tiers using persona's tier preference weights
    const tierAllocation = allocateTiers(unitsPurchased, p.tierWeights);
    const personaTicket = p.avgTicket * volumeMult;

    for (const tierKey of ['spark', 'flow', 'vein']) {
      const count = tierAllocation[tierKey];
      if (count <= 0) continue;
      const tier = TIER_SPECS[tierKey];
      const gross = count * personaTicket;
      const processing = gross * PROCESSING_FEE;
      const afterProcessing = gross - processing;
      const reserve = gross * (inputs.reserveContribution / 100);
      const platformCut = gross * (inputs.platformMargin / 100);
      const toMiner = afterProcessing - reserve - platformCut;
      const faceValue = gross * (1 + tier.discount);
      const gramsForThisBatch = faceValue / (inputs.goldPricePerGram || DEFAULT_GOLD_PRICE_PER_GRAM);

      totalUserCashThisWeek += gross;
      totalProcessingThisWeek += processing;
      totalToMinersThisWeek += toMiner;
      totalPlatformRevThisWeek += platformCut;
      totalReserveThisWeek += reserve;
      unitsAddedThisWeek += count;
      gramsCommittedThisWeek += gramsForThisBatch;

      // Flow and Vein provide lock-in; Spark doesn't (only 6 months, uncancellable)
      // Still count Sparks as lightly locked (half weight) since they can't be cancelled
      if (tierKey === 'flow' || tierKey === 'vein') {
        newLockedByPersona[pKey] += count;
      } else {
        newLockedByPersona[pKey] += count * 0.5;
      }
    }
  }

  // Apply new locks and decay existing ones toward maturation
  // Average lock tenor ≈ 75 weeks blended; weekly decay rate = 1/75
  const lockDecayRate = 1 / 75;
  for (const pKey of PERSONA_KEYS) {
    next.lockedUnitsByPersona[pKey] =
      next.lockedUnitsByPersona[pKey] * (1 - lockDecayRate) + newLockedByPersona[pKey];
  }

  next.activeUnits += unitsAddedThisWeek;
  next.totalUnitsSold += unitsAddedThisWeek;
  next.totalGoldGramsCommitted += gramsCommittedThisWeek;

  // ==== Reserve fund: contribution with cap, plus yield ====
  // Contributions first fill toward the cap; any overflow goes to platform revenue.
  const cap = inputs.maxReserveCap || 0;
  let reserveOverflowThisWeek = 0;
  if (cap > 0) {
    const spaceLeft = Math.max(0, cap - next.reserveBalance);
    if (totalReserveThisWeek <= spaceLeft) {
      next.reserveBalance += totalReserveThisWeek;
    } else {
      next.reserveBalance = cap;
      reserveOverflowThisWeek = totalReserveThisWeek - spaceLeft;
    }
  } else {
    // No cap: everything accumulates
    next.reserveBalance += totalReserveThisWeek;
  }
  next.totalReserveContributed += totalReserveThisWeek;
  next.totalReserveOverflow += reserveOverflowThisWeek;

  // Weekly yield on reserve balance (treasuries / money market)
  const weeklyYieldRate = (inputs.reserveYieldAnnual || 0) / 100 / 52;
  const reserveYieldThisWeek = next.reserveBalance * weeklyYieldRate;
  next.totalReserveYield += reserveYieldThisWeek;

  // Overflow and yield both flow into platform revenue this week
  totalPlatformRevThisWeek += reserveOverflowThisWeek + reserveYieldThisWeek;

  // ==== 4. GOLD DELIVERY ==================================
  // Each week, deliver a fraction of the outstanding committed grams based on
  // average tenor. Construction is included in the lock period, so actual
  // delivery window = lock minus construction. Blended across 6/12/24 month
  // tiers: (22+48+100)/3 ≈ 57 weeks. Round to 56.
  // Weekly delivery rate = outstanding committed / 56.
  const undeliveredGrams = Math.max(0, next.totalGoldGramsCommitted - next.totalGoldGramsDelivered);
  const weeklyDeliveryRate = 1 / 56;
  const gramsDeliveredThisWeek = undeliveredGrams * weeklyDeliveryRate;
  next.totalGoldGramsDelivered += gramsDeliveredThisWeek;

  // ==== 5. PLATFORM COSTS =================================
  const weeklyOverhead = inputs.monthlyOverhead / 4.33;
  const marketingSpend = inputs.marketingBudgetWeek;
  const weeklyCostsCore = weeklyOverhead + marketingSpend + totalProcessingThisWeek;

  // ==== 6. DEFAULTS (rare exceptional events) =============
  // Defaults are EXCEPTIONAL events — geopolitical shocks, fraud, natural
  // disasters, force majeure. The slider represents the annual probability
  // of ANY default event occurring across the partner pool.
  //
  // When a default fires:
  //   - Nominal exposure = one partner's outstanding tranche
  //     ≈ 5% of inflight, capped at $1.5M (a realistic single-partner facility)
  //   - Recovery rate 60% (legal action, asset liquidation, insurance, etc.)
  //   - Net loss = nominal × 40%
  //   - Reserve absorbs first, P&L only hit if reserve insufficient
  //
  // Weekly probability = annual probability / 52
  const weeklyDefaultProb = inputs.defaultRatePerYear / 100 / 52;
  let defaultNominal = 0;
  let defaultNetLoss = 0;
  let reserveAbsorbed = 0;
  let platformAbsorbed = 0;
  const newEvents = [];

  if (next.workingCapitalInFlight > 1000 && Math.random() < weeklyDefaultProb) {
    // Cap exposure at $1.5M — represents one realistic partner tranche.
    // At small scale this is essentially uncapped; at large scale it reflects
    // the fact that no single partner holds an arbitrarily large position.
    const MAX_EXPOSURE_PER_EVENT = 1_500_000;
    defaultNominal = Math.min(next.workingCapitalInFlight * 0.05, MAX_EXPOSURE_PER_EVENT);
    const recoveryRate = 0.6;
    defaultNetLoss = defaultNominal * (1 - recoveryRate);
    next.defaultCount += 1;

    // Reserve absorbs first
    if (next.reserveBalance >= defaultNetLoss) {
      reserveAbsorbed = defaultNetLoss;
      next.reserveBalance -= defaultNetLoss;
    } else {
      reserveAbsorbed = next.reserveBalance;
      platformAbsorbed = defaultNetLoss - next.reserveBalance;
      next.reserveBalance = 0;
    }

    // Event label: show the full chain of what happened
    const parts = [
      `$${Math.round(defaultNominal).toLocaleString()} exposure`,
      `$${Math.round(defaultNetLoss).toLocaleString()} net loss after recovery`,
    ];
    if (reserveAbsorbed > 0) {
      parts.push(`$${Math.round(reserveAbsorbed).toLocaleString()} absorbed by reserve`);
    }
    if (platformAbsorbed > 0) {
      parts.push(`$${Math.round(platformAbsorbed).toLocaleString()} hit P&L`);
    } else {
      parts.push(`fully covered`);
    }

    newEvents.push({
      week: next.week,
      type: 'default',
      label: `Partner default · ${parts.join(' · ')}`,
    });
  }

  const totalCostsThisWeek = weeklyCostsCore + platformAbsorbed;

  // ==== 7. EARLY EXITS ====================================
  const weeklyExits = Math.floor(next.activeUnits * (inputs.earlyExitRate / 100) / 52);
  next.activeUnits = Math.max(0, next.activeUnits - weeklyExits);

  // ==== 8. WORKING CAPITAL IN FLIGHT ======================
  // The real exposure: undelivered gold value at spot, which equals the cash
  // we've passed to miners but haven't yet received gold for.
  const undeliveredGramsNow = Math.max(0, next.totalGoldGramsCommitted - next.totalGoldGramsDelivered);
  next.workingCapitalInFlight = undeliveredGramsNow * (inputs.goldPricePerGram || DEFAULT_GOLD_PRICE_PER_GRAM);

  // ==== 9. ROLL UP TOTALS =================================
  next.totalCashInflow += totalUserCashThisWeek;
  next.totalToMiners += totalToMinersThisWeek;
  next.totalPlatformRevenue += totalPlatformRevThisWeek;
  next.totalPlatformCosts += totalCostsThisWeek;
  next.totalMarketingSpend += marketingSpend;
  next.totalOverhead += weeklyOverhead;
  next.totalProcessingFees += totalProcessingThisWeek;
  next.totalDefaultLosses += platformAbsorbed;
  next.cumulativeProfit = next.totalPlatformRevenue - next.totalPlatformCosts;

  // ==== 10. FLOWS =========================================
  const alpha = 0.25;
  next.currentFlows = {
    userToPlatform: state.currentFlows.userToPlatform * (1 - alpha) + totalUserCashThisWeek * alpha,
    platformToMiner: state.currentFlows.platformToMiner * (1 - alpha) + totalToMinersThisWeek * alpha,
    minerToPlatform: state.currentFlows.minerToPlatform * (1 - alpha) + totalToMinersThisWeek * 1.1 * alpha,
    platformToUser: state.currentFlows.platformToUser * (1 - alpha) + totalUserCashThisWeek * 1.09 * alpha,
  };

  // ==== 11. EVENTS ========================================
  if (newEvents.length > 0) {
    next.lastEvents = [...newEvents, ...state.lastEvents].slice(0, 5);
  }

  // ==== 12. HISTORY =======================================
  const totalUsers = PERSONA_KEYS.reduce((s, k) => s + next.usersByPersona[k], 0);
  const snapshot = {
    week: next.week,
    revenue: totalPlatformRevThisWeek,
    costs: totalCostsThisWeek,
    profit: totalPlatformRevThisWeek - totalCostsThisWeek,
    users: totalUsers,
    usersByPersona: { ...next.usersByPersona },
    newUsers,
    totalUsersEver: next.totalUsersEver,
    activeUnits: next.activeUnits,
    inflight: next.workingCapitalInFlight,
    cumulativeProfit: next.cumulativeProfit,
    unitsSold: unitsAddedThisWeek,
    toMiners: totalToMinersThisWeek,
    userCash: totalUserCashThisWeek,
    reserveBalance: next.reserveBalance,
    marketingSpend,
    overhead: weeklyOverhead,
    processing: totalProcessingThisWeek,
    defaultLoss: platformAbsorbed,
    goldGramsDelivered: next.totalGoldGramsDelivered,
    goldGramsCommitted: next.totalGoldGramsCommitted,
  };
  next.history = [...state.history, snapshot];
  if (next.history.length > 520) {
    next.history = next.history.slice(-520);
  }

  return next;
}

// ============================================================
// FORMATTING
// ============================================================
const fmtUSD = (v, short = false) => {
  if (v == null || isNaN(v)) return '—';
  const abs = Math.abs(v);
  if (short) {
    if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}k`;
    return `${v < 0 ? '-' : ''}$${Math.round(abs)}`;
  }
  return `${v < 0 ? '-' : ''}$${Math.round(abs).toLocaleString()}`;
};

const fmtNum = (v) => v == null ? '—' : Math.round(v).toLocaleString();
const fmtPct = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`;

// Format gold amount in grams/kilos OR troy ounces
const fmtGold = (grams, unit = 'g') => {
  if (grams == null || isNaN(grams)) return '—';
  if (unit === 'oz') {
    const oz = grams / GRAMS_PER_TROY_OZ;
    if (oz >= 1000) return `${(oz / 1000).toFixed(2)}k oz`;
    if (oz >= 1) return `${oz.toFixed(2)} oz`;
    return `${oz.toFixed(3)} oz`;
  }
  // grams
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)}kg`;
  return `${grams.toFixed(0)}g`;
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [inputs, setInputs] = useState({ ...SCENARIOS.base });
  const [state, setState] = useState(createInitialState());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(4);
  const [tab, setTab] = useState('platform');
  const [viewMode, setViewMode] = useState('charts');

  // Computed: total active users across all personas
  const totalUsers = PERSONA_KEYS.reduce((s, k) => s + state.usersByPersona[k], 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [personaInfoOpen, setPersonaInfoOpen] = useState(false);
  const [bootInfoOpen, setBootInfoOpen] = useState(false);
  const [revenueMultiple, setRevenueMultiple] = useState(15);
  const [goldUnit, setGoldUnit] = useState('g'); // 'g' | 'oz'
  const [priceSource, setPriceSource] = useState('default'); // 'default' | 'live' | 'failed'
  const [showHelp, setShowHelp] = useState(false);
  const tickRef = useRef(null);

  // Try to fetch live gold price via CoinGecko PAXG on mount
  useEffect(() => {
    let cancelled = false;
    const fetchGoldPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const paxgUsd = data?.['pax-gold']?.usd;
        if (paxgUsd && !cancelled) {
          // PAXG is priced per troy ounce → convert to per gram
          const perGram = paxgUsd / GRAMS_PER_TROY_OZ;
          setInputs(prev => ({ ...prev, goldPricePerGram: parseFloat(perGram.toFixed(2)) }));
          setPriceSource('live');
        }
      } catch (err) {
        if (!cancelled) setPriceSource('failed');
      }
    };
    fetchGoldPrice();
    return () => { cancelled = true; };
  }, []);

  // Run the simulation loop
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setState(prev => stepSimulation(prev, inputs));
    }, 1000 / speed);
    tickRef.current = interval;
    return () => clearInterval(interval);
  }, [running, speed, inputs]);

  const applyScenario = (name) => {
    // Preserve current gold price when switching scenarios
    setInputs(prev => ({ ...SCENARIOS[name], goldPricePerGram: prev.goldPricePerGram }));
    resetSim();
  };

  const resetSim = () => {
    setRunning(false);
    setState(createInitialState());
  };

  const updateInput = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // Snapshot: download current simulation state as JSON
  const exportSnapshot = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      week: state.week,
      inputs,
      summary: {
        users: totalUsers,
        usersByPersona: state.usersByPersona,
        totalUsersEver: state.totalUsersEver,
        activeUnits: state.activeUnits,
        totalUnitsSold: state.totalUnitsSold,
        totalCashInflow: state.totalCashInflow,
        totalPlatformRevenue: state.totalPlatformRevenue,
        totalPlatformCosts: state.totalPlatformCosts,
        cumulativeProfit: state.cumulativeProfit,
        reserveBalance: state.reserveBalance,
        totalReserveYield: state.totalReserveYield,
        totalReserveOverflow: state.totalReserveOverflow,
        totalDefaultLosses: state.totalDefaultLosses,
        workingCapitalInFlight: state.workingCapitalInFlight,
        totalGoldGramsDelivered: state.totalGoldGramsDelivered,
        totalGoldGramsCommitted: state.totalGoldGramsCommitted,
        defaultCount: state.defaultCount,
      },
      history: state.history,
      lastEvents: state.lastEvents,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musa-sim-w${state.week}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Derived live metrics
  const derived = useMemo(() => {
    const recent = state.history.slice(-12); // last 12 weeks
    const weeklyRevenue = recent.length > 0 ? recent.reduce((s, h) => s + h.revenue, 0) / recent.length : 0;
    const weeklyCosts = recent.length > 0 ? recent.reduce((s, h) => s + h.costs, 0) / recent.length : 0;
    const monthlyRevenue = weeklyRevenue * 4.33;
    const monthlyCosts = weeklyCosts * 4.33;
    const monthlyProfit = monthlyRevenue - monthlyCosts;

    // LTV: total revenue / total users ever
    const ltv = state.totalUsersEver > 0
      ? state.totalPlatformRevenue / state.totalUsersEver
      : 0;

    // Gold delivered
    const goldKg = state.totalGoldGramsDelivered / 1000;
    const goldOz = state.totalGoldGramsDelivered / GRAMS_PER_TROY_OZ;
    const goldValue = state.totalGoldGramsDelivered * (inputs.goldPricePerGram || DEFAULT_GOLD_PRICE_PER_GRAM);

    // Breakeven detection
    let breakevenWeek = null;
    for (let i = 0; i < state.history.length; i++) {
      if (state.history[i].cumulativeProfit >= 0) {
        breakevenWeek = state.history[i].week;
        break;
      }
    }

    // Boot capital: the deepest point the cumulative P&L reaches.
    // This is the minimum cash needed to fund the business from zero until
    // it starts climbing back out of the hole. "Settles" when the trough
    // has passed (current profit > historical minimum).
    let troughProfit = 0;
    let troughWeek = 0;
    let troughIdx = -1;
    for (let i = 0; i < state.history.length; i++) {
      if (state.history[i].cumulativeProfit < troughProfit) {
        troughProfit = state.history[i].cumulativeProfit;
        troughWeek = state.history[i].week;
        troughIdx = i;
      }
    }
    const bootCapital = Math.max(0, -troughProfit);
    const bootCapitalWithBuffer = bootCapital * 1.4;
    const bootSettled = state.cumulativeProfit > troughProfit && bootCapital > 0;

    // Boot gold: gold committed and delivered at trough and breakeven
    const troughSnap = troughIdx >= 0 ? state.history[troughIdx] : null;
    const breakevenSnap = breakevenWeek
      ? state.history.find(h => h.week === breakevenWeek) || null
      : null;
    const bootGoldCommittedAtTrough = troughSnap ? troughSnap.goldGramsCommitted : 0;
    const bootGoldDeliveredAtTrough = troughSnap ? troughSnap.goldGramsDelivered : 0;
    const bootGoldCommittedAtBreakeven = breakevenSnap ? breakevenSnap.goldGramsCommitted : 0;
    const bootGoldDeliveredAtBreakeven = breakevenSnap ? breakevenSnap.goldGramsDelivered : 0;
    // Concurrent agreements = committed oz / (yearly capacity × years elapsed)
    const troughYears = troughWeek > 0 ? troughWeek / 52 : 1;
    const breakevenYears = breakevenWeek > 0 ? breakevenWeek / 52 : 1;
    const bootAgreementsAtTrough = bootGoldCommittedAtTrough > 0
      ? (bootGoldCommittedAtTrough / GRAMS_PER_TROY_OZ) / (AGREEMENT_YEARLY_OZ * troughYears) : 0;
    const bootAgreementsAtBreakeven = bootGoldCommittedAtBreakeven > 0
      ? (bootGoldCommittedAtBreakeven / GRAMS_PER_TROY_OZ) / (AGREEMENT_YEARLY_OZ * breakevenYears) : 0;

    const annualRevenue = monthlyRevenue * 12;
    const marketCap = annualRevenue * revenueMultiple;

    // Supply pipeline: how many forward purchase agreements needed
    const AGREEMENT_WEEKLY_G = (AGREEMENT_YEARLY_OZ * GRAMS_PER_TROY_OZ) / 52;
    // Actual delivery rate from recent sim history (not the decay formula)
    const currentWeeklyDelivery = recent.length > 1
      ? (recent[recent.length - 1].goldGramsDelivered - recent[0].goldGramsDelivered) / (recent.length - 1)
      : 0;
    const minersNeeded = currentWeeklyDelivery > 0 ? currentWeeklyDelivery / AGREEMENT_WEEKLY_G : 0;
    const annualDeliveryOz = (currentWeeklyDelivery * 52) / GRAMS_PER_TROY_OZ;

    return {
      monthlyRevenue, monthlyCosts, monthlyProfit, breakevenWeek,
      ltv, goldKg, goldOz, goldValue,
      bootCapital, bootCapitalWithBuffer, bootSettled, troughWeek,
      bootGoldCommittedAtTrough, bootGoldDeliveredAtTrough, bootAgreementsAtTrough,
      bootGoldCommittedAtBreakeven, bootGoldDeliveredAtBreakeven, bootAgreementsAtBreakeven,
      annualRevenue, marketCap,
      minersNeeded, currentWeeklyDelivery, annualDeliveryOz,
    };
  }, [state.history, state.totalUsersEver, state.totalPlatformRevenue, state.totalGoldGramsDelivered, state.totalGoldGramsCommitted, state.cumulativeProfit, inputs.goldPricePerGram, revenueMultiple]);

  return (
    <div className="w-full p-4 md:p-6" style={{ background: '#0a0908', color: '#FAFAF7', minHeight: '100dvh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap');

        :root {
          --gold: #C9A961;
          --gold-dim: #8B7340;
          --gold-bright: #E4C57E;
          --red: #e87560;
          --green: #7db38a;
          --bg: #0a0908;
          --surface: #161513;
          --surface-2: #1f1d1a;
          --border: rgba(255,255,255,0.08);
          --border-strong: rgba(255,255,255,0.14);
          --text: #FAFAF7;
          --text-dim: #8c8a82;
        }

        * { font-family: 'Geist', system-ui, sans-serif; box-sizing: border-box; }
        .font-display { font-family: 'Fraunces', Georgia, serif; }
        .font-num { font-family: 'Geist Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }

        .text-gold { color: var(--gold); }
        .text-green { color: var(--green); }
        .text-red { color: var(--red); }
        .bg-gold { background-color: var(--gold); }
        .border-gold { border-color: var(--gold); }
        .bg-surface { background-color: var(--surface); }
        .bg-surface-2 { background-color: var(--surface-2); }
        .border-app { border-color: var(--border); }
        .text-app { color: var(--text); }
        .text-dim { color: var(--text-dim); }

        button { font-family: inherit; cursor: pointer; }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 2px;
          background: rgba(255,255,255,0.12);
          border-radius: 1px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: var(--gold);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(201,169,97,0.3), 0 2px 8px rgba(201,169,97,0.4);
          transition: transform 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--gold);
          border-radius: 50%;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(201,169,97,0.3), 0 2px 8px rgba(201,169,97,0.4);
        }

        .press:active { transform: scale(0.98); }
        .press-soft:active { transform: scale(0.99); }
        .press, .press-soft { transition: transform 0.15s ease-out, border-color 0.2s, background-color 0.2s; }

        .scrollable::-webkit-scrollbar { display: none; }
        .scrollable { -ms-overflow-style: none; scrollbar-width: none; }

        /* Flow animation */
        @keyframes flowMove {
          0%   { transform: translateX(0); }
          100% { transform: translateX(40px); }
        }
        .flow-particles {
          background-image: radial-gradient(circle, var(--gold) 1.5px, transparent 2px);
          background-size: 20px 100%;
          background-repeat: repeat-x;
          animation: flowMove 1.2s linear infinite;
        }
        .flow-particles-slow { animation-duration: 2s; }
        .flow-particles-reverse { animation-direction: reverse; }

        .musa-logo {
          position: relative;
          display: inline-block;
          color: rgba(232, 218, 188, 0.7);
          animation: musaLogoBreath 4.2s ease-in-out infinite;
        }
        .musa-logo-text {
          position: relative;
          z-index: 1;
        }
        .musa-logo-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 2;
          pointer-events: none;
          color: rgba(255, 240, 200, 1);
          background: linear-gradient(
            100deg,
            transparent 30%,
            rgba(255, 240, 200, 1) 48%,
            rgba(255, 240, 200, 1) 52%,
            transparent 70%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: musaLogoShimmer 5.5s ease-in-out infinite;
        }
        @keyframes musaLogoBreath {
          0%, 100% { text-shadow: 0 0 6px rgba(201,169,97,0.18), 0 0 14px rgba(201,169,97,0.08); }
          50%      { text-shadow: 0 0 10px rgba(201,169,97,0.35), 0 0 22px rgba(201,169,97,0.18); }
        }
        @keyframes musaLogoShimmer {
          0%   { background-position: 150% 0; }
          15%  { background-position: -50% 0; }
          100% { background-position: -50% 0; }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-baseline gap-4">
            <button
              onClick={() => { window.location.hash = '#/'; }}
              className="press"
              style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
            >
              <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
                <span className="musa-logo-text">musa</span>
                <span className="musa-logo-shimmer">musa</span>
              </div>
            </button>
            <div className="font-display italic text-gold text-xl" style={{ fontWeight: 400 }}>simulator</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Gold price badge */}
            <div
              className="h-8 px-3 rounded-full border border-app flex items-center gap-2 text-[10px] font-num"
              style={{ background: 'rgba(201,169,97,0.04)' }}
              title={priceSource === 'live' ? 'Live from CoinGecko PAXG' : priceSource === 'failed' ? 'Live fetch failed, using default' : 'Default price'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priceSource === 'live' ? 'bg-green' : 'bg-dim'}`}
                    style={{ background: priceSource === 'live' ? 'var(--green)' : 'var(--text-dim)' }} />
              <span className="text-dim">gold</span>
              <span className="text-gold">
                {(() => {
                  const perGram = inputs.goldPricePerGram || DEFAULT_GOLD_PRICE_PER_GRAM;
                  if (goldUnit === 'oz') {
                    const perOz = perGram * GRAMS_PER_TROY_OZ;
                    return `$${perOz.toFixed(0)}/oz`;
                  }
                  return `$${perGram.toFixed(2)}/g`;
                })()}
              </span>
            </div>
            {/* g/oz toggle */}
            <div className="h-8 rounded-full border border-app flex items-center overflow-hidden">
              <button
                onClick={() => setGoldUnit('g')}
                className={`h-full px-3 text-[10px] font-num ${goldUnit === 'g' ? 'bg-gold text-black' : 'text-dim'}`}
              >
                g
              </button>
              <button
                onClick={() => setGoldUnit('oz')}
                className={`h-full px-3 text-[10px] font-num ${goldUnit === 'oz' ? 'bg-gold text-black' : 'text-dim'}`}
              >
                oz
              </button>
            </div>
            {/* Snapshot export */}
            <button
              onClick={exportSnapshot}
              className="press h-8 px-3 rounded-full border border-app text-[10px] text-dim"
              title="Download current state as JSON"
            >
              Snapshot
            </button>
            {/* Help */}
            <button
              onClick={() => setShowHelp(true)}
              className="press w-8 h-8 rounded-full border border-app text-dim flex items-center justify-center"
              title="How this simulator works"
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>

        {/* ================= TIME STRIP ================= */}
        <div className="bg-surface border border-app rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setRunning(r => !r)}
            className="press w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center flex-shrink-0"
          >
            {running ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <div className="flex items-center gap-1">
            {[1, 4, 16, 64].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`press-soft h-8 px-3 rounded-full text-[10px] font-num border ${
                  speed === s ? 'bg-gold text-black border-gold' : 'border-app text-dim'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-app mx-1" style={{ background: 'var(--border)' }} />
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim">Week</div>
          <div className="font-num text-lg text-app tabular-nums" style={{ minWidth: '48px' }}>
            {state.week}
          </div>
          <div className="text-[10px] text-dim font-num">
            ({(state.week / 4.33).toFixed(1)} months · {(state.week / 52).toFixed(1)} years)
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setViewMode(v => v === 'charts' ? 'flows' : 'charts')}
            className="press-soft h-8 px-3 rounded-full text-[10px] border border-app text-dim flex items-center gap-2"
          >
            {viewMode === 'charts' ? <GitBranch size={12} /> : <Activity size={12} />}
            {viewMode === 'charts' ? 'Flows view' : 'Charts view'}
          </button>
          <button
            onClick={() => resetSim()}
            className="press w-8 h-8 rounded-full border border-app flex items-center justify-center"
          >
            <RotateCcw size={12} className="text-dim" />
          </button>
        </div>

        {/* ================= TICKER ================= */}
        <div className="bg-surface border border-app rounded-2xl px-5 py-4 mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <TickerCell
            label="Monthly profit"
            value={fmtUSD(derived.monthlyProfit, true)}
            tone={derived.monthlyProfit >= 0 ? 'green' : 'red'}
          />
          <TickerCell
            label="Monthly revenue"
            value={fmtUSD(derived.monthlyRevenue, true)}
            tone="gold"
          />
          <TickerCell
            label="Active users"
            value={fmtNum(totalUsers)}
          />
          <TickerCell
            label="Gold delivered"
            value={fmtGold(state.totalGoldGramsDelivered, goldUnit)}
            tone="gold"
          />
          <TickerCell
            label="Reserve fund"
            value={fmtUSD(state.reserveBalance, true)}
            tone="gold"
          />
          <div
            className="min-w-0 relative cursor-pointer"
            onClick={() => setBootInfoOpen(v => !v)}
          >
            <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1.5 truncate flex items-center gap-1">
              <span>Boot capital</span>
              <Info size={7} className="text-dim opacity-60" />
            </div>
            <div
              className="font-num tabular-nums truncate"
              style={{
                color: derived.bootSettled ? 'var(--gold)' : 'var(--red)',
                fontSize: 'clamp(14px, 3.5vw, 20px)',
                lineHeight: '1.2',
              }}
            >
              {derived.bootCapital > 0 ? fmtUSD(derived.bootCapital, true) : '—'}
            </div>
          </div>
          <TickerCell
            label="Breakeven"
            value={derived.breakevenWeek ? `Week ${derived.breakevenWeek}` : '—'}
            tone={derived.breakevenWeek ? 'green' : 'default'}
          />
          <TickerCell
            label="Supply agreements"
            value={derived.minersNeeded < 0.1 ? derived.minersNeeded.toFixed(2) : derived.minersNeeded.toFixed(1)}
            tone="gold"
            sub={`${fmtGold(derived.currentWeeklyDelivery * 52, goldUnit)}/yr delivery`}
          />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1.5 truncate">Market cap</div>
            <div className="font-num tabular-nums truncate" style={{ color: 'var(--gold)', fontSize: 'clamp(14px, 3.5vw, 20px)', lineHeight: '1.2' }}>
              {derived.marketCap > 0 ? fmtUSD(derived.marketCap, true) : '—'}
            </div>
            <div className="mt-2">
              <input
                type="range"
                min={3} max={50} step={1} value={revenueMultiple}
                onChange={e => setRevenueMultiple(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div className="text-[9px] text-dim font-num mt-1">{revenueMultiple}× annual rev</div>
            </div>
          </div>
        </div>

        {/* Boot capital info popover */}
        {bootInfoOpen && (
          <div className="bg-surface border border-app rounded-2xl p-5 mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim">Launch requirements</div>
              <button
                onClick={() => setBootInfoOpen(false)}
                className="text-[10px] text-dim hover:text-app"
              >
                close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1">Peak burn</div>
                <div className="font-display font-num text-2xl tabular-nums" style={{
                  fontWeight: 300,
                  color: derived.bootSettled ? 'var(--gold)' : 'var(--red)',
                }}>
                  {derived.bootCapital > 0 ? fmtUSD(derived.bootCapital, true) : '—'}
                </div>
                <div className="text-[10px] text-dim font-num mt-1">
                  {derived.bootSettled
                    ? `settled at week ${derived.troughWeek}`
                    : derived.troughWeek > 0
                      ? `current trough at week ${derived.troughWeek} (still deepening)`
                      : 'run the simulation to see the depth'}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1">Recommended raise</div>
                <div className="font-display font-num text-2xl tabular-nums text-app" style={{ fontWeight: 300 }}>
                  {derived.bootCapital > 0 ? fmtUSD(derived.bootCapitalWithBuffer, true) : '—'}
                </div>
                <div className="text-[10px] text-dim font-num mt-1">
                  peak burn × 1.4 safety buffer
                </div>
              </div>
            </div>
            {/* Boot gold supply */}
            <div className="mt-4 pt-4 border-t border-app">
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Gold supply requirements</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* At peak burn (trough) */}
                <div className="bg-surface-2 rounded-xl p-4 border border-app">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">At peak burn (week {derived.troughWeek || '—'})</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Gold committed</span>
                      <span className="font-num text-gold text-sm">{fmtGold(derived.bootGoldCommittedAtTrough, goldUnit)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Gold delivered</span>
                      <span className="font-num text-app text-sm">{fmtGold(derived.bootGoldDeliveredAtTrough, goldUnit)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">In pipeline</span>
                      <span className="font-num text-app text-sm">{fmtGold(derived.bootGoldCommittedAtTrough - derived.bootGoldDeliveredAtTrough, goldUnit)}</span>
                    </div>
                    <div className="border-t border-app my-1" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Concurrent agreements</span>
                      <span className="font-num text-gold text-sm">{derived.bootAgreementsAtTrough > 0 ? derived.bootAgreementsAtTrough.toFixed(1) : '—'}</span>
                    </div>
                    <div className="text-[9px] text-dim font-num mt-0.5 text-right">
                      {derived.bootAgreementsAtTrough > 0 ? `@ ${fmtGold(AGREEMENT_YEARLY_OZ * GRAMS_PER_TROY_OZ, goldUnit)}/yr each` : ''}
                    </div>
                  </div>
                </div>
                {/* At breakeven */}
                <div className="bg-surface-2 rounded-xl p-4 border border-app">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">At breakeven (week {derived.breakevenWeek || '—'})</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Gold committed</span>
                      <span className="font-num text-gold text-sm">{derived.breakevenWeek ? fmtGold(derived.bootGoldCommittedAtBreakeven, goldUnit) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Gold delivered</span>
                      <span className="font-num text-app text-sm">{derived.breakevenWeek ? fmtGold(derived.bootGoldDeliveredAtBreakeven, goldUnit) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">In pipeline</span>
                      <span className="font-num text-app text-sm">{derived.breakevenWeek ? fmtGold(derived.bootGoldCommittedAtBreakeven - derived.bootGoldDeliveredAtBreakeven, goldUnit) : '—'}</span>
                    </div>
                    <div className="border-t border-app my-1" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-dim">Concurrent agreements</span>
                      <span className="font-num text-gold text-sm">{derived.bootAgreementsAtBreakeven > 0 ? derived.bootAgreementsAtBreakeven.toFixed(1) : '—'}</span>
                    </div>
                    <div className="text-[9px] text-dim font-num mt-0.5 text-right">
                      {derived.bootAgreementsAtBreakeven > 0 ? `@ ${fmtGold(AGREEMENT_YEARLY_OZ * GRAMS_PER_TROY_OZ, goldUnit)}/yr each` : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-dim mt-3 leading-snug">
                <span className="text-app">Gold committed</span> = total gold promised to users through all positions created by that point.
                <span className="text-app"> Concurrent agreements</span> = how many {AGREEMENT_YEARLY_OZ.toLocaleString()} oz/yr mining partner contracts running simultaneously from day one to produce the committed gold by that week.
                <span className="text-app"> In pipeline</span> = committed minus delivered — gold still owed, still vesting.
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-app text-[10px] text-dim leading-relaxed">
              <div className="mb-1">
                <span className="text-app">How this works:</span> cumulative P&L tracks how much cash the business has consumed since week 0. Early weeks are deeply negative — overhead and marketing spend with nothing yet earned. As users arrive and purchases compound, weekly revenue starts outpacing weekly costs, and the cumulative curve reaches its deepest point (the trough). After that, it climbs back toward zero (breakeven).
              </div>
              <div className="mb-1">
                <span className="text-app">Peak burn</span> = the dollar depth of that trough. It's the minimum you need to pre-fund to avoid insolvency. The number settles the moment the trough is behind us — after that, it never deepens again (absent default events).
              </div>
              <div>
                <span className="text-app">Recommended raise</span> = peak burn × 1.4. The 40% buffer covers slower-than-expected growth, unexpected costs, and a few months of runway past breakeven so you're not raising again on day one of profitability.
              </div>
              <div className="mt-3 text-[9px] opacity-60">
                Path-dependent: changing sliders mid-run doesn't retroactively recompute history. Reset and run fresh for a clean raise number against a given set of assumptions.
              </div>
            </div>
          </div>
        )}

        {/* ================= HERO VIEW ================= */}
        <div className="bg-surface border border-app rounded-2xl mb-4 relative" style={{ minHeight: '340px' }}>
          {viewMode === 'charts' ? (
            <ChartsView tab={tab} setTab={setTab} state={state} derived={derived} inputs={inputs} goldUnit={goldUnit} totalUsers={totalUsers} />
          ) : (
            <FlowsView state={state} inputs={inputs} derived={derived} totalUsers={totalUsers} />
          )}
        </div>

        {/* ================= AUDIENCE MIX ================= */}
        <div className="bg-surface border border-app rounded-2xl p-5 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim">Audience mix</div>
              <button
                onClick={() => setPersonaInfoOpen(v => !v)}
                className="press-soft w-4 h-4 rounded-full border border-app flex items-center justify-center text-dim"
                style={{ background: 'rgba(255,255,255,0.03)' }}
                title="Show persona configurations"
              >
                <Info size={8} />
              </button>
            </div>
            <div className="text-[9px] text-dim font-num">
              who we acquire · drag to rebalance
            </div>
          </div>

          {/* Expandable config detail */}
          {personaInfoOpen && (
            <div className="mb-4 bg-surface-2 border border-app rounded-xl p-4">
              <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-3">Persona configurations</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PERSONA_KEYS.map(pKey => {
                  const p = PERSONAS[pKey];
                  const yearlyRev = (p.frequency * (inputs.frequencyMultiplier || 1)) * (p.avgTicket * (inputs.audienceVolume || 1));
                  return (
                    <div key={pKey} className="text-[10px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <div className="font-display text-app text-sm" style={{ fontWeight: 400 }}>{p.name}</div>
                      </div>
                      <div className="space-y-1 font-num text-dim">
                        <div className="flex justify-between">
                          <span>Frequency</span>
                          <span className="text-app">{p.frequency}/yr</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg ticket</span>
                          <span className="text-app">${p.avgTicket.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Churn / wk</span>
                          <span className="text-app">{(p.baseWeeklyChurn * 100).toFixed(1)}%</span>
                        </div>
                        <div className="border-t border-app my-1.5" />
                        <div className="flex justify-between">
                          <span>Spark lean</span>
                          <span className="text-app">{p.tierWeights.spark}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Flow lean</span>
                          <span className="text-app">{p.tierWeights.flow}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vein lean</span>
                          <span className="text-app">{p.tierWeights.vein}%</span>
                        </div>
                        <div className="border-t border-app my-1.5" />
                        <div className="flex justify-between">
                          <span>Expected/yr</span>
                          <span className="text-gold">${Math.round(yearlyRev).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[9px] text-dim mt-3 leading-snug">
                Expected/yr = frequency × ticket, scaled by current volume ({(inputs.audienceVolume || 1).toFixed(1)}×) and frequency ({(inputs.frequencyMultiplier || 1).toFixed(1)}×) multipliers.
                Lean percentages are tier preferences — the allocator normalises them at purchase time.
              </div>
            </div>
          )}

          {/* Stacked bar visualization */}
          {(() => {
            const mix = inputs.personaMix || { curious: 80, saver: 15, whale: 4, megawhale: 1 };
            const total = PERSONA_KEYS.reduce((s, k) => s + (mix[k] || 0), 0) || 1;
            return (
              <div className="flex h-2 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {PERSONA_KEYS.map(k => (
                  <div key={k} style={{ width: `${((mix[k] || 0) / total) * 100}%`, background: PERSONAS[k].color, transition: 'width 0.2s' }} />
                ))}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PERSONA_KEYS.map(pKey => {
              const p = PERSONAS[pKey];
              const mix = inputs.personaMix || { curious: 80, saver: 15, whale: 4, megawhale: 1 };
              const total = PERSONA_KEYS.reduce((s, k) => s + (mix[k] || 0), 0) || 1;
              const pct = (((mix[pKey] || 0) / total) * 100).toFixed(0);
              const desc = {
                curious: `Trial buyers · $${p.avgTicket} avg · ${p.frequency}×/yr · high churn`,
                saver: `Monthly DCA · $${p.avgTicket} avg · ${p.frequency}×/yr · sticky`,
                whale: `HNW · $${(p.avgTicket / 1000).toFixed(1)}k avg · ${p.frequency}×/yr · very sticky`,
                megawhale: `Institutional · $${(p.avgTicket / 1000).toFixed(0)}k avg · ${p.frequency}×/yr · stickiest`,
              };
              return (
                <div key={pKey}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    <div className="text-[10px] uppercase tracking-[0.15em] text-dim">{p.name}</div>
                    <div className="text-[10px] text-dim font-num ml-auto">{pct}%</div>
                  </div>
                  <div className="text-[9px] text-dim mb-2 leading-snug">
                    {desc[pKey]}
                  </div>
                  <Slider
                    label=""
                    value={mix[pKey]}
                    min={0} max={100} step={1}
                    format={v => `${v}`}
                    onChange={v => updateInput('personaMix', { ...mix, [pKey]: v })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= CONTROLS ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-surface border border-app rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-1">Main controls</div>
            <div className="text-[9px] text-dim mb-4 font-num">
              {(() => {
                const paid = Math.floor(inputs.marketingBudgetWeek / Math.max(1, inputs.cacPerUser));
                const organic = Math.floor(paid * (inputs.organicMultiplier / 100));
                const base = Math.floor(totalUsers * 0.001);
                return (
                  <>New users/wk: <span className="text-gold">{paid + organic + base}</span>
                  {' '}(paid {paid} + organic {organic}{base > 0 ? ` + referral ${base}` : ''})</>
                );
              })()}
            </div>
            <div className="space-y-4">
              <Slider
                label="Marketing budget / week"
                value={inputs.marketingBudgetWeek}
                min={0} max={20000} step={250}
                format={v => fmtUSD(v, true)}
                onChange={v => updateInput('marketingBudgetWeek', v)}
              />
              <Slider
                label="CAC per paid user"
                value={inputs.cacPerUser}
                min={1} max={150} step={1}
                format={v => `$${v}`}
                onChange={v => updateInput('cacPerUser', v)}
              />
              <Slider
                label="Organic multiplier"
                value={inputs.organicMultiplier}
                min={0} max={100} step={5}
                format={v => `${v}%`}
                onChange={v => updateInput('organicMultiplier', v)}
              />
              <Slider
                label="Audience volume"
                value={inputs.audienceVolume}
                min={0.5} max={3} step={0.1}
                format={v => `${v.toFixed(1)}×`}
                onChange={v => updateInput('audienceVolume', parseFloat(v))}
              />
              <Slider
                label="Purchase frequency"
                value={inputs.frequencyMultiplier}
                min={0.5} max={2} step={0.1}
                format={v => `${v.toFixed(1)}×`}
                onChange={v => updateInput('frequencyMultiplier', parseFloat(v))}
              />
              <Slider
                label="Platform margin"
                value={inputs.platformMargin}
                min={0.5} max={10} step={0.1}
                format={v => `${v.toFixed(1)}%`}
                onChange={v => updateInput('platformMargin', parseFloat(v))}
              />
              <Slider
                label="Reserve cap"
                value={inputs.maxReserveCap}
                min={0} max={2_000_000} step={25_000}
                format={v => v === 0 ? 'uncapped' : fmtUSD(v, true)}
                onChange={v => updateInput('maxReserveCap', v)}
              />
              <Slider
                label="Reserve yield"
                value={inputs.reserveYieldAnnual}
                min={0} max={8} step={0.25}
                format={v => `${v.toFixed(2)}% APY`}
                onChange={v => updateInput('reserveYieldAnnual', parseFloat(v))}
              />
            </div>
          </div>

          <div className="bg-surface border border-app rounded-2xl p-5">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim">Advanced</div>
              {advancedOpen ? <ChevronUp size={14} className="text-dim" /> : <ChevronDown size={14} className="text-dim" />}
            </button>
            {advancedOpen ? (
              <div className="space-y-4">
                <div>
                  <Slider
                    label="Churn multiplier"
                    value={inputs.churnMultiplier}
                    min={0.1} max={3} step={0.1}
                    format={v => `${v.toFixed(1)}×`}
                    onChange={v => updateInput('churnMultiplier', parseFloat(v))}
                  />
                  <div className="text-[9px] text-dim font-num mt-1.5 flex items-center gap-2 flex-wrap">
                    {PERSONA_KEYS.map(pKey => {
                      const p = PERSONAS[pKey];
                      const effective = p.baseWeeklyChurn * (inputs.churnMultiplier || 1);
                      return (
                        <span key={pKey} className="flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full" style={{ background: p.color }} />
                          <span>{p.name} {(effective * 100).toFixed(1)}%/wk</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Slider
                  label="Early exit rate / year"
                  value={inputs.earlyExitRate}
                  min={0} max={40} step={1}
                  format={v => `${v}%`}
                  onChange={v => updateInput('earlyExitRate', v)}
                />
                <Slider
                  label="Annual default probability"
                  value={inputs.defaultRatePerYear}
                  min={0} max={10} step={0.5}
                  format={v => `${v.toFixed(1)}%`}
                  onChange={v => updateInput('defaultRatePerYear', parseFloat(v))}
                />
                <Slider
                  label="Monthly overhead"
                  value={inputs.monthlyOverhead}
                  min={2000} max={150_000} step={500}
                  format={v => fmtUSD(v, true)}
                  onChange={v => updateInput('monthlyOverhead', v)}
                />
                <Slider
                  label="Reserve contribution"
                  value={inputs.reserveContribution}
                  min={0} max={5} step={0.1}
                  format={v => `${v.toFixed(1)}%`}
                  onChange={v => updateInput('reserveContribution', parseFloat(v))}
                />
              </div>
            ) : (
              <div className="text-xs text-dim leading-relaxed">
                Churn, early exit rate, default rate, monthly overhead, and reserve contribution. Tap to expand.
              </div>
            )}
          </div>
        </div>

        {/* ================= SCENARIO PRESETS ================= */}
        <div className="bg-surface border border-app rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Scenario presets</div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(SCENARIOS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => applyScenario(key)}
                className="press-soft p-4 rounded-xl bg-surface-2 border border-app text-left"
              >
                <div className="font-display text-app text-lg mb-1" style={{ fontWeight: 400 }}>{s.label}</div>
                <div className="text-[10px] text-dim font-num">
                  ${(s.marketingBudgetWeek / 1000).toFixed(0)}K/wk · ${s.cacPerUser} CAC · {s.personaMix.saver + (s.personaMix.whale || 0) + (s.personaMix.megawhale || 0)}% committed
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-dim mt-6 mb-2">
          musa simulator · all numbers live · tweak and reset freely
        </div>
      </div>

      {/* ================= HELP MODAL ================= */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-surface border border-app rounded-2xl max-w-[720px] w-full max-h-[85vh] overflow-y-auto scrollable"
            style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface border-b border-app rounded-t-2xl px-6 py-4 flex items-center justify-between z-10">
              <div className="font-display italic text-gold text-lg">how this works</div>
              <button onClick={() => setShowHelp(false)} className="press w-8 h-8 rounded-full border border-app text-dim flex items-center justify-center">
                <X size={14} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>

              {/* ---- OVERVIEW ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">What is this</div>
                <p style={{ color: 'var(--text-dim)' }}>
                  A week-by-week business simulator for musa. It models every part of the system — user acquisition, purchasing behavior, gold delivery, churn, costs, defaults, and the reserve fund — running forward in simulated time. Every number on screen is computed live from the simulation state, not hard-coded. You control the assumptions; the model shows the consequences.
                </p>
              </div>

              {/* ---- MUSA BASICS ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">How musa works</div>
                <p style={{ color: 'var(--text-dim)' }}>
                  Users pay cash to lock in a gold position at a discount to the current spot price. musa forwards that cash to junior mining partners who supply real gold (PAXG on-chain). The gold is delivered gradually over the lock period. Users end up with more gold than they paid for — the discount is the incentive to lock.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {Object.entries(TIER_SPECS).map(([k, t]) => (
                    <div key={k} className="bg-surface-2 rounded-xl p-3 border border-app">
                      <div className="text-gold font-num text-[11px] mb-1">{t.name}</div>
                      <div className="text-dim text-[11px]">{t.lockWeeks / 4.33 | 0} month lock</div>
                      <div className="text-dim text-[11px]">{(t.discount * 100).toFixed(1)}% more gold</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- THE SIMULATION ENGINE ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">The simulation engine — what happens each week</div>
                <p className="text-dim text-[11px] mb-3">Every tick advances one week. The sim runs seven steps in order:</p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <div className="text-app text-[12px]">Acquisition</div>
                      <p className="text-dim text-[11px]">New users arrive. Paid users = marketing budget ÷ CAC. Organic users = a percentage of paid (the organic multiplier). Plus a small referral stream (0.1% of existing users). New users are split across the three personas by the audience mix sliders.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <div className="text-app text-[12px]">Churn</div>
                      <p className="text-dim text-[11px]">Each persona has a different weekly churn rate (Curious 3%, Saver 0.5%, Whale 0.3%). The churn multiplier slider scales all three together. Key mechanic: users with active locked positions (Flow or Vein) are protected from churning — they can't leave while their gold is vesting. This is the lock-in effect.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <div className="text-app text-[12px]">Purchases</div>
                      <p className="text-dim text-[11px]">Each persona buys at their own frequency and ticket size. Curious: 2×/yr at $60. Saver: 18×/yr at $150. Whale: 2×/yr at $7,500. The frequency multiplier and audience volume sliders scale these. Each purchase is allocated to a tier based on the persona's preference weights, then the cash is split: 2% processing, X% platform margin, X% reserve, remainder to mining partner.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">4</div>
                    <div>
                      <div className="text-app text-[12px]">Gold delivery</div>
                      <p className="text-dim text-[11px]">Outstanding committed grams are delivered using exponential decay: each week, 1/56th of undelivered grams are delivered. 56 weeks is the blended average delivery window across the three tiers (Spark 22 + Flow 48 + Vein 100 weeks, averaged). This creates a smooth, realistic delivery curve rather than cliff-edged batch deliveries.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">5</div>
                    <div>
                      <div className="text-app text-[12px]">Costs</div>
                      <p className="text-dim text-[11px]">Weekly costs = monthly overhead ÷ 4.33 + marketing budget + processing fees from this week's purchases. Overhead covers team, infra, legal — all fixed costs.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">6</div>
                    <div>
                      <div className="text-app text-[12px]">Defaults</div>
                      <p className="text-dim text-[11px]">A rare random event. Each week there's a small probability (annual default rate ÷ 52) that a mining partner fails to deliver. When it fires: exposure is 5% of in-flight capital (capped at $1.5M per event), 60% is recovered through legal/insurance, and the net loss hits the reserve fund first. Only if the reserve is empty does the loss hit the P&L.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-surface-2 border border-app flex items-center justify-center text-gold text-[10px] font-num flex-shrink-0 mt-0.5">7</div>
                    <div>
                      <div className="text-app text-[12px]">Early exits</div>
                      <p className="text-dim text-[11px]">A percentage of active positions exit early each year (the early exit rate slider). These users forfeit a portion of their remaining gold. The forfeited gold stays in the reserve.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- PERSONAS ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Four user personas</div>
                <p className="text-dim text-[11px] mb-3">Every simulated user belongs to one of four archetypes. The audience mix sliders control the ratio of new users across these groups.</p>
                <div className="space-y-2">
                  {[
                    { key: 'curious', desc: 'Top-of-funnel testers. Small ticket ($60), buy infrequently (2×/yr), heavily Spark tier, high churn (3%/wk ≈ 80%/yr). Most users start here. Revenue per user is low but they build volume. Calibrated to pump.fun/Coinbase first-purchase data.' },
                    { key: 'saver', desc: 'The core user. Monthly DCA buyers ($200), 12×/yr cadence, balanced across tiers but leaning Flow, low churn (0.5%/wk ≈ 23%/yr). ~$2,400/yr per user. Their locked positions protect them from churning — the product\'s retention flywheel.' },
                    { key: 'whale', desc: 'High-net-worth buyers. $7,500 ticket, 2×/yr, heavily Vein tier (24-month lock), very low churn (0.3%/wk ≈ 14%/yr). $15K/yr — a "small whale" allocating 1-3% of a $500K-2M portfolio to gold.' },
                    { key: 'megawhale', desc: 'Institutional / family office allocations. $50K ticket, 1×/yr, almost entirely Vein tier, stickiest cohort (0.2%/wk ≈ 10%/yr). Rare (0.5-3% of users) but transformative for volume. Represents advisors, funds, or HNW individuals doing $50-100K annual gold allocations.' },
                  ].map(({ key, desc }) => (
                    <div key={key} className="flex gap-3 items-start">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: PERSONAS[key].color }} />
                      <div>
                        <span className="text-app text-[12px]">{PERSONAS[key].name}</span>
                        <span className="text-dim text-[11px]"> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- SLIDERS: MAIN ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Main control sliders</div>
                <p className="text-dim text-[11px] mb-3">These control the primary growth and economics levers. Changes apply immediately to the next simulated week.</p>
                <div className="space-y-2" style={{ color: 'var(--text-dim)' }}>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Marketing budget / week</div>
                    <p className="text-[11px]">How much you spend on paid acquisition each week. Directly determines paid user inflow: budget ÷ CAC = paid users. Higher budget = more users, but the efficiency depends on CAC.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">CAC per paid user</div>
                    <p className="text-[11px]">Cost to acquire one paid user. Lower = more users per dollar. This is the other half of the acquisition equation. A $35 CAC with $3K/wk budget gets ~86 paid users. At $80 CAC, only 37. PWA distribution typically runs $25-60, native app $40-150.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Organic multiplier</div>
                    <p className="text-[11px]">What percentage of paid users you also get organically (word of mouth, SEO, press, social). 20% means for every 100 paid users, you get 20 organic users for free. Plus a tiny referral stream (0.1% of total users per week). This is where viral/brand effects show up.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Audience volume</div>
                    <p className="text-[11px]">Scales the ticket size for all personas. At 1.0× each persona uses their default ticket ($60 / $150 / $7,500). At 2.0× those double. Models whether your audience skews richer or poorer than the baseline assumption.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Purchase frequency</div>
                    <p className="text-[11px]">Scales how often each persona buys. At 1.0× Curious buys 2×/yr, Saver 18×/yr, Whale 2×/yr. At 1.5× those increase by 50%. Models whether users are more or less engaged than baseline.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Platform margin</div>
                    <p className="text-[11px]">The percentage of each purchase that musa keeps as revenue. Default 3%. The rest (minus processing and reserve) goes to mining partners for gold. Higher margin = more revenue per unit but users get slightly less gold value.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Reserve cap</div>
                    <p className="text-[11px]">Maximum size of the reserve fund. Once the reserve hits this cap, new contributions overflow into platform revenue instead. Prevents over-accumulation of idle capital. Set to $0 for uncapped.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Reserve yield</div>
                    <p className="text-[11px]">Annual yield earned on the reserve balance (treasuries, money market). Compounds weekly. This yield flows into platform revenue, making the reserve a productive asset rather than dead capital.</p>
                  </div>
                </div>
              </div>

              {/* ---- SLIDERS: ADVANCED ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Advanced sliders</div>
                <p className="text-dim text-[11px] mb-3">Risk and stress-testing parameters. Hidden by default in the "Advanced" panel.</p>
                <div className="space-y-2" style={{ color: 'var(--text-dim)' }}>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Churn multiplier</div>
                    <p className="text-[11px]">Scales all persona churn rates together. At 1.0× the base rates apply (Curious 3%/wk, Saver 0.5%/wk, Whale 0.3%/wk). At 2.5× (the Stressed scenario), churn is brutal — most Curious users leave within weeks. Users with active locked positions are still protected from churning regardless of this slider.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Early exit rate / year</div>
                    <p className="text-[11px]">Percentage of active locked positions that exit early each year. These users break their lock, forfeit unvested gold, and leave. Higher = more attrition in the active unit base. Forfeited gold benefits the reserve.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Annual default probability</div>
                    <p className="text-[11px]">The chance per year that a mining partner fails to deliver gold. When triggered: 5% of in-flight working capital is exposed, 60% is recovered, and the net loss hits the reserve first. At 2%/yr you might see one event every 50 weeks. At 6%+ you'll see the reserve get tested regularly.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Monthly overhead</div>
                    <p className="text-[11px]">Fixed costs: team salaries, infrastructure, legal, compliance. Paid every week (÷ 4.33). This is the burn floor — even with zero users, you pay this. The breakeven point depends heavily on how fast revenue outgrows this number.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Reserve contribution</div>
                    <p className="text-[11px]">Percentage of each purchase that's set aside into the reserve fund. Default 1%. Higher = safer (bigger buffer against defaults) but less cash to mining partners = less gold purchased per dollar.</p>
                  </div>
                </div>
              </div>

              {/* ---- AUDIENCE MIX ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Audience mix sliders</div>
                <p className="text-dim text-[11px]">
                  Four sliders (Curious / Saver / Whale / MegaWhale) control the composition of new users. They're relative weights, not absolute percentages — 80/15/4/1 means 80% Curious, 15% Saver, etc. The mix dramatically affects revenue: even 1% MegaWhales drive outsized volume ($50K ticket vs $60 Curious). MegaWhales are rare but transformative — a single one equals ~833 Curious purchases.
                </p>
              </div>

              {/* ---- DEPENDENCIES ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">How parameters connect</div>
                <p className="text-dim text-[11px] mb-3">Nothing in this model exists in isolation. Here's how the levers interact:</p>
                <div className="space-y-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <p><span className="text-app">Marketing budget + CAC + organic multiplier</span> → total new users per week. This is the growth engine. Budget ÷ CAC = paid users. Paid × organic% = free bonus. More users → more purchases → more revenue, but also more gold to deliver.</p>
                  <p><span className="text-app">Audience mix + frequency + volume</span> → revenue per user. The mix decides WHO your users are. Frequency decides how OFTEN they buy. Volume decides how MUCH they spend. A saver-heavy mix with high frequency generates steady, predictable cash flow. A whale-heavy mix generates lumpy but large inflows.</p>
                  <p><span className="text-app">Platform margin + reserve contribution</span> → how cash is split. Margin is your revenue. Reserve is your safety net. The remainder (after 2% processing) goes to mining partners. If margin + reserve + processing exceed ~6%, partners get less than 94 cents per dollar, which means less gold per position.</p>
                  <p><span className="text-app">Churn × lock-in protection</span> → effective retention. High churn devastates Curious users (Spark tier, no meaningful lock). But Savers and Whales on Flow/Vein tiers are partially shielded — they have active locked positions that prevent churning. This is why the tier mix matters: longer locks create stickier users.</p>
                  <p><span className="text-app">Default rate × reserve fund</span> → resilience. Defaults are absorbed by the reserve first. A well-funded reserve (high contribution %, high cap, earning yield) can swallow multiple defaults without hitting the P&L. An underfunded reserve means defaults blow straight through to your bottom line.</p>
                  <p><span className="text-app">Gold delivery rate × supply agreements</span> → operational scale. As more gold is committed, the weekly delivery throughput grows. The "Supply agreements" metric shows how many mining partner contracts you need to sustain that throughput, based on ~{AGREEMENT_YEARLY_OZ.toLocaleString()} oz/yr per agreement.</p>
                  <p><span className="text-app">Overhead × breakeven</span> → how deep the J-curve goes. Higher overhead pushes breakeven further out and deepens the boot capital requirement. The sim tracks cumulative P&L to find the exact trough — that's your minimum fundraise.</p>
                </div>
              </div>

              {/* ---- REALITY INJECTIONS ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Reality injections — where the numbers come from</div>
                <p className="text-dim text-[11px] mb-3">The model is grounded in real data wherever possible. Here's what's calibrated to reality vs. what's an assumption:</p>
                <div className="space-y-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Churn rates — from pump.fun retention studies</div>
                    <p>The Curious persona's 3%/wk churn (~80%/yr) is calibrated to observed retention curves from crypto consumer products (pump.fun data). Saver and Whale rates are lower, reflecting the stickiness of users with real financial commitment. These aren't guesses — they match published cohort decay patterns.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Lock-in churn protection</div>
                    <p>Users with active Flow (12mo) or Vein (24mo) positions can't churn while locked. The sim tracks locked units per persona and excludes them from the churn pool. Lock decay rate (1/75 per week) models positions maturing over time, gradually releasing users back into the churn-eligible pool. This is the core retention mechanic — not marketing, not loyalty points, but a structural incentive.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Gold delivery — exponential decay model</div>
                    <p>Rather than delivering gold in batches when locks expire, the sim uses a continuous exponential decay: 1/56th of all undelivered grams are delivered each week. 56 is the blended average delivery window across tiers. This smooths the delivery curve and is more realistic — in practice, musa has positions maturing at different times constantly.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Default model — rare, capped, reserve-first</div>
                    <p>Defaults aren't "users not paying" — they're exceptional events where a mining partner fails (geopolitics, fraud, force majeure). Exposure per event is capped at 5% of in-flight capital or $1.5M, whichever is less. 60% recovery rate reflects legal recourse, insurance, and asset liquidation. The reserve absorbs losses first, P&L only takes the hit if the reserve is empty. This is how real commodity finance risk works.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Supply agreements — junior mining benchmarks</div>
                    <p>Each supply agreement represents ~{AGREEMENT_YEARLY_OZ.toLocaleString()} oz/yr of gold throughput — a realistic forward purchase agreement with a junior mining operation (a fraction of a full mine's ~20,000 oz/yr output). The metric tells you how many partner contracts musa needs to sign to sustain current delivery volume.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Gold price — live from PAXG</div>
                    <p>On load, the sim fetches the current PAXG price from CoinGecko and converts to $/gram. If the fetch fails, it falls back to ${DEFAULT_GOLD_PRICE_PER_GRAM}/g. The green dot in the header means live price is active. All gold values, delivery rates, and supply agreement calculations use this price.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Persona purchase stochasticity</div>
                    <p>Purchase counts per week aren't deterministic. The sim computes expected purchases (frequency × users ÷ 52), takes the integer part, then rolls a random number for the fractional part. This means early weeks with few users have realistic variance — some weeks 3 purchases, some weeks 0 — rather than smooth impossible-looking curves.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Reserve fund mechanics</div>
                    <p>The reserve is a real structural feature, not decoration. It's funded by a percentage of every purchase, earns weekly yield (treasuries/money market), has a cap to prevent over-accumulation (overflow goes to revenue), and is the first line of defense against default losses. This mirrors how real commodity trading firms manage counterparty risk.</p>
                  </div>
                  <div className="bg-surface-2 rounded-xl p-3 border border-app">
                    <div className="text-app text-[12px] mb-1">Boot capital + boot gold (J-curve analysis)</div>
                    <p>The sim tracks cumulative profit from week 0. Early on, costs exceed revenue, creating a deepening loss (the J-curve). The deepest point is the "boot capital" — the minimum cash you need to pre-fund. The "boot gold" panel shows the supply side: how much gold you've committed to users at the trough and at breakeven, how much has been delivered, and how many mining partner agreements that translates to. Together, boot capital + boot gold answer: "what do I need to launch?"</p>
                  </div>
                </div>
              </div>

              {/* ---- SCENARIOS ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Scenario presets</div>
                <p className="text-dim text-[11px] mb-3">Three pre-configured starting points. Each sets all sliders to a coherent set of assumptions. You can tweak individual sliders after loading a scenario.</p>
                <div className="space-y-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <p><span className="text-app">PWA Base</span> — PWA-first launch, realistic paid acquisition. $3K/wk marketing, $35 CAC, 30% organic, 80/15/4/1 mix (Curious/Saver/Whale/MegaWhale), $12K/mo overhead. No app store cut, direct checkout. The credible launch scenario.</p>
                  <p><span className="text-app">PWA + PMF</span> — product-market fit on web. $5K/wk, $20 CAC, 50% organic, 62/25/10/3 mix (more committed users as PMF kicks in), 0.6× churn, $15K/mo overhead. What happens when the product clicks and referral loops compound.</p>
                  <p><span className="text-app">Native Cold</span> — native app cold-start. $6K/wk, $80 CAC, 15% organic, 88/10/2/0 mix (almost no whales at launch), 2.5× churn, 15% early exits, 6% defaults, $20K/mo overhead. Tests whether the model survives expensive distribution.</p>
                </div>
              </div>

              {/* ---- HOW TO USE ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">How to use it</div>
                <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <p><span className="text-app">Play / pause</span> — start or stop time. Each tick is one week.</p>
                  <p><span className="text-app">Speed</span> — 1×, 4×, 16×, or 64×. At 64× you'll hit year 5 in about a minute.</p>
                  <p><span className="text-app">Reset</span> — go back to week 0 with current slider settings. Use this to test a clean run after changing assumptions.</p>
                  <p><span className="text-app">Charts vs Flows</span> — Charts show time-series data (revenue, users, gold). Flows show the live money/gold flow diagram — where cash enters, gets split, and where gold comes back.</p>
                  <p><span className="text-app">Platform / Users / Gold tabs</span> — three chart views. Platform shows revenue, costs, and profit. Users shows acquisition, churn, and persona breakdown. Gold shows delivery and commitment curves.</p>
                  <p><span className="text-app">Snapshot</span> — downloads the full simulation state as JSON. Useful for saving a specific run to compare later.</p>
                  <p><span className="text-app">g / oz toggle</span> — switch gold display between grams and troy ounces.</p>
                </div>
              </div>

              {/* ---- KEY METRICS ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">Key metrics (top ticker row)</div>
                <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <p><span className="text-app">Monthly profit</span> — averaged over the last 12 weeks. Revenue (platform margin + reserve overflow + reserve yield) minus costs (overhead + marketing + processing + default losses).</p>
                  <p><span className="text-app">LTV</span> — lifetime value. Total platform revenue ever ÷ total users ever acquired. Tells you how much each user is worth on average across all personas.</p>
                  <p><span className="text-app">Gold delivered</span> — total grams (or oz) of gold delivered to all users across all time. The core output metric.</p>
                  <p><span className="text-app">Breakeven</span> — the week when cumulative profit first crosses zero. Before this point, the business is in the red. After, every week of profit is real retained earnings.</p>
                  <p><span className="text-app">Supply agreements</span> — how many mining partner contracts are needed right now, based on actual delivery throughput from the last 12 weeks ÷ {AGREEMENT_YEARLY_OZ.toLocaleString()} oz/yr per agreement.</p>
                  <p><span className="text-app">Market cap</span> — a rough indicative valuation: annual revenue × the revenue multiple you set (default 15×). Just a reference point, not a prediction.</p>
                </div>
              </div>

              {/* ---- WHAT IT DOESN'T MODEL ---- */}
              <div>
                <div className="text-gold text-[11px] uppercase tracking-[0.2em] mb-2">What it doesn't model</div>
                <div className="space-y-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  <p>Gold price changes over time (uses a fixed spot price per run). Conversion from Curious→Saver over time. Seasonality. Regulatory events. Partner capacity constraints. Network effects beyond basic referral. Geographic expansion. These are all real factors but adding them would make the model harder to reason about without proportional insight gain.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-app">
                <p className="text-dim text-[11px]">
                  All numbers are simulated approximations, not forecasts. The model is designed to reveal dynamics and sensitivities, not predict exact outcomes. Tweak the assumptions, watch what changes, and build intuition for how the system behaves under different conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function TickerCell({ label, value, tone = 'default', sub }) {
  const color = {
    default: 'var(--text)',
    gold: 'var(--gold)',
    green: 'var(--green)',
    red: 'var(--red)',
  }[tone];
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1.5 truncate">{label}</div>
      <div
        className="font-num tabular-nums truncate"
        style={{ color, fontSize: 'clamp(14px, 3.5vw, 20px)', lineHeight: '1.2' }}
      >
        {value}
      </div>
      {sub && <div className="text-[9px] text-dim font-num mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Slider({ label, value, min, max, step, format, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <div className="text-[11px] text-dim">{label}</div>
        <div className="text-[13px] font-num text-app">{format(value)}</div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// ============================================================
// CHARTS VIEW
// ============================================================
function ChartsView({ tab, setTab, state, derived, inputs, goldUnit, totalUsers }) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        {['platform', 'users'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`press-soft h-8 px-4 rounded-full text-[10px] uppercase tracking-[0.15em] border ${
              tab === t ? 'bg-gold text-black border-gold' : 'border-app text-dim'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'platform' && <PlatformChart state={state} derived={derived} inputs={inputs} />}
      {tab === 'users' && <UsersChart state={state} derived={derived} goldUnit={goldUnit} totalUsers={totalUsers} />}
    </div>
  );
}

function PlatformChart({ state, derived, inputs }) {
  const history = state.history;
  if (history.length < 2) {
    return <EmptyState label="Press play to run the simulation" />;
  }

  const profits = history.map(h => h.cumulativeProfit);
  const minP = Math.min(0, ...profits);
  const maxP = Math.max(0, ...profits);
  const range = maxP - minP || 1;

  const width = 100;
  const height = 100;
  const zeroY = ((maxP - 0) / range) * height;

  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = ((maxP - h.cumulativeProfit) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPathTop = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = ((maxP - h.cumulativeProfit) / range) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  const areaPath = `${areaPathTop} L ${width} ${zeroY} L 0 ${zeroY} Z`;

  // Cost breakdown percentages
  const totalCosts = state.totalPlatformCosts || 1;
  const pctOverhead = (state.totalOverhead / totalCosts) * 100;
  const pctMarketing = (state.totalMarketingSpend / totalCosts) * 100;
  const pctProcessing = (state.totalProcessingFees / totalCosts) * 100;
  const pctDefaults = (state.totalDefaultLosses / totalCosts) * 100;

  // Reserve coverage: months of expected default losses it can absorb
  const weeksRun = Math.max(1, state.week);
  const avgWeeklyDefaults = state.totalDefaultLosses / weeksRun;
  const reserveMonths = avgWeeklyDefaults > 0
    ? (state.reserveBalance / (avgWeeklyDefaults * 4.33))
    : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.25em] text-dim mb-1">Cumulative P&L</div>
          <div className="font-display font-num text-3xl tabular-nums" style={{
            color: state.cumulativeProfit >= 0 ? 'var(--green)' : 'var(--red)',
            fontWeight: 300
          }}>
            {fmtUSD(state.cumulativeProfit, true)}
          </div>
        </div>
        <div className="text-right text-[10px] text-dim font-num">
          <div>Rev: <span className="text-gold">{fmtUSD(state.totalPlatformRevenue, true)}</span></div>
          <div>Cost: <span className="text-red">{fmtUSD(state.totalPlatformCosts, true)}</span></div>
        </div>
      </div>
      <div className="relative mb-4" style={{ height: '160px' }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.2" strokeDasharray="0.5,0.5" />
          <path d={areaPath} fill="url(#goldGradient)" opacity="0.25" />
          <polyline points={points} fill="none" stroke="var(--gold)" strokeWidth="0.5" />
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute top-0 right-0 text-[9px] text-dim font-num">{fmtUSD(maxP, true)}</div>
        <div className="absolute bottom-0 right-0 text-[9px] text-dim font-num">{fmtUSD(minP, true)}</div>
        {derived.breakevenWeek && (
          <div
            className="absolute text-[9px] text-green font-num"
            style={{
              left: `${((derived.breakevenWeek / state.week) * 100) || 0}%`,
              top: `${zeroY}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            ↓ breakeven w{derived.breakevenWeek}
          </div>
        )}
      </div>

      {/* Cost breakdown + reserve */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">Cost breakdown</div>
          <div className="space-y-1.5">
            <CostRow label="Marketing" value={state.totalMarketingSpend} pct={pctMarketing} />
            <CostRow label="Overhead" value={state.totalOverhead} pct={pctOverhead} />
            <CostRow label="Processing" value={state.totalProcessingFees} pct={pctProcessing} />
            <CostRow label="Default losses" value={state.totalDefaultLosses} pct={pctDefaults} tone="red" />
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">Reserve fund</div>
          <div className="font-num text-lg text-gold tabular-nums">
            {fmtUSD(state.reserveBalance, true)}
            {inputs && inputs.maxReserveCap > 0 && (
              <span className="text-[10px] text-dim ml-2">
                / {fmtUSD(inputs.maxReserveCap, true)} cap
              </span>
            )}
          </div>
          <div className="text-[10px] text-dim font-num mt-0.5">
            contributed: {fmtUSD(state.totalReserveContributed, true)}
          </div>
          {state.totalReserveYield > 0 && (
            <div className="text-[10px] text-green font-num mt-0.5">
              + {fmtUSD(state.totalReserveYield, true)} yield → revenue
            </div>
          )}
          {state.totalReserveOverflow > 0 && (
            <div className="text-[10px] text-green font-num mt-0.5">
              + {fmtUSD(state.totalReserveOverflow, true)} overflow → revenue
            </div>
          )}
          {reserveMonths !== null && reserveMonths < 36 && (
            <div className="text-[10px] text-dim font-num mt-1">
              covers ~{reserveMonths.toFixed(1)} months of defaults
            </div>
          )}
          {reserveMonths !== null && reserveMonths >= 36 && (
            <div className="text-[10px] text-green font-num mt-1">
              well covered
            </div>
          )}
          {state.lastEvents.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-[9px] uppercase tracking-[0.2em] text-dim">Recent events</div>
              {state.lastEvents.slice(0, 3).map((e, i) => (
                <div key={i} className="text-[9px] text-red font-num leading-snug">
                  w{e.week}: {e.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, value, pct, tone = 'default' }) {
  const color = tone === 'red' ? 'var(--red)' : 'var(--text-dim)';
  return (
    <div className="flex items-center justify-between text-[10px] font-num">
      <div className="text-dim" style={{ minWidth: '70px' }}>{label}</div>
      <div className="flex-1 mx-2 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <div className="tabular-nums" style={{ color, minWidth: '50px', textAlign: 'right' }}>
        {fmtUSD(value, true)}
      </div>
    </div>
  );
}

function UsersChart({ state, derived, goldUnit, totalUsers }) {
  if (state.history.length < 2) return <EmptyState label="Press play to run the simulation" />;

  const users = state.history.map(h => h.users);
  const maxU = Math.max(1, ...users);
  const goldSeries = state.history.map(h => h.goldGramsDelivered || 0);
  const maxGold = Math.max(1, ...goldSeries);

  const width = 100;
  const height = 100;

  // User growth line
  const userPoints = state.history.map((h, i) => {
    const x = (i / (state.history.length - 1)) * width;
    const y = ((maxU - h.users) / maxU) * height;
    return `${x},${y}`;
  }).join(' ');

  // Gold delivered line (cumulative)
  const goldPoints = state.history.map((h, i) => {
    const x = (i / (state.history.length - 1)) * width;
    const y = ((maxGold - (h.goldGramsDelivered || 0)) / maxGold) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      {/* Top row: three big numbers — responsive sizing for narrow viewports */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-5">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1">Active users</div>
          <div className="font-display font-num tabular-nums text-app truncate" style={{ fontWeight: 300, fontSize: 'clamp(18px, 5vw, 30px)', lineHeight: '1' }}>
            {fmtNum(totalUsers)}
          </div>
          <div className="text-[9px] text-dim font-num mt-1 truncate">
            {fmtNum(state.totalUsersEver)} acquired
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1">Gold delivered</div>
          <div className="font-display font-num tabular-nums text-gold truncate" style={{ fontWeight: 300, fontSize: 'clamp(18px, 5vw, 30px)', lineHeight: '1' }}>
            {fmtGold(state.totalGoldGramsDelivered, goldUnit)}
          </div>
          <div className="text-[9px] text-dim font-num mt-1 truncate">
            worth {fmtUSD(derived.goldValue, true)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-1">Avg user LTV</div>
          <div className="font-display font-num tabular-nums text-app truncate" style={{ fontWeight: 300, fontSize: 'clamp(18px, 5vw, 30px)', lineHeight: '1' }}>
            {fmtUSD(derived.ltv, true)}
          </div>
          <div className="text-[9px] text-dim font-num mt-1 truncate">
            revenue / users
          </div>
        </div>
      </div>

      {/* Persona breakdown — horizontal stacked bar + counts */}
      <div className="mb-5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">Audience composition</div>
        {totalUsers > 0 ? (
          <>
            <div className="flex h-2 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {PERSONA_KEYS.map(k => (
                <div key={k} style={{ width: `${(state.usersByPersona[k] / totalUsers) * 100}%`, background: PERSONAS[k].color }} />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PERSONA_KEYS.map(pKey => {
                const p = PERSONAS[pKey];
                const count = state.usersByPersona[pKey];
                const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                return (
                  <div key={pKey} className="bg-surface-2 border border-app rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                      <div className="text-[9px] uppercase tracking-[0.15em] text-dim">{p.name}</div>
                    </div>
                    <div className="font-num text-sm text-app tabular-nums">{fmtNum(count)}</div>
                    <div className="text-[9px] text-dim font-num">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-dim">No users yet</div>
        )}
      </div>

      {/* Gold delivered chart (hero) */}
      <div className="mb-5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2 flex items-center justify-between">
          <span>Gold delivered to users · cumulative</span>
          <span className="font-num">
            {fmtGold(state.totalGoldGramsDelivered, goldUnit)} of {fmtGold(state.totalGoldGramsCommitted, goldUnit)} committed
          </span>
        </div>
        <div className="relative" style={{ height: '140px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
            <path
              d={`M 0 ${height} L ${state.history.map((h, i) => {
                const x = (i / (state.history.length - 1)) * width;
                const y = ((maxGold - (h.goldGramsDelivered || 0)) / maxGold) * height;
                return `${x} ${y}`;
              }).join(' L ')} L ${width} ${height} Z`}
              fill="url(#goldGradient3)"
              opacity="0.3"
            />
            <polyline points={goldPoints} fill="none" stroke="var(--gold)" strokeWidth="0.5" />
            <defs>
              <linearGradient id="goldGradient3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute top-0 right-0 text-[9px] text-dim font-num">
            {fmtGold(maxGold, goldUnit)}
          </div>
          <div className="absolute bottom-0 right-0 text-[9px] text-dim font-num">0</div>
        </div>
      </div>

      {/* User growth chart (secondary) */}
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-dim mb-2">Active users over time</div>
        <div className="relative" style={{ height: '80px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
            <polyline points={userPoints} fill="none" stroke="var(--text-dim)" strokeWidth="0.5" />
          </svg>
          <div className="absolute top-0 right-0 text-[9px] text-dim font-num">{fmtNum(maxU)}</div>
          <div className="absolute bottom-0 right-0 text-[9px] text-dim font-num">0</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex items-center justify-center h-[240px] text-dim text-xs">
      {label}
    </div>
  );
}

// ============================================================
// FLOWS VIEW
// ============================================================
function FlowsView({ state, inputs, derived, totalUsers }) {
  const flows = state.currentFlows;
  // Monthly figures
  const cashFromUsersMo  = flows.userToPlatform * 4.33;
  const cashToMinerMo    = flows.platformToMiner * 4.33;
  const goldFromMinerMo  = flows.minerToPlatform * 4.33;
  const goldToUserMo     = flows.platformToUser * 4.33;

  // Cost split percentages (of gross cash from users)
  const procPct    = PROCESSING_FEE * 100;                  // 2%
  const marginPct  = inputs.platformMargin || 3;            // 3%
  const reservePct = inputs.reserveContribution || 1;       // 1%
  const peelTotal  = procPct + marginPct + reservePct;      // ~6%
  const minerPct   = 100 - peelTotal;

  // Ribbon widths — log-scaled magnitude with a floor and ceiling
  const baseW = (v) => {
    if (v <= 0) return 6;
    return Math.max(8, Math.min(60, Math.log10(v + 1) * 7));
  };
  const cashTopW    = baseW(cashFromUsersMo);
  const cashMidW    = cashTopW * (minerPct / 100);   // narrower after peel-offs
  const goldBotW    = baseW(goldFromMinerMo);
  const goldTopW    = baseW(goldToUserMo);

  // SVG canvas
  const W = 360;
  const H = 460;
  const dockH = 56;       // height of each band
  const usersY    = 8;
  const platformY = (H - dockH) / 2;
  const minersY   = H - dockH - 8;

  // Vertical pipe runs from bottom of one dock to top of next
  const pipe1Top = usersY + dockH;
  const pipe1Bot = platformY;
  const pipe2Top = platformY + dockH;
  const pipe2Bot = minersY;

  // Horizontal positions of cash and gold pipes
  const cashX = W * 0.32;   // left side
  const goldX = W * 0.68;   // right side

  // Peel-off positions in pipe 1 (cash leaving the user→platform pipe into platform's chest)
  // We'll show them as small horizontal branches at intervals
  const pipe1Mid = (pipe1Top + pipe1Bot) / 2;
  const peelStartY = pipe1Top + (pipe1Bot - pipe1Top) * 0.25;
  const peelEndY   = pipe1Top + (pipe1Bot - pipe1Top) * 0.75;

  return (
    <div className="p-5 relative">
      <div className="text-[9px] uppercase tracking-[0.25em] text-dim mb-3">Money & gold in motion</div>

      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxWidth: '420px', height: 'auto' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A961" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#C9A961" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="goldGradientFlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#E4C57E" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E4C57E" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="peelGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C9A961" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#C9A961" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* === RIBBONS === */}
          {/* Cash pipe 1: Users → Platform (full width at top, slightly narrower at bottom after peels) */}
          <path
            d={`
              M ${cashX - cashTopW/2} ${pipe1Top}
              L ${cashX + cashTopW/2} ${pipe1Top}
              L ${cashX + cashMidW/2} ${pipe1Bot}
              L ${cashX - cashMidW/2} ${pipe1Bot}
              Z
            `}
            fill="url(#cashGradient)"
          />

          {/* Cash pipe 2: Platform → Miners (continues at the narrowed width) */}
          <path
            d={`
              M ${cashX - cashMidW/2} ${pipe2Top}
              L ${cashX + cashMidW/2} ${pipe2Top}
              L ${cashX + cashMidW/2} ${pipe2Bot}
              L ${cashX - cashMidW/2} ${pipe2Bot}
              Z
            `}
            fill="url(#cashGradient)"
          />

          {/* Gold pipe 1: Miners → Platform (going up) */}
          <path
            d={`
              M ${goldX - goldBotW/2} ${pipe2Bot}
              L ${goldX + goldBotW/2} ${pipe2Bot}
              L ${goldX + goldBotW/2} ${pipe2Top}
              L ${goldX - goldBotW/2} ${pipe2Top}
              Z
            `}
            fill="url(#goldGradientFlow)"
          />

          {/* Gold pipe 2: Platform → Users (going up, possibly slightly different width) */}
          <path
            d={`
              M ${goldX - goldBotW/2} ${pipe1Bot}
              L ${goldX + goldBotW/2} ${pipe1Bot}
              L ${goldX + goldTopW/2} ${pipe1Top}
              L ${goldX - goldTopW/2} ${pipe1Top}
              Z
            `}
            fill="url(#goldGradientFlow)"
          />

          {/* === PEEL-OFFS from cash pipe 1 === */}
          {/* Three small branches: processing, reserve, platform margin */}
          {[
            { y: peelStartY,                                    label: 'processing', pct: procPct },
            { y: (peelStartY + peelEndY) / 2,                   label: 'reserve',    pct: reservePct },
            { y: peelEndY,                                      label: 'margin',     pct: marginPct },
          ].map((peel, i) => (
            <g key={i}>
              <path
                d={`M ${cashX + cashMidW/2} ${peel.y}
                    Q ${cashX + 30} ${peel.y}, ${cashX + 60} ${peel.y - 4}`}
                stroke="url(#peelGradient)"
                strokeWidth="1.5"
                fill="none"
              />
              <text
                x={cashX + 64}
                y={peel.y - 6}
                fill="#9a9185"
                fontSize="7"
                fontFamily="Geist Mono, monospace"
                style={{ letterSpacing: '0.05em' }}
              >
                −{peel.pct.toFixed(0)}% {peel.label}
              </text>
            </g>
          ))}

          {/* === DOCKS (bands) === */}
          {/* Users dock */}
          <rect
            x="0" y={usersY} width={W} height={dockH}
            rx="10"
            fill="rgba(31,29,26,0.95)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text x="14" y={usersY + 18} fill="#7a716a" fontSize="8" fontFamily="Geist, sans-serif" style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}>USERS</text>
          <text x="14" y={usersY + 40} fill="#FAFAF7" fontSize="20" fontFamily="Fraunces, serif" fontWeight="400">{fmtNum(totalUsers)}</text>
          <text x={W - 14} y={usersY + 38} fill="#9a9185" fontSize="9" textAnchor="end" fontFamily="Geist Mono, monospace">buying mines</text>

          {/* Platform dock — highlighted */}
          <rect
            x="0" y={platformY} width={W} height={dockH}
            rx="10"
            fill="rgba(201,169,97,0.05)"
            stroke="#C9A961"
            strokeWidth="1"
          />
          <text x="14" y={platformY + 18} fill="#C9A961" fontSize="8" fontFamily="Geist, sans-serif" style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}>PLATFORM</text>
          <text x="14" y={platformY + 40} fill="#FAFAF7" fontSize="20" fontFamily="Fraunces, serif" fontWeight="400">{fmtUSD(derived.monthlyProfit, true)}</text>
          <text x={W - 14} y={platformY + 38} fill="#9a9185" fontSize="9" textAnchor="end" fontFamily="Geist Mono, monospace">monthly profit</text>

          {/* Miners dock */}
          <rect
            x="0" y={minersY} width={W} height={dockH}
            rx="10"
            fill="rgba(31,29,26,0.95)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
          <text x="14" y={minersY + 18} fill="#7a716a" fontSize="8" fontFamily="Geist, sans-serif" style={{ letterSpacing: '0.25em', textTransform: 'uppercase' }}>MINERS</text>
          <text x="14" y={minersY + 40} fill="#FAFAF7" fontSize="16" fontFamily="Fraunces, serif" fontStyle="italic" fontWeight="400">Partner pool</text>
          <text x={W - 14} y={minersY + 38} fill="#9a9185" fontSize="9" textAnchor="end" fontFamily="Geist Mono, monospace">{fmtUSD(state.totalToMiners, true)} delivered</text>

          {/* === FLOW LABELS === */}
          {/* Cash labels positioned at ribbon midpoints */}
          <g>
            <rect
              x={cashX - 26} y={pipe1Mid - 8}
              width="52" height="18" rx="4"
              fill="rgba(10,9,8,0.9)"
              stroke="rgba(201,169,97,0.3)"
              strokeWidth="0.5"
            />
            <text x={cashX} y={pipe1Mid + 4} fill="#C9A961" fontSize="9" textAnchor="middle" fontFamily="Geist Mono, monospace" fontWeight="500">
              {fmtUSD(cashFromUsersMo, true)}
            </text>
          </g>
          <g>
            <rect
              x={cashX - 26} y={(pipe2Top + pipe2Bot) / 2 - 8}
              width="52" height="18" rx="4"
              fill="rgba(10,9,8,0.9)"
              stroke="rgba(201,169,97,0.3)"
              strokeWidth="0.5"
            />
            <text x={cashX} y={(pipe2Top + pipe2Bot) / 2 + 4} fill="#C9A961" fontSize="9" textAnchor="middle" fontFamily="Geist Mono, monospace" fontWeight="500">
              {fmtUSD(cashToMinerMo, true)}
            </text>
          </g>
          {/* Gold labels positioned at ribbon midpoints */}
          <g>
            <rect
              x={goldX - 26} y={pipe1Mid - 8}
              width="52" height="18" rx="4"
              fill="rgba(10,9,8,0.9)"
              stroke="rgba(228,197,126,0.3)"
              strokeWidth="0.5"
            />
            <text x={goldX} y={pipe1Mid + 4} fill="#E4C57E" fontSize="9" textAnchor="middle" fontFamily="Geist Mono, monospace" fontWeight="500">
              {fmtUSD(goldToUserMo, true)}
            </text>
          </g>
          <g>
            <rect
              x={goldX - 26} y={(pipe2Top + pipe2Bot) / 2 - 8}
              width="52" height="18" rx="4"
              fill="rgba(10,9,8,0.9)"
              stroke="rgba(228,197,126,0.3)"
              strokeWidth="0.5"
            />
            <text x={goldX} y={(pipe2Top + pipe2Bot) / 2 + 4} fill="#E4C57E" fontSize="9" textAnchor="middle" fontFamily="Geist Mono, monospace" fontWeight="500">
              {fmtUSD(goldFromMinerMo, true)}
            </text>
          </g>

          {/* === DIRECTION HEADERS === */}
          <text x={cashX} y={4} fill="#7a716a" fontSize="7" textAnchor="middle" fontFamily="Geist, sans-serif" style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>cash ↓</text>
          <text x={goldX} y={4} fill="#7a716a" fontSize="7" textAnchor="middle" fontFamily="Geist, sans-serif" style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>gold ↑</text>
        </svg>
      </div>

      <div className="text-[9px] text-dim mt-3 text-center font-num">
        all flows shown per month · cash narrows where margin, processing and reserve are skimmed off
      </div>
    </div>
  );
}
