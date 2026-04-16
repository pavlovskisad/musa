import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { ArrowLeft, Plus, X, RotateCcw, ChevronRight, ChevronDown, Sparkles, Settings } from 'lucide-react';

// === Configuration (locked Tier 1 economics) ===
const DEFAULT_GOLD_PRICE_PER_GRAM = 150;
const GRAMS_PER_TROY_OZ = 31.1035;
const CONSTRUCTION_DAYS = 30;

// === Gold context: lets any component read current price and unit ===
const GoldContext = createContext({
  price: DEFAULT_GOLD_PRICE_PER_GRAM,
  unit: 'g',
  priceSource: 'default',
});
const useGold = () => useContext(GoldContext);

// Format a grams value using the current unit preference
const formatGold = (grams, unit, digits = 4) => {
  if (grams == null || isNaN(grams)) return '—';
  if (unit === 'oz') {
    const oz = grams / GRAMS_PER_TROY_OZ;
    return `${oz.toFixed(digits)}`;
  }
  return `${grams.toFixed(digits)}`;
};

const goldUnitLabel = (unit) => unit === 'oz' ? 'oz' : 'g';

const TIERS = {
  spark: {
    id: 'spark',
    name: 'Spark',
    lockMonths: 6,
    discount: 0.025,
    annualized: 0.05,
    description: 'Six months. Light commitment.',
    cancellable: false,
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    lockMonths: 12,
    discount: 0.07,
    annualized: 0.07,
    description: 'A year of patient accumulation.',
    cancellable: true,
  },
  vein: {
    id: 'vein',
    name: 'Vein',
    lockMonths: 24,
    discount: 0.188,
    annualized: 0.09,
    description: 'Two years. Maximum reward.',
    cancellable: true,
  },
};

const PRESET_AMOUNTS = [20, 50, 100, 500, 1000];

const TIME_SPEEDS = [
  { label: '1×', mult: 1 },
  { label: '1d/s', mult: 86400 },
  { label: '1w/s', mult: 604800 },
  { label: '1mo/s', mult: 2592000 },
];

// === Helpers ===
const formatUSD = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getExitPenaltyPct = (pctElapsed) => {
  if (pctElapsed < 0.25) return 0.50;
  if (pctElapsed < 0.50) return 0.35;
  if (pctElapsed < 0.75) return 0.20;
  return 0.10;
};

const computeUnit = (unit, now) => {
  const tier = TIERS[unit.tier];
  const ms = now.getTime() - unit.purchasedAt;
  const daysElapsed = Math.max(0, ms / 86400000);
  const constructionDays = CONSTRUCTION_DAYS;
  const deliveryDays = tier.lockMonths * 30;
  const totalDays = constructionDays + deliveryDays;

  if (unit.exitedAt) {
    const exitedDaysElapsed = (unit.exitedAt - unit.purchasedAt) / 86400000;
    return {
      ...unit,
      computedStatus: 'exited',
      daysElapsed: exitedDaysElapsed,
      gramsDelivered: unit.gramsAtExit || 0,
      pctDelivered: 0,
    };
  }

  if (daysElapsed < constructionDays) {
    return {
      ...unit,
      computedStatus: 'constructing',
      daysElapsed,
      constructionPct: daysElapsed / constructionDays,
      daysToFirstDelivery: constructionDays - daysElapsed,
      gramsDelivered: 0,
      pctDelivered: 0,
      daysRemaining: totalDays - daysElapsed,
      deliveryElapsed: 0,
    };
  }

  const deliveryElapsed = daysElapsed - constructionDays;
  const pctDelivered = Math.min(1, deliveryElapsed / deliveryDays);
  const gramsDelivered = unit.gramsTotal * pctDelivered;

  return {
    ...unit,
    computedStatus: pctDelivered >= 1 ? 'completed' : 'active',
    daysElapsed,
    deliveryElapsed,
    pctDelivered,
    gramsDelivered,
    daysRemaining: Math.max(0, totalDays - daysElapsed),
  };
};

// === Main App ===
export default function App() {
  const [simTime, setSimTime] = useState(new Date());
  const [timeMult, setTimeMult] = useState(1); // default to real time
  const lastTickRef = useRef(Date.now());

  // Gold price + unit (live-fetched from CoinGecko PAXG, fallback to default)
  const [goldPrice, setGoldPrice] = useState(DEFAULT_GOLD_PRICE_PER_GRAM);
  const [goldUnit, setGoldUnit] = useState('g');
  const [priceSource, setPriceSource] = useState('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const paxgUsd = data?.['pax-gold']?.usd;
        if (paxgUsd && !cancelled) {
          const perGram = paxgUsd / GRAMS_PER_TROY_OZ;
          setGoldPrice(parseFloat(perGram.toFixed(2)));
          setPriceSource('live');
        }
      } catch {
        if (!cancelled) setPriceSource('failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const realDelta = now - lastTickRef.current;
      lastTickRef.current = now;
      setSimTime(prev => new Date(prev.getTime() + realDelta * timeMult));
    }, 80);
    return () => clearInterval(interval);
  }, [timeMult]);

  const [screen, setScreen] = useState('onboarding');
  const [devOpen, setDevOpen] = useState(false);
  const [units, setUnits] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [recentlyPurchased, setRecentlyPurchased] = useState(null);
  const [creating, setCreating] = useState(null); // {tierId, amount} during creation animation
  const [celebratingUnit, setCelebratingUnit] = useState(null); // unit that just completed
  const celebratedIdsRef = useRef(new Set());

  const computedUnits = useMemo(
    () => units.map(u => computeUnit(u, simTime)),
    [units, simTime]
  );

  // Active = not exited (still mining or constructing or completed)
  // Exited = closed by user, but their delivered grams still count toward totals
  const totals = useMemo(() => {
    const totalGrams = computedUnits.reduce((s, u) => s + (u.gramsDelivered || 0), 0);
    const pendingGrams = computedUnits
      .filter(u => u.computedStatus !== 'exited' && u.computedStatus !== 'completed')
      .reduce((s, u) => s + (u.gramsTotal - (u.gramsDelivered || 0)), 0);
    const totalValueUSD = totalGrams * goldPrice;
    return { totalGrams, pendingGrams, totalValueUSD };
  }, [computedUnits, goldPrice]);

  const visibleUnits = computedUnits
    .filter(u => u.computedStatus !== 'exited')
    .sort((a, b) => {
      // completed units go to the bottom; otherwise preserve original order
      const aDone = a.computedStatus === 'completed' ? 1 : 0;
      const bDone = b.computedStatus === 'completed' ? 1 : 0;
      return aDone - bDone;
    });

  // Detect newly-completed units and trigger a celebration moment
  useEffect(() => {
    if (celebratingUnit) return; // already celebrating
    for (const u of computedUnits) {
      if (u.computedStatus === 'completed' && !celebratedIdsRef.current.has(u.id)) {
        celebratedIdsRef.current.add(u.id);
        setCelebratingUnit(u);
        break;
      }
    }
  }, [computedUnits, celebratingUnit]);

  const startBuy = (tierId, amount) => {
    setCreating({ tierId, amount });
    setTimeout(() => {
      const tier = TIERS[tierId];
      const faceValue = amount * (1 + tier.discount);
      const grams = faceValue / goldPrice;
      const unit = {
        id: Math.random().toString(36).slice(2, 9),
        tier: tierId,
        pricePaid: amount,
        faceValue,
        gramsTotal: grams,
        goldPriceAtPurchase: goldPrice,
        purchasedAt: simTime.getTime(),
        exitedAt: null,
      };
      setUnits(prev => [unit, ...prev]);
      setRecentlyPurchased(unit.id);
      setCreating(null);
      setScreen('home');
      setTimeout(() => setRecentlyPurchased(null), 2500);
    }, 1800);
  };

  const exitUnit = (unitId) => {
    const unit = computedUnits.find(u => u.id === unitId);
    if (!unit) return;
    const tier = TIERS[unit.tier];
    const totalDeliveryDays = tier.lockMonths * 30;
    const pctElapsed = unit.deliveryElapsed ? unit.deliveryElapsed / totalDeliveryDays : 0;
    const penaltyPct = getExitPenaltyPct(pctElapsed);
    const undeliveredGrams = Math.max(0, unit.gramsTotal - unit.gramsDelivered);
    const refundGrams = undeliveredGrams * (1 - penaltyPct);
    const totalReceived = unit.gramsDelivered + refundGrams;

    setUnits(prev =>
      prev.map(u =>
        u.id === unitId
          ? {
              ...u,
              exitedAt: simTime.getTime(),
              gramsAtExit: totalReceived,
            }
          : u
      )
    );
    setScreen('home');
  };

  const resetAll = () => {
    setUnits([]);
    setSimTime(new Date());
    setScreen('onboarding');
    setSelectedUnitId(null);
    setSelectedTier(null);
    setSelectedAmount(100);
    setCreating(null);
  };

  const selectedUnit = computedUnits.find(u => u.id === selectedUnitId);

  return (
    <GoldContext.Provider value={{ price: goldPrice, unit: goldUnit, priceSource }}>
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: '#0a0908' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap');

        :root {
          --gold: #C9A961;
          --gold-dim: #8B7340;
          --gold-bright: #E4C57E;
          --bg: #0a0908;
          --surface: #161513;
          --surface-2: #1f1d1a;
          --border: rgba(255,255,255,0.08);
          --border-strong: rgba(255,255,255,0.14);
          --text: #FAFAF7;
          --text-dim: #8c8a82;
        }

        * { font-family: 'Geist', system-ui, sans-serif; }
        .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .font-num { font-family: 'Geist Mono', ui-monospace, monospace; font-feature-settings: 'tnum'; }

        .text-gold { color: var(--gold); }
        .bg-gold { background-color: var(--gold); }
        .border-gold { border-color: var(--gold); }
        .bg-surface { background-color: var(--surface); }
        .bg-surface-2 { background-color: var(--surface-2); }
        .border-app { border-color: var(--border); }
        .border-app-strong { border-color: var(--border-strong); }
        .text-app { color: var(--text); }
        .text-dim { color: var(--text-dim); }
        .bg-app { background-color: var(--bg); }

        .dot-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        .gold-glow {
          box-shadow: 0 0 0 1px rgba(201,169,97,0.3), 0 12px 40px -8px rgba(201,169,97,0.25);
        }

        .scrollable::-webkit-scrollbar { display: none; }
        .scrollable { -ms-overflow-style: none; scrollbar-width: none; }

        .phone-frame {
          box-shadow:
            0 40px 80px -20px rgba(0,0,0,0.6),
            0 80px 120px -40px rgba(201,169,97,0.08);
        }

        button { font-family: inherit; }

        /* === Animations === */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUpBig {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .anim-fade { animation: fadeIn 0.4s ease-out both; }
        .anim-slide-right { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-slide-up { animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-slide-up-big { animation: slideInUpBig 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes slideDownIn {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        .anim-slide-down { animation: slideDownIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .anim-pop { animation: popIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }

        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.18s; }
        .delay-3 { animation-delay: 0.26s; }
        .delay-4 { animation-delay: 0.5s; }

        .progress-fill {
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .press:active { transform: scale(0.98); }
        .press-soft:active { transform: scale(0.99); }
        .press, .press-soft { transition: transform 0.15s ease-out, border-color 0.2s, background-color 0.2s; }

        /* === Mining shimmer (active mine cards) === */
        @keyframes shimmerPass {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .progress-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.0) 30%,
            rgba(255,255,255,0.55) 50%,
            rgba(255,255,255,0.0) 70%,
            transparent 100%);
          animation: shimmerPass 2.6s linear infinite;
          mix-blend-mode: overlay;
        }
        @keyframes pulseGold {
          0%, 100% { opacity: 0.65; }
          50%      { opacity: 1; }
        }
        .pulse-gold {
          animation: pulseGold 2.2s ease-in-out infinite;
        }
        @keyframes pulseRing {
          0%   { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .pulse-ring {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 9999px;
          background: var(--gold);
          animation: pulseRing 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        /* === Creation animation === */
        @keyframes ringExpand {
          0%   { transform: scale(0); opacity: 0; }
          15%  { opacity: 1; }
          60%  { opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-110%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(110%); opacity: 0; }
        }
        @keyframes gridFadeIn {
          0%   { opacity: 0; transform: scale(1.2); filter: blur(8px); }
          50%  { opacity: 1; filter: blur(0px); }
          100% { opacity: 0.4; transform: scale(1); filter: blur(0px); }
        }
        @keyframes coreReveal {
          0%   { opacity: 0; transform: scale(0.4); }
          50%  { opacity: 0; }
          70%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes textRise {
          0%, 60% { opacity: 0; transform: translateY(20px); }
          100%    { opacity: 1; transform: translateY(0); }
        }
        @keyframes shutterIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shutterOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        .creation-overlay {
          animation: shutterIn 0.25s ease-out both, shutterOut 0.3s ease-in 1.5s both;
        }

        .creation-grid {
          animation: gridFadeIn 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .creation-ring {
          position: absolute;
          left: 50%; top: 50%;
          width: 120px; height: 120px;
          margin-left: -60px; margin-top: -60px;
          border: 1px solid var(--gold);
          border-radius: 9999px;
        }
        .creation-ring-1 { animation: ringExpand 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both; }
        .creation-ring-2 { animation: ringExpand 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
        .creation-ring-3 { animation: ringExpand 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both; }
        .creation-scan {
          position: absolute;
          left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          box-shadow: 0 0 12px 2px rgba(201,169,97,0.6);
          animation: scanLine 1.4s cubic-bezier(0.4, 0, 0.6, 1) 0.2s both;
        }
        .creation-core {
          animation: coreReveal 1.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .creation-text {
          animation: textRise 1.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* === Celebration overlay === */
        .celebration-overlay {
          animation: shutterIn 0.35s ease-out both, shutterOut 0.4s ease-in 3.8s both;
        }
        .celebration-grid {
          animation: gridFadeIn 2.2s cubic-bezier(0.16, 1, 0.3, 1) both;
          opacity: 0.25;
        }
        .celebration-ring {
          position: absolute;
          left: 50%; top: 50%;
          width: 180px; height: 180px;
          margin-left: -90px; margin-top: -90px;
          border: 1px solid var(--gold);
          border-radius: 9999px;
          opacity: 0;
        }
        .celebration-ring-1 { animation: celebrationRing 3.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s infinite; }
        .celebration-ring-2 { animation: celebrationRing 3.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s infinite; }
        .celebration-ring-3 { animation: celebrationRing 3.4s cubic-bezier(0.16, 1, 0.3, 1) 0.9s infinite; }
        @keyframes celebrationRing {
          0%   { transform: scale(0.3); opacity: 0; }
          20%  { opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        .celebration-text {
          animation: celebrationRise 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        @keyframes celebrationRise {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* === Ambient: active mine particles === */
        @keyframes particleRise {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-120px); opacity: 0; }
        }
        @keyframes particleRiseLg {
          0%   { transform: translateY(0); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(-520px); opacity: 0; }
        }
        @keyframes particleRiseOnboard {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(-180px); opacity: 0; }
        }
        @keyframes particleRiseFar {
          0%   { transform: translateY(0); opacity: 0; }
          20%  { opacity: 0.35; }
          80%  { opacity: 0.35; }
          100% { transform: translateY(-90px); opacity: 0; }
        }
        @keyframes particleRiseClose {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-240px); opacity: 0; }
        }
        .ambient-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          border-radius: inherit;
        }
        .particle {
          position: absolute;
          bottom: -4px;
          width: 2px;
          height: 2px;
          border-radius: 9999px;
          background: var(--gold);
          box-shadow: 0 0 4px rgba(201,169,97,0.6);
          animation: particleRise 9s linear infinite;
        }
        .particle-lg {
          animation: particleRiseLg 14s linear infinite;
        }
        .particle-onboard {
          animation: particleRiseOnboard 11s linear infinite;
        }
        /* Drift-only particle for onboarding full-height field.
           Rises only 60px from wherever it starts, so it feels local. */
        @keyframes particleDriftLocal {
          0%   { transform: translateY(0); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }
        .particle-drift {
          animation: particleDriftLocal 9s linear infinite;
        }
        .particle-far {
          width: 1px;
          height: 1px;
          background: rgba(201,169,97,0.6);
          box-shadow: 0 0 2px rgba(201,169,97,0.3);
          animation: particleRiseFar 16s linear infinite;
        }
        .particle-close {
          width: 3px;
          height: 3px;
          background: var(--gold);
          box-shadow: 0 0 6px rgba(201,169,97,0.9), 0 0 12px rgba(201,169,97,0.4);
          animation: particleRiseClose 8s linear infinite;
        }

        /* === River particle (connect-the-dots screen) ===
           Slow fullscreen rise from bottom edge to above the top edge,
           with subtle horizontal drift for organic motion. Each particle's
           duration, delay, and drift (--drift-x) vary independently. */
        @keyframes particleRiver {
          0%   {
            transform: translate(0, 0);
            opacity: 0;
          }
          8%   { opacity: var(--pop, 0.7); }
          92%  { opacity: var(--pop, 0.7); }
          100% {
            transform: translate(var(--drift-x, 0), -110vh);
            opacity: 0;
          }
        }
        .particle-river {
          position: absolute;
          bottom: -10px;
          width: 1.5px;
          height: 1.5px;
          border-radius: 9999px;
          background: var(--gold);
          box-shadow: 0 0 4px rgba(201,169,97,0.55);
          animation: particleRiver linear infinite;
          will-change: transform, opacity;
        }

        /* === Vortex particles (connect-the-dots screen) ===
           Each particle has its own unique @keyframes block (vortex0..vortexN)
           injected dynamically below — see the OnboardingScreen render. The
           base style only sets visual properties; animation comes from the
           per-particle inline style. */
        .particle-vortex {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 2px;
          height: 2px;
          margin-left: -1px;
          margin-top: -1px;
          border-radius: 9999px;
          background: var(--gold);
          box-shadow: 0 0 4px rgba(201,169,97,0.7);
          opacity: 0;
          will-change: transform, opacity;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        /* === Splash screen: spark → dot → expand outward === */
        @keyframes splashGlowPulse {
          0%   { transform: scale(0.3); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes splashDotExpand {
          0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          10%  { transform: translate(-50%, -50%) scale(0.05); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
        }
        @keyframes splashFadeOut {
          0%   { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        .splash-glow {
          position: absolute;
          top: 50%; left: 50%;
          width: 60px; height: 60px;
          margin-left: -30px; margin-top: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,97,0.5) 0%, rgba(201,169,97,0.15) 35%, transparent 65%);
          animation: splashGlowPulse 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .splash-dot {
          position: absolute;
          top: 50%; left: 50%;
          width: 40px; height: 40px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(201,169,97,0.6) 0%, rgba(201,169,97,0.2) 40%, transparent 70%);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          animation: splashDotExpand 1.6s cubic-bezier(0.22, 1, 0.36, 1) 1.4s forwards;
        }
        .splash-overlay-exit {
          animation: splashFadeOut 0.8s ease-out 2.4s forwards;
        }

        /* === Refined entrance animations for onboarding content === */
        @keyframes onboardLabelIn {
          0%   { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes onboardHeadlineIn {
          0%   { opacity: 0; transform: translateY(20px); filter: blur(4px); }
          60%  { filter: blur(0); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes onboardSubtitleIn {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 0.7; transform: translateY(0); }
        }
        @keyframes onboardButtonIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .onboard-label-in    { animation: onboardLabelIn 0.8s ease-out 2.4s both; }
        .onboard-headline-in { animation: onboardHeadlineIn 1.2s ease-out 2.5s both; }
        .onboard-subtitle-in { animation: onboardSubtitleIn 1s ease-out 2.9s both; }
        .onboard-button-in   { animation: onboardButtonIn 1.1s ease-out 3.1s both; }

        /* === Scroll hint — subtle "more below" cue on first viewport === */
        @keyframes scrollHintBreath {
          0%, 100% { opacity: 0.25; transform: translate(-50%, 0); }
          50%      { opacity: 0.6;  transform: translate(-50%, 6px); }
        }
        .scroll-hint {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          animation: scrollHintBreath 2.6s ease-in-out infinite;
          transition: opacity 0.6s ease-out;
          pointer-events: none;
          z-index: 5;
        }
        .scroll-hint.hidden {
          opacity: 0 !important;
          animation: none;
        }

        /* === Connect-the-dots circle (screen 5) ===
           Arc + fill are JS-driven, triggered on each "eat" event.
           Each eat flashes both arcs drawing in parallel (one full sweep
           in ~400ms), then they fade out over ~500ms, ready for next bite. */
        @keyframes arcFlash {
          0%   { stroke-dashoffset: 320; opacity: 0; }
          10%  { opacity: 1; }
          45%  { stroke-dashoffset: 0; opacity: 1; }
          75%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        /* Endpoint dots (USER, MINERS) — brighten when the arc arrives,
           matching the arc's draw completion at ~45% of the flash cycle.
           Uses transform-origin per-element to scale from the dot's center. */
        @keyframes endpointFlashUser {
          0%, 40% { fill: rgba(232, 218, 188, 0.9); transform: scale(1); }
          48%     { fill: rgba(255, 248, 220, 1);   transform: scale(1.6); }
          75%     { fill: rgba(232, 218, 188, 0.9); transform: scale(1); }
          100%    { fill: rgba(232, 218, 188, 0.9); transform: scale(1); }
        }
        @keyframes endpointFlashMiner {
          0%, 40% { fill: #C9A961;  transform: scale(1); }
          48%     { fill: #F4DE9D;  transform: scale(1.6); }
          75%     { fill: #C9A961;  transform: scale(1); }
          100%    { fill: #C9A961;  transform: scale(1); }
        }
        .endpoint-user {
          transform-origin: 110px 10px;
        }
        .endpoint-miner {
          transform-origin: 110px 210px;
        }
        /* Endpoint labels (you / miners) — brighten alongside the dots
           when the arc arrives. Color shift + slight letter-spacing
           expansion for a "word lighting up" feel. */
        @keyframes labelFlashUser {
          0%, 40% {
            color: rgba(164, 158, 144, 0.7);
            letter-spacing: 0.3em;
            text-shadow: none;
          }
          48% {
            color: rgba(255, 248, 220, 1);
            letter-spacing: 0.42em;
            text-shadow: 0 0 8px rgba(232, 218, 188, 0.6);
          }
          75% {
            color: rgba(164, 158, 144, 0.7);
            letter-spacing: 0.3em;
            text-shadow: none;
          }
        }
        @keyframes labelFlashMiner {
          0%, 40% {
            color: rgba(164, 158, 144, 0.7);
            letter-spacing: 0.3em;
            text-shadow: none;
          }
          48% {
            color: #F4DE9D;
            letter-spacing: 0.42em;
            text-shadow: 0 0 8px rgba(201, 169, 97, 0.7);
          }
          75% {
            color: rgba(164, 158, 144, 0.7);
            letter-spacing: 0.3em;
            text-shadow: none;
          }
        }
        /* musa logo pulse — peaks at the start of the pulse cycle,
           synced with the singularity bite at the center. Labels/dots
           peak later (at 48%, when arcs arrive) — this creates a
           ripple from center outward. */
        @keyframes musaLogoPulse {
          0%      { transform: scale(1); filter: brightness(1); }
          10%     { transform: scale(1.15); filter: brightness(1.4); }
          35%     { transform: scale(1); filter: brightness(1); }
          100%    { transform: scale(1); filter: brightness(1); }
        }
        .connect-fill {
          opacity: 0;
          transform: scale(0.9);
          transform-origin: center;
          transition: opacity 0.45s ease-out, transform 0.45s ease-out;
        }
        .connect-fill-on {
          opacity: 0.55;
          transform: scale(1);
        }
        .connect-fill-punch {
          opacity: 0.95 !important;
          transform: scale(1.08) !important;
          transition: opacity 0.1s ease-out, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        /* Singularity glow — dim baseline hot core that blinks brighter
           each time a vortex particle reaches it (an "eat" event). The
           blinks are driven by JS — see OnboardingScreen's useEffect. */
        .singularity-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 48px;
          height: 48px;
          margin-left: -24px;
          margin-top: -24px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 240, 200, 0.95) 0%,
            rgba(232, 198, 120, 0.6) 25%,
            rgba(201, 169, 97, 0.3) 50%,
            rgba(201, 169, 97, 0.08) 75%,
            transparent 100%
          );
          filter: blur(3px);
          pointer-events: none;
          opacity: 0;
          transform: scale(0.75);
          transition: opacity 0.18s ease-out, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.18s ease-out;
          will-change: transform, opacity, filter;
        }
        .singularity-glow-on {
          opacity: 0.55;
          transform: scale(0.9);
        }
        .singularity-glow-eat {
          opacity: 1 !important;
          transform: scale(1.15) !important;
          filter: blur(4px) brightness(1.4) !important;
        }

        /* === Grain delivery (screen 4 — from mine to your wallet) ===
           Grains fall from above, accumulate into a soft pile at the bottom.
           Animations only run when the parent has .grains-on class. */
        .grains-stage {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .grain {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,205,140,1) 0%, rgba(201,169,97,0.85) 50%, rgba(201,169,97,0) 100%);
          box-shadow: 0 0 6px rgba(201,169,97,0.6);
          opacity: 0;
          top: 0;
          /* per-grain left, --dur, and animation-delay are set inline */
        }
        .grains-on .grain {
          animation: grainFall var(--dur, 2.6s) cubic-bezier(0.4, 0.5, 0.5, 1) infinite;
        }
        @keyframes grainFall {
          0%   { top: 0;    transform: scale(0.6); opacity: 0; }
          10%  { top: 8%;   transform: scale(1);   opacity: 1; }
          85%  { top: 85%;  transform: scale(1);   opacity: 1; }
          95%  { top: 92%;  transform: scale(0.7); opacity: 0.4; }
          100% { top: 95%;  transform: scale(0.4); opacity: 0; }
        }

        /* The pile — soft glowing mound at the bottom that grows over time */
        .grain-pile {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 200px;
          height: 30px;
          margin-left: -100px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(201,169,97,0.55) 0%, rgba(201,169,97,0.22) 40%, rgba(201,169,97,0.05) 70%, transparent 90%);
          filter: blur(4px);
          opacity: 0;
          transform: scaleY(0.3) scaleX(0.5);
          transform-origin: bottom center;
          transition: opacity 1.2s ease-out, transform 4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .grains-on .grain-pile {
          opacity: 0.85;
          transform: scaleY(1) scaleX(1);
          animation: pileBreath 5s ease-in-out infinite 1.5s;
        }
        @keyframes pileBreath {
          0%, 100% { filter: blur(4px) brightness(1); }
          50%      { filter: blur(5px) brightness(1.15); }
        }

        /* === Safe and sound (screen 5) ===
           A small pile of gold under a soft glowing protective dome.
           Dome breathes slowly. Faint concentric rings pulse outward
           occasionally, suggesting safety/containment without alarm. */
        .vault-stage {
          position: relative;
          width: 100%;
          height: 100%;
        }
        .vault-pile {
          position: absolute;
          left: 50%;
          top: 58%;
          width: 140px;
          height: 22px;
          margin-left: -70px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(201,169,97,0.65) 0%, rgba(201,169,97,0.28) 40%, rgba(201,169,97,0.06) 70%, transparent 90%);
          filter: blur(3px);
          opacity: 0;
          transition: opacity 1.4s ease-out 0.3s;
        }
        .vault-on .vault-pile {
          opacity: 0.9;
          animation: pileBreath 5s ease-in-out infinite 1.5s;
        }
        .vault-dome {
          position: absolute;
          left: 50%;
          top: 58%;
          width: 220px;
          height: 220px;
          margin-left: -110px;
          margin-top: -180px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 70%, rgba(201,169,97,0.18) 0%, rgba(201,169,97,0.08) 35%, rgba(201,169,97,0.02) 60%, transparent 80%);
          filter: blur(8px);
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 1.4s ease-out 0.6s, transform 2s cubic-bezier(0.16, 1, 0.3, 1) 0.6s;
        }
        .vault-on .vault-dome {
          opacity: 1;
          transform: scale(1);
          animation: domeBreath 6s ease-in-out infinite 2s;
        }
        @keyframes domeBreath {
          0%, 100% { filter: blur(8px) brightness(1);    transform: scale(1); }
          50%      { filter: blur(9px) brightness(1.18); transform: scale(1.03); }
        }
        .vault-ring {
          position: absolute;
          left: 50%;
          top: 58%;
          border: 1px solid rgba(201,169,97,0.18);
          border-radius: 50%;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.4);
        }
        .vault-on .vault-ring {
          animation: vaultRingPulse 6s ease-out infinite;
        }
        @keyframes vaultRingPulse {
          0%   { opacity: 0;    transform: translate(-50%, -50%) scale(0.4); }
          15%  { opacity: 0.5;  }
          80%  { opacity: 0;    transform: translate(-50%, -50%) scale(2.4); }
          100% { opacity: 0;    transform: translate(-50%, -50%) scale(2.4); }
        }

        /* === musa logo on screen 1 — soft warm glow + occasional shimmer sweep === */
        .musa-logo {
          position: relative;
          display: inline-block;
          color: rgba(232, 218, 188, 0.7);
        }
        .musa-logo-text {
          position: relative;
          z-index: 1;
        }

        /* === musa↔touch morph (screen 5 center) ===
           Wrapper has fixed width. Both words absolute-positioned with
           full-width text-align center so they share identical visual
           centering regardless of letter count. */
        .musa-morph {
          position: relative;
          display: inline-block;
          width: 80px;
          height: 1em;
          text-align: center;
        }
        .musa-morph .musa-word-musa,
        .musa-morph .musa-word-touch,
        .musa-morph .musa-logo-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          text-align: center;
        }
        .musa-morph .musa-word-touch {
          z-index: 1;
          animation: morphTouch 11s steps(1, end) infinite;
        }
        .musa-morph .musa-word-musa {
          z-index: 1;
          animation: morphMusa 11s steps(1, end) infinite;
        }
        @keyframes morphMusa {
          0%, 49%   { opacity: 1; }
          50%, 99%  { opacity: 0; }
          100%      { opacity: 1; }
        }
        @keyframes morphTouch {
          0%, 49%   { opacity: 0; }
          50%, 99%  { opacity: 1; }
          100%      { opacity: 0; }
        }
        /* Shimmer sweeps timed to the morph crossover */
        .musa-morph .musa-logo-shimmer {
          z-index: 2;
          animation: morphShimmerMusa 11s ease-in-out infinite;
        }
        .musa-morph .musa-shimmer-touch {
          animation: morphShimmerTouch 11s ease-in-out infinite;
        }
        @keyframes morphShimmerMusa {
          0%        { background-position: 150% 0; opacity: 1; }
          42%       { background-position: 150% 0; opacity: 1; }
          50%       { background-position: -50% 0; opacity: 1; }
          51%, 100% { background-position: -50% 0; opacity: 0; }
        }
        @keyframes morphShimmerTouch {
          0%, 92%   { background-position: 150% 0; opacity: 0; }
          93%       { background-position: 150% 0; opacity: 1; }
          100%      { background-position: -50% 0; opacity: 1; }
        }
        @keyframes musaLogoBreath {
          0%, 100% { text-shadow: 0 0 6px rgba(201,169,97,0.18), 0 0 14px rgba(201,169,97,0.08); }
          50%      { text-shadow: 0 0 10px rgba(201,169,97,0.35), 0 0 22px rgba(201,169,97,0.18); }
        }
        .musa-logo {
          animation: musaLogoBreath 4.2s ease-in-out infinite;
        }
        /* Shimmer sweep — a bright copy of the text masked by a moving gradient */
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
        @keyframes musaLogoShimmer {
          0%   { background-position: 150% 0; }
          15%  { background-position: -50% 0; }
          100% { background-position: -50% 0; }
        }

        /* === musa ↔ touch morph (screen 5) ===
           11s super-cycle = two shimmer sweeps. Each sweep transforms one word
           into the other: sweep 1 musa→touch, sweep 2 touch→musa.
           The crossfade happens during the bright shimmer band's pass (3-9% of
           each shimmer cycle, which is 1.5-5% of the super-cycle). */
        .musa-morph {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 12px;
        }
        .musa-morph .musa-word-musa,
        .musa-morph .musa-word-touch {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          text-align: center;
          white-space: nowrap;
        }
        .musa-morph .musa-word-musa {
          animation: morphMusa 11s linear infinite;
        }
        .musa-morph .musa-word-touch {
          animation: morphTouch 11s linear infinite;
        }
        @keyframes morphMusa {
          0%, 4%   { opacity: 1; }   /* musa visible at start */
          6%       { opacity: 0; }   /* swap to touch under shimmer band */
          50%, 54% { opacity: 0; }   /* touch is showing */
          56%      { opacity: 1; }   /* swap back to musa under second shimmer */
          100%     { opacity: 1; }
        }
        @keyframes morphTouch {
          0%, 4%   { opacity: 0; }
          6%       { opacity: 1; }
          50%, 54% { opacity: 1; }
          56%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        /* Shimmer sweeps — slightly different cycle than the word morph
           so the bright band passes during each transformation moment.
           Each shimmer is 5.5s; two shimmers = 11s super-cycle. */
        .musa-morph .musa-logo-shimmer:not(.musa-shimmer-touch) {
          animation: musaLogoShimmer 11s linear infinite;
        }
        .musa-morph .musa-shimmer-touch {
          animation: musaShimmerTouchAlt 11s linear infinite;
        }
        @keyframes musaShimmerTouchAlt {
          0%   { background-position: 150% 0; opacity: 0; }
          50%  { background-position: 150% 0; opacity: 1; }
          57%  { background-position: -50% 0; opacity: 1; }
          100% { background-position: -50% 0; opacity: 0; }
        }

        /* === Tier columns (screen 4) — base + bonus stacked vertically === */
        .tier-bonus,
        .tier-base {
          transition: height 1.4s cubic-bezier(0.34, 1.25, 0.64, 1);
        }
        @keyframes tierBonusShine {
          0%, 100% {
            box-shadow: 0 0 16px rgba(201,169,97,0.5);
          }
          50% {
            box-shadow: 0 0 28px rgba(201,169,97,0.75);
          }
        }
        .tier-bonus {
          animation: tierBonusShine 3.6s ease-in-out infinite;
        }
        @keyframes tierPctShine {
          0%, 100% {
            text-shadow: 0 0 12px rgba(201,169,97,0.6), 0 0 24px rgba(201,169,97,0.3);
          }
          50% {
            text-shadow: 0 0 18px rgba(201,169,97,0.85), 0 0 36px rgba(201,169,97,0.45);
          }
        }
        .tier-pct {
          animation: tierPctShine 3.6s ease-in-out infinite;
        }

        /* === Snap-screen button — drifts in when its screen becomes active.
           Each screen has its own button instance; only the active one is visible. */
        .snap-button {
          transition: transform 0.7s cubic-bezier(0.34, 1.25, 0.64, 1),
                      opacity 0.5s ease-out;
        }
        .snap-button-hidden {
          transform: translateY(80px);
          opacity: 0;
          pointer-events: none;
        }
        .snap-button-in {
          transform: translateY(0);
          opacity: 1;
        }

        /* === Lore text — drifts up into position when its screen is active === */
        .float-lore-q,
        .float-lore-a {
          transition: transform 0.9s cubic-bezier(0.34, 1.25, 0.64, 1),
                      opacity 0.6s ease-out;
        }
        .float-lore-q { transition-delay: 0.10s; }
        .float-lore-a { transition-delay: 0.22s; }
        /* Inactive (waiting) state */
        .float-lore-q,
        .float-lore-a {
          transform: translateY(40px);
          opacity: 0;
        }
        /* Active state */
        .floated-lore-q,
        .floated-lore-a {
          transform: translateY(0);
          opacity: 1;
        }

        /* === Radar pulse — multiple fixed-size rings, each fades in/out in a
           wave sequence. No transform scaling (which wasn't working). Each ring
           is a different fixed size, and they pulse opacity at staggered delays
           so they appear to emanate from the center outward. */
        @keyframes radarRingFade {
          0%   { opacity: 0; }
          10%  { opacity: 0.7; }
          60%  { opacity: 0.2; }
          100% { opacity: 0; }
        }
        @keyframes radarCenterPulse {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.35; }
        }
        .radar-stage {
          width: 0;
          height: 0;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.7s ease-out;
        }
        .radar-stage.radar-on {
          opacity: 1;
        }
        .radar-center {
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 4px;
          margin-left: -2px;
          margin-top: -2px;
          border-radius: 50%;
          background: rgba(201,169,97,0.5);
          animation: radarCenterPulse 2.5s ease-in-out infinite;
        }
        .radar-ring {
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(201,169,97,0.7);
          opacity: 0;
          /* Each ring: 6s cycle, opacity fades in/out. Delays staggered so
             smaller rings start first (closer to "source"), larger ones follow. */
          animation: radarRingFade 6s cubic-bezier(0.22, 0.6, 0.36, 1) infinite;
        }
        .p1  { left: 8%;  animation-delay: 0s;    }
        .p2  { left: 17%; animation-delay: -2.1s; width: 1.5px; height: 1.5px; opacity: 0.7; }
        .p3  { left: 26%; animation-delay: -4.4s; }
        .p4  { left: 34%; animation-delay: -6.8s; width: 2.5px; height: 2.5px; }
        .p5  { left: 43%; animation-delay: -1.2s; width: 1.5px; height: 1.5px; opacity: 0.8; }
        .p6  { left: 52%; animation-delay: -3.7s; }
        .p7  { left: 60%; animation-delay: -5.9s; width: 2.5px; height: 2.5px; }
        .p8  { left: 68%; animation-delay: -7.6s; width: 1.5px; height: 1.5px; opacity: 0.75; }
        .p9  { left: 76%; animation-delay: -0.8s; }
        .p10 { left: 84%; animation-delay: -3.2s; width: 1.5px; height: 1.5px; opacity: 0.8; }
        .p11 { left: 91%; animation-delay: -5.4s; }
        /* Extra positions for denser onboarding field */
        .p12 { left: 4%;  animation-delay: -1.6s; width: 1.5px; height: 1.5px; opacity: 0.75; }
        .p13 { left: 12%; animation-delay: -5.3s; width: 2.5px; height: 2.5px; }
        .p14 { left: 21%; animation-delay: -8.2s; }
        .p15 { left: 30%; animation-delay: -0.4s; width: 1.5px; height: 1.5px; opacity: 0.7; }
        .p16 { left: 38%; animation-delay: -3.1s; }
        .p17 { left: 47%; animation-delay: -7.2s; width: 2.5px; height: 2.5px; }
        .p18 { left: 56%; animation-delay: -2.6s; width: 1.5px; height: 1.5px; opacity: 0.8; }
        .p19 { left: 64%; animation-delay: -6.0s; }
        .p20 { left: 72%; animation-delay: -1.9s; width: 1.5px; height: 1.5px; opacity: 0.75; }
        .p21 { left: 80%; animation-delay: -8.6s; }
        .p22 { left: 88%; animation-delay: -4.7s; width: 2.5px; height: 2.5px; }
        .p23 { left: 96%; animation-delay: -2.3s; width: 1.5px; height: 1.5px; opacity: 0.7; }

        /* === Ambient: construction === */
        @keyframes surveyBreath {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.45; }
        }
        @keyframes radarPulse {
          0%   { transform: scale(0.15); opacity: 0; }
          15%  { opacity: 0.9; }
          100% { transform: scale(1); opacity: 0; }
        }
        .ambient-sweep {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          border-radius: inherit;
        }
        .ambient-sweep::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(201,169,97,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,169,97,0.05) 1px, transparent 1px);
          background-size: 22px 22px;
          mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8), transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8), transparent 75%);
          animation: surveyBreath 6s ease-in-out infinite;
        }
        .radar {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 56px;
          height: 56px;
          margin-left: -28px;
          margin-top: -28px;
          pointer-events: none;
        }
        .radar-lg {
          width: 120px;
          height: 120px;
          margin-left: -60px;
          margin-top: -60px;
        }
        .radar-lg .radar-ring {
          animation-duration: 5.5s;
        }
        .radar-lg .radar-ring-2 { animation-delay: -1.85s; }
        .radar-lg .radar-ring-3 { animation-delay: -3.7s; }
        .radar-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1px solid var(--gold);
          animation: radarPulse 4.5s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .radar-ring-2 { animation-delay: -1.5s; }
        .radar-ring-3 { animation-delay: -3.0s; }
        .radar-core {
          position: absolute;
          left: 50%; top: 50%;
          width: 4px; height: 4px;
          margin-left: -2px; margin-top: -2px;
          border-radius: 9999px;
          background: var(--gold);
          box-shadow: 0 0 6px rgba(201,169,97,0.8);
          opacity: 0.7;
        }

        /* Ambient breath on the surface colour itself */
        @keyframes surfaceBreath {
          0%, 100% { background-color: #161513; }
          50%      { background-color: #1a1815; }
        }
        .surface-breath {
          animation: surfaceBreath 6s ease-in-out infinite;
        }

        /* === Completed unit card — solid gold ingot with shimmer === */
        .unit-card-complete {
          background: linear-gradient(135deg, #d4b06a 0%, #e8cc8a 35%, #c9a961 70%, #a98942 100%);
          border-color: rgba(232, 204, 138, 0.6);
          box-shadow:
            0 0 24px rgba(201,169,97,0.25),
            inset 0 1px 0 rgba(255,255,255,0.25),
            inset 0 -1px 0 rgba(0,0,0,0.15);
        }
        .unit-card-complete-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255, 250, 230, 0.6) 48%,
            rgba(255, 255, 255, 0.85) 50%,
            rgba(255, 250, 230, 0.6) 52%,
            transparent 70%
          );
          background-size: 250% 100%;
          background-position: 150% 0;
          animation: unitCompleteShimmer 4.5s ease-in-out infinite;
          mix-blend-mode: overlay;
        }
        @keyframes unitCompleteShimmer {
          0%   { background-position: 150% 0; }
          25%  { background-position: -50% 0; }
          100% { background-position: -50% 0; }
        }

        /* === Safe and sound (screen 6) — entire screen as gold ingot ===
           The gold background lives on an inner layer (.vault-screen-bg)
           that slides up from below when the screen activates, with a small
           delay. This keeps it from peeking through the snap-scroll seam
           on the previous screen, AND adds a satisfying entrance reveal. */
        .vault-screen {
          color: #1a1208;
          /* Container stays transparent — only the inner bg layer carries gold */
        }
        .vault-screen-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #d4b06a 0%, #e8cc8a 35%, #c9a961 70%, #a98942 100%);
          transform: translateY(100%);
          transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.18s;
          z-index: 0;
        }
        .vault-screen-bg-in {
          transform: translateY(0);
        }
        .vault-screen-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255, 250, 230, 0.5) 48%,
            rgba(255, 255, 255, 0.7) 50%,
            rgba(255, 250, 230, 0.5) 52%,
            transparent 70%
          );
          background-size: 250% 100%;
          background-position: 150% 0;
          mix-blend-mode: overlay;
        }
        .vault-screen-shimmer-on {
          animation: vaultScreenShimmer 7s ease-in-out infinite 0.9s;
        }
        @keyframes vaultScreenShimmer {
          0%   { background-position: 150% 0; }
          25%  { background-position: -50% 0; }
          100% { background-position: -50% 0; }
        }

        /* Shield pop-in — fires when screen 6 (safe-and-sound) becomes active.
           Subtle scale-from-small + opacity fade with elastic curve so it
           feels like a stamp pressing onto the bar. */
        .vault-shield {
          opacity: 0;
          transform: scale(0.5);
        }
        .vault-shield-on {
          animation: shieldPopIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 1.05s forwards;
        }
        @keyframes shieldPopIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }

        /* Checkmark draws after the shield lands */
        .vault-shield-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
        }
        .vault-shield-on .vault-shield-check {
          animation: shieldCheckDraw 0.5s cubic-bezier(0.4, 0.6, 0.3, 1) 1.75s forwards;
        }
        @keyframes shieldCheckDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      {/* Phone frame */}
      <div className="relative" style={{ width: '390px', height: '844px', maxHeight: '95vh' }}>
        <div
          className="absolute inset-0 rounded-[44px] overflow-hidden phone-frame flex flex-col"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          {/* === Dev Strip — hidden, opened via settings button on home === */}
          {devOpen && (
            <>
              {/* Backdrop catches taps outside the strip to dismiss */}
              <div
                className="absolute inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.4)' }}
                onClick={() => setDevOpen(false)}
              />
              <div className="absolute top-0 left-0 right-0 z-50 anim-slide-down">
                <DevStrip
                  timeMult={timeMult}
                  setTimeMult={setTimeMult}
                  simTime={simTime}
                  onReset={resetAll}
                  goldUnit={goldUnit}
                  setGoldUnit={setGoldUnit}
                  goldPrice={goldPrice}
                  priceSource={priceSource}
                />
              </div>
            </>
          )}

          {/* Screen content */}
          <div className="flex-1 relative overflow-hidden">
            {screen === 'onboarding' && (
              <OnboardingScreen key="onboarding" onContinue={() => setScreen('home')} />
            )}
            {screen === 'home' && (
              <HomeScreen
                key="home"
                units={visibleUnits}
                totals={totals}
                recentlyPurchased={recentlyPurchased}
                onBuy={() => setScreen('browse')}
                onHome={() => setScreen('onboarding')}
                onSettings={() => setDevOpen(v => !v)}
                onUnit={(id) => { setSelectedUnitId(id); setScreen('unitDetail'); }}
              />
            )}
            {screen === 'browse' && (
              <BrowseScreen
                key="browse"
                onBack={() => setScreen('home')}
                onHome={() => setScreen('onboarding')}
                onSelect={(tierId) => { setSelectedTier(tierId); setScreen('buy'); }}
              />
            )}
            {screen === 'buy' && selectedTier && (
              <BuyScreen
                key="buy"
                tierId={selectedTier}
                amount={selectedAmount}
                setAmount={setSelectedAmount}
                onBack={() => setScreen('browse')}
                onHome={() => setScreen('onboarding')}
                onConfirm={() => startBuy(selectedTier, selectedAmount)}
              />
            )}
            {screen === 'unitDetail' && selectedUnit && (
              <UnitDetailScreen
                key={`unitDetail-${selectedUnitId}`}
                unit={selectedUnit}
                onBack={() => setScreen('home')}
                onHome={() => setScreen('onboarding')}
                onExit={() => setScreen('exit')}
              />
            )}
            {screen === 'exit' && selectedUnit && (
              <ExitScreen
                key="exit"
                unit={selectedUnit}
                onBack={() => setScreen('unitDetail')}
                onHome={() => setScreen('onboarding')}
                onConfirm={() => exitUnit(selectedUnitId)}
              />
            )}

            {creating && <CreationOverlay tierId={creating.tierId} amount={creating.amount} />}
            {celebratingUnit && (
              <CelebrationOverlay
                unit={celebratingUnit}
                onDismiss={() => setCelebratingUnit(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </GoldContext.Provider>
  );
}

// === Ambient Radar (construction) ===
function Radar({ large = false }) {
  return (
    <div className={`radar${large ? ' radar-lg' : ''}`}>
      <span className="radar-ring" />
      <span className="radar-ring radar-ring-2" />
      <span className="radar-ring radar-ring-3" />
      <span className="radar-core" />
    </div>
  );
}

// === Ambient Particles Component ===
function Particles({ large = false }) {
  const cls = `particle${large ? ' particle-lg' : ''}`;
  return (
    <div className="ambient-particles">
      <span className={`${cls} p1`} />
      <span className={`${cls} p2`} />
      <span className={`${cls} p3`} />
      <span className={`${cls} p4`} />
      <span className={`${cls} p5`} />
      <span className={`${cls} p6`} />
      <span className={`${cls} p7`} />
      <span className={`${cls} p8`} />
      <span className={`${cls} p9`} />
      <span className={`${cls} p10`} />
      <span className={`${cls} p11`} />
    </div>
  );
}

// === Dev Strip ===
function DevStrip({ timeMult, setTimeMult, simTime, onReset, goldUnit, setGoldUnit, goldPrice, priceSource }) {
  return (
    <div
      className="flex-shrink-0 px-3 pt-2 pb-2 flex items-center gap-1.5 border-b border-app"
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center gap-0.5">
        {TIME_SPEEDS.map(s => (
          <button
            key={s.label}
            onClick={() => setTimeMult(s.mult)}
            className={`press-soft h-6 px-2 rounded-full text-[9px] font-num border ${
              timeMult === s.mult
                ? 'bg-gold text-black border-gold'
                : 'border-app text-dim'
            }`}
            style={{ minWidth: '32px' }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      {/* Gold price dot + value */}
      <div
        className="flex items-center gap-1 text-[9px] font-num px-1.5 whitespace-nowrap"
        title={priceSource === 'live' ? 'Live from CoinGecko PAXG' : priceSource === 'failed' ? 'Live fetch failed, using default' : 'Default price'}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: priceSource === 'live' ? 'var(--gold)' : 'var(--text-dim)' }}
        />
        <span className="text-gold">
          {goldUnit === 'oz'
            ? `$${(goldPrice * GRAMS_PER_TROY_OZ).toFixed(0)}/oz`
            : `$${goldPrice.toFixed(0)}/g`}
        </span>
      </div>
      {/* g / oz toggle */}
      <div className="h-6 rounded-full border border-app flex items-center overflow-hidden">
        <button
          onClick={() => setGoldUnit('g')}
          className={`h-full px-1.5 text-[9px] font-num ${goldUnit === 'g' ? 'bg-gold text-black' : 'text-dim'}`}
        >
          g
        </button>
        <button
          onClick={() => setGoldUnit('oz')}
          className={`h-full px-1.5 text-[9px] font-num ${goldUnit === 'oz' ? 'bg-gold text-black' : 'text-dim'}`}
        >
          oz
        </button>
      </div>
      <button
        onClick={onReset}
        className="press w-6 h-6 rounded-full border border-app flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        title="Reset"
      >
        <RotateCcw size={10} className="text-dim" />
      </button>
    </div>
  );
}

// === Creation Overlay ===
function CreationOverlay({ tierId, amount }) {
  const tier = TIERS[tierId];
  const { price, unit: goldUnit } = useGold();
  const grams = (amount * (1 + tier.discount)) / price;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center creation-overlay"
      style={{ background: 'rgba(10, 9, 8, 0.96)' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 dot-grid creation-grid" />

      {/* Scan line */}
      <div className="creation-scan" />

      {/* Expanding rings */}
      <div className="creation-ring creation-ring-1" />
      <div className="creation-ring creation-ring-2" />
      <div className="creation-ring creation-ring-3" />

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        <div className="creation-core flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-full border border-gold flex items-center justify-center mb-6"
            style={{ background: 'rgba(201,169,97,0.08)', boxShadow: '0 0 30px rgba(201,169,97,0.35)' }}
          >
            <div className="w-2 h-2 rounded-full bg-gold pulse-gold" />
          </div>
        </div>
        <div className="creation-text text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">Initializing</div>
          <div className="font-display text-app text-3xl" style={{ fontWeight: 300 }}>
            {tier.name}
          </div>
          <div className="text-[11px] font-num text-dim mt-2">
            {formatGold(grams, goldUnit)}{goldUnitLabel(goldUnit)} committed
          </div>
        </div>
      </div>
    </div>
  );
}

// === Celebration Overlay ===
// Shown when a unit finishes delivering. Minimal, understated, auto-dismisses.
function CelebrationOverlay({ unit, onDismiss }) {
  const tier = TIERS[unit.tier];
  const { unit: goldUnit } = useGold();

  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center celebration-overlay"
      style={{ background: 'rgba(10, 9, 8, 0.97)' }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 dot-grid celebration-grid" />

      {/* Outward expanding rings — like the creation overlay but gentler */}
      <div className="celebration-ring celebration-ring-1" />
      <div className="celebration-ring celebration-ring-2" />
      <div className="celebration-ring celebration-ring-3" />

      <div className="relative flex flex-col items-center celebration-text">
        <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Delivered</div>
        <div
          className="font-display italic text-gold text-center mb-2"
          style={{ fontWeight: 400, fontSize: '56px', lineHeight: '1' }}
        >
          {tier.name}
        </div>
        <div
          className="font-display font-num text-app mt-6"
          style={{ fontWeight: 300, fontSize: '42px', lineHeight: '1' }}
        >
          {formatGold(unit.gramsTotal, goldUnit)}
          <span className="text-xl text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>
            {goldUnitLabel(goldUnit)}
          </span>
        </div>
        <div className="text-[11px] text-dim font-num mt-4">
          complete · yours to keep
        </div>
        <div className="text-[9px] text-dim mt-8 opacity-60">
          tap to dismiss
        </div>
      </div>
    </div>
  );
}

// === Screens ===

function MusaLogo({ onClick, className = '' }) {
  const logo = (
    <div className={`text-[10px] uppercase tracking-[0.4em] musa-logo ${className}`}>
      <span className="musa-logo-text">musa</span>
      <span className="musa-logo-shimmer">musa</span>
    </div>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go home"
        style={{
          padding: '14px 20px',
          margin: '-14px -20px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        {logo}
      </button>
    );
  }
  return logo;
}

function OnboardingScreen({ onContinue }) {
  // Splash state
  const [splashActive, setSplashActive] = useState(true);

  // Active screen index — 0 (Mine real gold), 1 (lore), 2 (better than money)
  // Drives drift-in animations on text and button per screen.
  const [activeScreen, setActiveScreen] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSplashActive(false), 3200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      // Determine active screen by which third of the scroll content is at the top.
      // Each screen is one viewport (clientHeight) tall.
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveScreen(Math.max(0, Math.min(6, idx)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Backwards-compat for lore drift on screen 2
  const contentFloated = activeScreen >= 1;

  // Singularity glow — ref used to pulse the glow on each "eat" event
  // (a vortex particle reaching the center). Driven below by setTimeout
  // chain with randomized intervals averaging ~2 events/sec. On each eat
  // we also increment eatCount, which drives the arc + fill cycle —
  // each eat advances the arcs one step and punches the fill.
  const singularityRef = useRef(null);
  const fillRef = useRef(null);

  // Arc pulse counter + physics detector are defined below, after
  // connectVortex is declared (they depend on it).


  // Particles — generated once, stable positions. Each particle has:
  // - left, bottom: position as percentages
  // - size, opacity, delay for visual variety
  const firstViewportParticles = useMemo(() => {
    const particles = [];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 14; i++) {
      const left = rand() * 100;
      const bottom = rand() * 35;
      const delay = -rand() * 12;
      const sizeRoll = rand();
      const size = sizeRoll < 0.5 ? 1 : sizeRoll < 0.85 ? 1.5 : 2;
      const opacity = 0.4 + rand() * 0.4;
      particles.push({ left, bottom, delay, size, opacity, id: `fv${i}` });
    }
    return particles;
  }, []);

  const loreParticles = useMemo(() => {
    const particles = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 18; i++) {
      const left = rand() * 100;
      const bottom = rand() * 100;
      const delay = -rand() * 12;
      const sizeRoll = rand();
      const size = sizeRoll < 0.5 ? 1 : sizeRoll < 0.85 ? 1.5 : 2;
      const opacity = 0.4 + rand() * 0.4;
      particles.push({ left, bottom, delay, size, opacity, id: `l${i}` });
    }
    return particles;
  }, []);

  // Rising river of particles for connect-the-dots — flows bottom → top
  // across the full screen at a slow stately pace, with light per-particle
  // duration variance for texture (no synchronized waves). Each particle
  // also has slight horizontal drift for organic feel.
  const connectParticles = useMemo(() => {
    const particles = [];
    let seed = 13;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const COUNT = 400;
    for (let i = 0; i < COUNT; i++) {
      // River flows AROUND the circle's gravitational zone.
      // The circle sits near center horizontally, ~65-75% down the screen.
      // 80% of particles spawn in the outer gutters (left 0-32% or right 68-100%),
      // 20% in the central 32-68% band but only at the top/bottom edges.
      let left;
      const zoneRoll = rand();
      if (zoneRoll < 0.45) {
        // Left gutter
        left = rand() * 32;
      } else if (zoneRoll < 0.9) {
        // Right gutter
        left = 68 + rand() * 32;
      } else {
        // Occasional center particles for texture — but they'll be small/dim
        // so they don't visually intrude on the vortex area
        left = 32 + rand() * 36;
      }
      // Each particle has its own duration 12–20s for slow stately rise
      const dur = 12 + rand() * 8;
      // Negative delay so the river is fully populated at t=0
      const delay = -rand() * dur;
      // Depth-tiered sizes — most particles are tiny background depth,
      // some mid, a few bright foreground. Creates 3D feel.
      const sizeRoll = rand();
      let size, opacity;
      if (sizeRoll < 0.55) {
        size = 1;
        opacity = 0.2 + rand() * 0.25;
      } else if (sizeRoll < 0.88) {
        size = 1.5;
        opacity = 0.45 + rand() * 0.25;
      } else {
        size = 2;
        opacity = 0.6 + rand() * 0.3;
      }
      // Particles in the central band should be extra dim and small —
      // they're "passing" at a farther depth, not in-plane with the vortex
      if (zoneRoll >= 0.9) {
        size = 1;
        opacity = Math.min(opacity, 0.3);
      }
      // Slight horizontal drift over the rise (-15 to +15px)
      const drift = (rand() - 0.5) * 30;
      particles.push({ left, dur, delay, size, opacity, drift, id: `r${i}` });
    }
    return particles;
  }, []);

  // Vortex particles for connect-the-dots — particles get caught at an
  // outer orbital ring and drift at constant orbital speed through 2-3
  // visible rings, only accelerating sharply on final approach to the
  // singularity. ALL spin same direction (clockwise) so the field reads
  // as one coherent gravitational system.
  const connectVortex = useMemo(() => {
    const particles = [];
    let seed = 91;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const COUNT = 48;
    const STOPS = 22;
    const TOTAL_TURNS = 3.2;
    for (let i = 0; i < COUNT; i++) {
      const startAngle = rand() * Math.PI * 2;
      // Entry radius right at the circle's visible arc boundary.
      const startRadius = 125 + rand() * 15; // 125–140px
      const totalRotation = Math.PI * 2 * TOTAL_TURNS;
      // Longer duration since particles now linger in inner orbit.
      const dur = 24 + rand() * 6; // 24–30s
      const delay = -rand() * dur;
      const sizeRoll = rand();
      const size = sizeRoll < 0.55 ? 1.5 : sizeRoll < 0.88 ? 2 : 2.5;

      // Radius curve — three phases:
      //   0–55%: outer drift, radius shrinks 1.0 → 0.55 (gentle inward)
      //   55–88%: inner orbit, radius shrinks 0.55 → 0.15 (tight circling, visible)
      //   88–100%: final collapse, 0.15 → 0 (quick vanish into singularity)
      const waypoints = [];
      for (let s = 0; s <= STOPS; s++) {
        const t = s / STOPS;
        let radiusMul;
        if (t < 0.55) {
          // Linear outer decay
          radiusMul = 1 - (t / 0.55) * 0.45; // 1.0 → 0.55
        } else if (t < 0.88) {
          // Linear inner decay — slower, lets the particle linger close
          const localT = (t - 0.55) / 0.33; // 0 → 1
          radiusMul = 0.55 - localT * 0.40; // 0.55 → 0.15
        } else {
          // Sharp final collapse
          const localT = (t - 0.88) / 0.12;
          radiusMul = 0.15 * (1 - Math.pow(localT, 1.8));
        }
        const radius = startRadius * radiusMul;
        const angle = startAngle + totalRotation * t;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        waypoints.push({ pct: t * 100, x, y });
      }
      particles.push({ waypoints, dur, delay, size, id: i });
    }
    return particles;
  }, []);

  // Generate per-particle keyframes. Smoother fade choreography:
  // - Particle appears on the outer ring (fade in 0–6%)
  // - Stays visible through the spiral
  // - Fades out + scales down only in final 8% (the singularity)
  const vortexKeyframes = useMemo(() => {
    return connectVortex.map(p => {
      const stops = p.waypoints.map(w => {
        const isLast = w.pct >= 99.99;
        const isFirst = w.pct < 0.01;
        // Scale: starts small (just appearing), grows to full, shrinks at end
        let scale;
        if (isFirst) scale = 0.4;
        else if (isLast) scale = 0.15;
        else if (w.pct >= 92) scale = 0.5;
        else scale = 1;
        // Opacity: fade in at start, hold, fade out at end
        let opacity;
        if (isFirst) opacity = 0;
        else if (w.pct < 6) opacity = 0.6;
        else if (w.pct < 92) opacity = 0.9;
        else if (w.pct < 99) opacity = 0.4;
        else opacity = 0;
        return `${w.pct.toFixed(2)}% { transform: translate(${w.x.toFixed(1)}px, ${w.y.toFixed(1)}px) scale(${scale}); opacity: ${opacity}; }`;
      }).join(' ');
      return `@keyframes vortex${p.id} { ${stops} }`;
    }).join('\n');
  }, [connectVortex]);

  // Arc pulse counter — incremented on each eat event. Used as React key
  // to force the arc animations to restart, so each bite triggers a fresh
  // full-circle draw (grey then gold), then fade.
  const [arcPulse, setArcPulse] = useState(0);

  // Mount timestamp — reference point for deriving live particle positions
  // from their CSS animation delays/durations.
  const mountTimeRef = useRef(performance.now() / 1000);

  // Physics-driven eat detector: runs a requestAnimationFrame loop while
  // the connect-the-dots screen is active. Tracks which particles are
  // inside the capture radius; each new entry (a particle crossing IN)
  // increments a counter. When the counter hits EAT_EVERY, fire an eat
  // event and reset. This creates a steady rhythm tied to actual particle
  // arrivals rather than firing on cluster density.
  useEffect(() => {
    if (activeScreen !== 6) return;

    const CAPTURE_RADIUS = 32;
    const EAT_EVERY = 6;   // fire pulse every N new entries

    let cancelled = false;
    let clearTimer = null;
    let rafId = null;

    // Per-particle "was inside last frame" tracking. Starts all false so
    // the first frame's natural cluster doesn't all fire entries at once.
    // We seed them to whatever their actual current state is (see below).
    const wasInside = new Array(connectVortex.length).fill(false);
    let entryCount = 0;
    let seeded = false;

    const fireEat = () => {
      if (singularityRef.current) {
        singularityRef.current.classList.add('singularity-glow-eat');
      }
      if (fillRef.current) {
        fillRef.current.classList.add('connect-fill-punch');
      }
      setArcPulse(p => p + 1);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        if (cancelled) return;
        if (singularityRef.current) {
          singularityRef.current.classList.remove('singularity-glow-eat');
        }
        if (fillRef.current) {
          fillRef.current.classList.remove('connect-fill-punch');
        }
      }, 180);
    };

    const tick = () => {
      if (cancelled) return;
      const now = performance.now() / 1000;
      const elapsedFromMount = now - mountTimeRef.current;
      const r2 = CAPTURE_RADIUS * CAPTURE_RADIUS;

      for (let i = 0; i < connectVortex.length; i++) {
        const p = connectVortex[i];
        const particleTime = elapsedFromMount - p.delay;
        const progressPct = ((particleTime % p.dur) / p.dur) * 100;
        const wps = p.waypoints;
        let a = wps[0], b = wps[wps.length - 1];
        for (let j = 0; j < wps.length - 1; j++) {
          if (progressPct >= wps[j].pct && progressPct <= wps[j + 1].pct) {
            a = wps[j]; b = wps[j + 1];
            break;
          }
        }
        const span = b.pct - a.pct;
        const localT = span > 0 ? (progressPct - a.pct) / span : 0;
        const x = a.x + (b.x - a.x) * localT;
        const y = a.y + (b.y - a.y) * localT;
        const inside = (x * x + y * y) < r2;

        if (!seeded) {
          // First frame — just record current state without counting entries
          wasInside[i] = inside;
        } else if (inside && !wasInside[i]) {
          // Entry event — particle just crossed into the capture zone
          entryCount++;
          if (entryCount >= EAT_EVERY) {
            fireEat();
            entryCount = 0;
          }
          wasInside[i] = true;
        } else if (!inside && wasInside[i]) {
          // Exit event — just flip the state so the next entry counts
          wasInside[i] = false;
        }
      }
      seeded = true;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (clearTimer) clearTimeout(clearTimer);
      if (singularityRef.current) {
        singularityRef.current.classList.remove('singularity-glow-eat');
      }
      if (fillRef.current) {
        fillRef.current.classList.remove('connect-fill-punch');
      }
    };
  }, [activeScreen, connectVortex]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden scrollable anim-fade"
      style={{
        background: '#0a0908',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
      }}
    >
      {/* === SPLASH OVERLAY === */}
      {splashActive && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 50,
            background: '#0a0908',
            animation: 'splashFadeOut 0.8s ease-out 2.4s forwards',
          }}
        >
          <div className="splash-glow" />
          <div className="splash-dot" />
        </div>
      )}

      {/* === SCREEN 1 — Mine real gold === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        {/* Local particle layer for this section only */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.map(p => (
            <span
              key={p.id}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Content — top-anchored */}
        <div className="relative" style={{ zIndex: 4 }}>
          <div className="flex justify-center mb-8 onboard-label-in">
            <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
              <span className="musa-logo-text">musa</span>
              <span className="musa-logo-shimmer">musa</span>
            </div>
          </div>
          <h1
            className="font-display text-app mb-6 onboard-headline-in"
            style={{ fontWeight: 300, fontSize: '64px', lineHeight: '0.92' }}
          >
            Mine real
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              gold
            </span>
          </h1>
          <p className="text-dim text-sm leading-relaxed max-w-[280px] onboard-subtitle-in">
            Forward purchase contracts on physical gold from working mines. Delivered to your wallet, gram by gram, as it's mined.
          </p>
        </div>

        <div className="flex-1" />

        {/* Button — drifts in when this screen is active */}
        <div className={`pb-8 relative snap-button ${activeScreen === 0 ? 'snap-button-in' : 'snap-button-hidden'}`} style={{ zIndex: 4 }}>
          <button
            onClick={onContinue}
            className="press w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide flex items-center justify-center gap-2"
          >
            Begin
            <ChevronRight size={18} />
          </button>
          <p className="text-center text-[11px] text-dim mt-5">
            Real gold · real mines · delivered
          </p>
        </div>

        {/* Subtle scroll hint */}
        <div className={`scroll-hint ${activeScreen > 0 ? 'hidden' : ''}`}>
          <ChevronDown size={20} strokeWidth={1.25} className="text-app" />
        </div>
      </div>

      {/* === SCREEN 2 — Lore === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        {/* Radar pulse — background layer, anchored at ~68% down the screen.
            Multiple rings at fixed sizes, each fades in at staggered delays
            so the pulse appears to emanate from center outward. */}
        <div
          className={`radar-stage ${activeScreen === 1 ? 'radar-on' : ''}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '68%',
            zIndex: 1,
          }}
        >
          {[
            { size: 80,  delay: 0.0 },
            { size: 180, delay: 0.5 },
            { size: 320, delay: 1.0 },
            { size: 500, delay: 1.5 },
            { size: 720, delay: 2.0 },
            { size: 980, delay: 2.5 },
          ].map((r, i) => (
            <span
              key={i}
              className="radar-ring"
              style={{
                width: `${r.size}px`,
                height: `${r.size}px`,
                marginLeft: `-${r.size / 2}px`,
                marginTop: `-${r.size / 2}px`,
                animationDelay: `${r.delay}s`,
              }}
            />
          ))}
          <span className="radar-center" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {loreParticles.map(p => (
            <span
              key={p.id}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <div className={`text-dim text-[13px] leading-relaxed italic mb-5 font-display float-lore-q ${contentFloated ? 'floated-lore-q' : ''}`} style={{ fontWeight: 300 }}>
            did you know that Musa is claimed to be the richest man in history?
          </div>

          <div className={`text-app text-[13px] leading-relaxed font-display float-lore-a ${contentFloated ? 'floated-lore-a' : ''}`} style={{ fontWeight: 300 }}>
            Ha — yes, Mansa Musa, 14th century emperor of Mali. The one who made his pilgrimage to Mecca in 1324 and distributed so much gold along the way that he reportedly crashed the price of gold across the entire Mediterranean and Middle East for over a decade. Cairo's economy allegedly didn't recover for 12 years.
          </div>
        </div>

        <div className="flex-1" />

      </div>

      {/* === SCREEN 3 — Better than money === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.slice(0, 10).map(p => (
            <span
              key={`btm-${p.id}`}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            better than
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              money
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed mt-4 font-display italic" style={{ fontWeight: 300 }}>
            $1 in 1971 buys 4¢ of gold today
          </p>
        </div>

        {/* Spacer pushes chart toward center */}
        <div className="flex-1" />

        <div className="relative" style={{ zIndex: 4, height: '180px' }}>
          <svg
            viewBox="0 0 320 160"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Baseline — fades in with the chart */}
            <line
              x1="0" y1="80" x2="320" y2="80"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="2 4"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.6s ease-out 0.0s',
              }}
            />
            {/* Dollar curve — declines, draws second */}
            <path
              d="M 4 36 C 80 50, 140 90, 200 120 S 280 142, 316 148"
              fill="none"
              stroke="rgba(180,180,170,0.4)"
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{
                strokeDasharray: 420,
                strokeDashoffset: activeScreen === 2 ? 0 : 420,
                transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.6s',
              }}
            />
            {/* Gold curve — rises, draws first (the hero) */}
            <path
              d="M 4 130 C 80 122, 140 95, 200 60 S 280 22, 316 14"
              fill="none"
              stroke="#C9A961"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                strokeDasharray: 420,
                strokeDashoffset: activeScreen === 2 ? 0 : 420,
                transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.2s',
              }}
            />
            {/* Year markers — fade in last */}
            <text
              x="4" y="158"
              fill="rgba(255,255,255,0.25)"
              fontSize="8"
              fontFamily="'Geist Mono', monospace"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.5s ease-out 1.6s',
              }}
            >1971</text>
            <text
              x="316" y="158"
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize="8"
              fontFamily="'Geist Mono', monospace"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.5s ease-out 1.7s',
              }}
            >2024</text>
          </svg>
        </div>

        {/* Spacer below */}
        <div className="flex-1" />

      </div>

      {/* === SCREEN 4 — From mine to your wallet === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            from mine
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              to your wallet
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed mt-4 font-display italic" style={{ fontWeight: 300 }}>
            directly, gram by gram
          </p>
        </div>

        {/* Grain falling stage — fills remaining vertical space below the header.
            Grains drift down on staggered delays, accumulate into a soft glowing
            pile at the bottom. Animations only run while this screen is active. */}
        <div className={`flex-1 relative mt-6 grains-stage ${activeScreen === 3 ? 'grains-on' : ''}`}>
          {[
            { left: 38, dur: 2.8, delay: 0.0 },
            { left: 52, dur: 3.2, delay: 0.4 },
            { left: 46, dur: 2.6, delay: 0.9 },
            { left: 58, dur: 3.0, delay: 1.3 },
            { left: 42, dur: 2.9, delay: 1.7 },
            { left: 50, dur: 3.4, delay: 2.1 },
            { left: 55, dur: 2.7, delay: 2.5 },
            { left: 44, dur: 3.1, delay: 2.9 },
            { left: 48, dur: 2.8, delay: 3.3 },
            { left: 53, dur: 3.0, delay: 3.7 },
            { left: 41, dur: 2.6, delay: 4.1 },
            { left: 56, dur: 3.2, delay: 4.5 },
          ].map((g, i) => (
            <span
              key={i}
              className="grain"
              style={{
                left: `${g.left}%`,
                animationDelay: `${g.delay}s`,
                ['--dur']: `${g.dur}s`,
              }}
            />
          ))}
          {/* The accumulating pile at the bottom */}
          <div className="grain-pile" />
        </div>

      </div>

      {/* === SCREEN 5 — More than you paid for === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.slice(0, 12).map(p => (
            <span
              key={`s4-${p.id}`}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app mb-4"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            more than
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              you paid for
            </span>
          </h2>

          <p className="text-dim text-[13px] leading-relaxed font-display italic" style={{ fontWeight: 300 }}>
            lock longer for better
          </p>
        </div>

        {/* Spacer pushes bars to vertical center */}
        <div className="flex-1" />

        {/* Tier columns — truly proportional bonuses (literal % of base) */}
        <div className="relative flex items-end justify-around gap-6" style={{ zIndex: 4, height: '320px' }}>
          {[
            { pct: 2.5,  months: 6,  delay: 0.05 },
            { pct: 7,    months: 12, delay: 0.18 },
            { pct: 18.8, months: 24, delay: 0.34 },
          ].map((tier, i) => {
            const baseHeight = 240;
            const bonusHeight = baseHeight * (tier.pct / 100);
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: '22%' }}>
                {/* Percentage label — floats above the bonus segment */}
                <div
                  className="text-gold font-num mb-2 tier-pct"
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    textShadow: '0 0 12px rgba(201,169,97,0.6), 0 0 24px rgba(201,169,97,0.3)',
                    opacity: activeScreen === 4 ? 1 : 0,
                    transition: `opacity 0.5s ease-out ${tier.delay + 0.6}s`,
                  }}
                >
                  +{tier.pct}%
                </div>
                {/* Bonus segment — bright gold, proportional to base */}
                <div
                  className="w-full rounded-t-md tier-bonus"
                  style={{
                    background: 'linear-gradient(180deg, #E4C57E, #C9A961)',
                    boxShadow: '0 0 16px rgba(201,169,97,0.5)',
                    height: activeScreen === 4 ? `${bonusHeight}px` : '0px',
                    transitionDelay: `${tier.delay}s`,
                  }}
                />
                {/* Tiny gap separating bonus from base */}
                <div style={{ height: '3px' }} />
                {/* Base segment — uniform 240px across all three, dimmer */}
                <div
                  className="w-full rounded-b-md tier-base"
                  style={{
                    background: 'rgba(201,169,97,0.18)',
                    border: '1px solid rgba(201,169,97,0.25)',
                    height: activeScreen === 4 ? `${baseHeight}px` : '0px',
                    transitionDelay: `${tier.delay + 0.05}s`,
                  }}
                />
                {/* Month label — sits below the column */}
                <div
                  className="text-dim font-num mt-3"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    opacity: activeScreen === 4 ? 0.7 : 0,
                    transition: `opacity 0.5s ease-out ${tier.delay + 0.7}s`,
                  }}
                >
                  {tier.months} mo
                </div>
              </div>
            );
          })}
        </div>

        {/* Spacer below */}
        <div className="flex-1" />

      </div>

      {/* === SCREEN 6 — Safe and sound (the gold-ingot screen) ===
          The whole screen IS a gold bar. Inverted palette: warm black-brown
          text on solid gold gradient. The gold layer slides up from below
          when the screen activates (preventing seam-bleed onto the previous
          dark screen and adding a satisfying reveal). A slow shimmer drifts
          across the surface every 7s. Small institutional marks reinforce
          the feeling of certified, custodied, real gold. */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden vault-screen"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        {/* Animated gold background layer — slides up from below on activation */}
        <div className={`vault-screen-bg ${activeScreen === 5 ? 'vault-screen-bg-in' : ''}`} />
        {/* Top assay mark — small institutional signature */}
        <div className="relative" style={{ zIndex: 4 }}>
          <div
            className="font-num text-[10px] tracking-[0.25em] mb-8"
            style={{ color: 'rgba(26, 18, 8, 0.55)' }}
          >
            AU · 999.9 FINE
          </div>

          <h2
            className="font-display"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95', color: '#1a1208' }}
          >
            safe
            <br />
            <span className="italic" style={{ fontWeight: 400, color: 'rgba(255, 250, 230, 0.95)' }}>
              and sound
            </span>
          </h2>
          <p
            className="text-[13px] leading-relaxed mt-4 font-display italic"
            style={{ fontWeight: 300, color: 'rgba(26, 18, 8, 0.7)' }}
          >
            audited custody, yours to claim, anytime
          </p>
        </div>

        {/* Spacer above the shield */}
        <div className="flex-1" />

        {/* Shield icon — pops in after the screen lands, then the
            checkmark draws itself. Banking-style trust mark in deep
            brown-black so it reads as part of the bar. */}
        <div className="relative flex items-center justify-center" style={{ zIndex: 4 }}>
          <div className={`vault-shield ${activeScreen === 5 ? 'vault-shield-on' : ''}`}>
            <svg
              width="92"
              height="92"
              viewBox="0 0 92 92"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block', opacity: 0.78 }}
            >
              {/* Shield outline — classic heater shield shape */}
              <path
                d="M46 8 C 46 8, 28 14, 14 14 C 14 14, 12 50, 24 66 C 34 79, 46 84, 46 84 C 46 84, 58 79, 68 66 C 80 50, 78 14, 78 14 C 64 14, 46 8, 46 8 Z"
                fill="none"
                stroke="#1a1208"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Inner checkmark — draws after shield lands */}
              <path
                className="vault-shield-check"
                d="M 32 46 L 42 56 L 62 36"
                fill="none"
                stroke="#1a1208"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Spacer below shield */}
        <div className="flex-1" />

        {/* The shimmer — slow diagonal sweep across the entire screen.
            Only animates when this screen is active so it doesn't waste cycles. */}
        <div className={`vault-screen-shimmer ${activeScreen === 5 ? 'vault-screen-shimmer-on' : ''}`} />
      </div>

      {/* === SCREEN 7 — Connect the dots (how it works) === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {connectParticles.map(p => (
            <span
              key={p.id}
              className="particle-river"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                ['--drift-x']: `${p.drift}px`,
                ['--pop']: p.opacity,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app mb-3"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            connect
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              the dots
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed font-display italic" style={{ fontWeight: 300 }}>
            touch the musa
          </p>
        </div>

        {/* Tappable circle diagram — user (top) and miners (bottom).
            The circle IS the call to action. */}
        <div className="relative flex-1 flex items-center justify-center" style={{ zIndex: 3 }}>
          {/* Vortex particle field — fills the container, particles spiral
              from outer edges into the circle's center along true multi-
              waypoint spiral paths. Each particle has its own @keyframes
              block defined in vortexKeyframes (injected just below). */}
          <style>{vortexKeyframes}</style>
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <div className="relative" style={{ width: 0, height: 0 }}>
              {connectVortex.map(p => (
                <span
                  key={p.id}
                  className="particle-vortex"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    marginLeft: `-${p.size / 2}px`,
                    marginTop: `-${p.size / 2}px`,
                    animationName: `vortex${p.id}`,
                    animationDuration: `${p.dur}s`,
                    animationDelay: `${p.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onContinue}
            className="press relative bg-transparent border-0 p-0"
            style={{ width: '220px', height: '220px', cursor: 'pointer' }}
            aria-label="Begin"
          >
            {/* Soft fill — JS-driven. Dim baseline when screen active,
                punches brighter on each eat event (adds .connect-fill-punch). */}
            <div
              ref={fillRef}
              className={`connect-fill ${activeScreen === 6 ? 'connect-fill-on' : ''}`}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '200px', height: '200px',
                marginLeft: '-100px', marginTop: '-100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,169,97,0.78) 0%, rgba(201,169,97,0.5) 32%, rgba(201,169,97,0.24) 58%, rgba(201,169,97,0.08) 78%, transparent 90%)',
                filter: 'blur(3px)',
              }}
            />
            {/* Singularity — hot pulsing core that consumes the vortex particles.
                Blinks brighter on each "eat" event (driven by scheduler effect). */}
            <div
              ref={singularityRef}
              className={`singularity-glow ${activeScreen === 6 ? 'singularity-glow-on' : ''}`}
            />
            {/* SVG arcs — each eat restarts the draw via key prop.
                Both arcs draw in parallel (grey right-side, gold left-side)
                for a symmetric full-circle sweep in ~400ms, then fade together. */}
            <svg
              viewBox="0 0 220 220"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
              {/* Grey arc — money flow, user (top) clockwise via right to miners (bottom) */}
              <path
                key={`grey-${arcPulse}`}
                d="M 110 10 A 100 100 0 0 1 110 210"
                fill="none"
                stroke="rgba(180,180,170,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 320,
                  strokeDashoffset: 320,
                  opacity: 0,
                  animation: activeScreen === 6 && arcPulse > 0 ? 'arcFlash 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards' : 'none',
                }}
              />
              {/* Gold arc — gold flow, miners (bottom) counter-clockwise via left back to user (top) */}
              <path
                key={`gold-${arcPulse}`}
                d="M 110 210 A 100 100 0 0 1 110 10"
                fill="none"
                stroke="#C9A961"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 320,
                  strokeDashoffset: 320,
                  opacity: 0,
                  animation: activeScreen === 6 && arcPulse > 0 ? 'arcFlash 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards' : 'none',
                }}
              />
              {/* User dot — top. Flashes brighter + scales up when the
                  grey arc completes its draw (ties to arc arrival). */}
              <circle
                key={`user-${arcPulse}`}
                className="endpoint-user"
                cx="110" cy="10" r="4"
                fill="rgba(232, 218, 188, 0.9)"
                style={{
                  animation: activeScreen === 6 && arcPulse > 0
                    ? 'endpointFlashUser 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              />
              {/* Miners dot — bottom. Flashes on arc arrival. */}
              <circle
                key={`miner-${arcPulse}`}
                className="endpoint-miner"
                cx="110" cy="210" r="4"
                fill="#C9A961"
                style={{
                  animation: activeScreen === 6 && arcPulse > 0
                    ? 'endpointFlashMiner 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              />
            </svg>
            {/* Labels — flash on each arc pulse, timed to arc arrival */}
            <div
              key={`label-user-${arcPulse}`}
              className="font-num text-dim absolute"
              style={{
                top: '-22px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.7,
                animation: activeScreen === 6 && arcPulse > 0
                  ? 'labelFlashUser 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                  : 'none',
              }}
            >
              you
            </div>
            <div
              key={`label-miner-${arcPulse}`}
              className="font-num text-dim absolute"
              style={{
                bottom: '-22px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.7,
                animation: activeScreen === 6 && arcPulse > 0
                  ? 'labelFlashMiner 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                  : 'none',
              }}
            >
              miners
            </div>
            {/* Center logo — morphs between musa and touch under the shimmer sweep.
                Inner wrapper pulses on each arc eat event. */}
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                key={`musa-pulse-${arcPulse}`}
                style={{
                  animation: activeScreen === 6 && arcPulse > 0
                    ? 'musaLogoPulse 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
                  <span className="musa-logo-text">musa</span>
                  <span className="musa-logo-shimmer">musa</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ units, totals, recentlyPurchased, onBuy, onUnit, onHome, onSettings }) {
  const hasUnits = units.length > 0;
  const { unit: goldUnit } = useGold();

  return (
    <div className="h-full flex flex-col anim-fade">
      {/* Header (back to onboarding, musa logo, settings) */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onHome}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-label="Back to start"
        >
          <ArrowLeft size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <button
          onClick={onSettings}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-label="Settings"
        >
          <Settings size={14} className="text-dim" />
        </button>
      </div>

      {/* Hero */}
      <div className="px-6 pt-6 pb-7">
        <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Your gold</div>
        <div
          className="font-display font-num text-app"
          style={{ fontWeight: 300, fontSize: '60px', lineHeight: '1' }}
        >
          {formatGold(totals.totalGrams, goldUnit)}
          <span className="text-2xl text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>{goldUnitLabel(goldUnit)}</span>
        </div>
        <div className="text-sm text-dim font-num mt-3 flex items-center gap-3">
          <span>{formatUSD(totals.totalValueUSD)}</span>
          {totals.pendingGrams > 0.0001 && (
            <>
              <span className="text-dim opacity-40">·</span>
              <span className="text-gold">+{formatGold(totals.pendingGrams, goldUnit, 3)}{goldUnitLabel(goldUnit)} pending</span>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px" style={{ background: 'var(--border)' }} />

      {/* Units */}
      <div className="flex-1 overflow-auto scrollable">
        <div className="px-6 pt-5 pb-36">
          {!hasUnits ? (
            <div className="h-full flex flex-col items-center justify-center text-center pt-16">
              <div
                className="w-14 h-14 rounded-full border border-app flex items-center justify-center mb-5"
                style={{ background: 'rgba(201,169,97,0.05)' }}
              >
                <Sparkles size={18} className="text-gold" />
              </div>
              <div className="font-display text-xl mb-2 text-app" style={{ fontWeight: 400 }}>
                No mines yet
              </div>
              <div className="text-dim text-xs max-w-[220px] leading-relaxed">
                Start your first mine. Pick how long you're willing to wait for your gold.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3 flex items-center justify-between">
                <span>Active mines</span>
                <span className="font-num">{units.length}</span>
              </div>
              {units.map(unit => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onClick={() => onUnit(unit.id)}
                  highlight={unit.id === recentlyPurchased}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-12 pt-14 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg) 50%, rgba(10,9,8,0.85) 80%, transparent)' }}
      >
        <button
          onClick={onBuy}
          className="press pointer-events-auto w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide flex items-center justify-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} />
          New mine
        </button>
      </div>
    </div>
  );
}

function UnitCard({ unit, onClick, highlight }) {
  const { unit: goldUnit } = useGold();
  const tier = TIERS[unit.tier];
  const status = unit.computedStatus;
  const isActive = status === 'active';
  const isConstructing = status === 'constructing';
  const isComplete = status === 'completed';
  const statusLabel = {
    constructing: 'Preparing',
    active: 'Mining',
    completed: 'Complete',
  }[status];

  return (
    <button
      onClick={onClick}
      className={`press-soft relative w-full text-left p-5 rounded-2xl border overflow-hidden ${
        highlight ? 'border-gold gold-glow anim-pop' : isComplete ? 'unit-card-complete' : 'bg-surface border-app'
      } ${isActive || isConstructing ? 'surface-breath' : ''}`}
    >
      {/* Ambient background layer */}
      {isActive && <Particles />}
      {isConstructing && (
        <div className="ambient-sweep">
          <Radar />
        </div>
      )}
      {/* Completed shimmer overlay */}
      {isComplete && <div className="unit-card-complete-shimmer" />}

      <div className="relative flex items-start justify-between mb-4">
        <div>
          <div className={`font-display text-xl flex items-center gap-2 ${isComplete ? 'text-black' : 'text-app'}`} style={{ fontWeight: 400 }}>
            {tier.name}
            {isActive && (
              <span className="relative inline-flex items-center justify-center" style={{ width: '8px', height: '8px' }}>
                <span className="pulse-ring" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-gold" />
              </span>
            )}
          </div>
          <div className={`text-[10px] uppercase tracking-[0.2em] font-num mt-1 ${isComplete ? 'text-black opacity-60' : 'text-dim'}`}>
            {statusLabel} · {tier.lockMonths}mo
          </div>
        </div>
        <div className="text-right">
          <div className={`text-base font-num ${isActive ? 'pulse-gold' : ''} ${isComplete ? 'text-black' : 'text-app'}`}>
            {formatGold(unit.gramsDelivered, goldUnit)}{goldUnitLabel(goldUnit)}
          </div>
          <div className={`text-[10px] font-num mt-0.5 ${isComplete ? 'text-black opacity-50' : 'text-dim'}`}>of {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)}</div>
        </div>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden z-10" style={{ background: isComplete ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.06)' }}>
        <div
          className={`h-full progress-fill relative overflow-hidden ${isComplete ? '' : 'bg-gold'}`}
          style={{
            width: `${isConstructing ? unit.constructionPct * 100 : unit.pctDelivered * 100}%`,
            background: isComplete ? 'rgba(0,0,0,0.5)' : undefined,
          }}
        >
          {(isActive || isConstructing) && <div className="progress-shimmer" />}
        </div>
      </div>
    </button>
  );
}

function BrowseScreen({ onBack, onHome, onSelect }) {
  return (
    <div className="h-full flex flex-col anim-slide-right">
      <div className="px-6 pt-3 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <ArrowLeft size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <div className="w-9" />
      </div>

      <div className="px-6 pt-2 pb-7">
        <h1
          className="font-display text-app"
          style={{ fontWeight: 300, fontSize: '44px', lineHeight: '1' }}
        >
          Pick your
          <br />
          <span className="italic text-gold">mine.</span>
        </h1>
        <p className="text-xs text-dim mt-4 max-w-[280px] leading-relaxed">
          The longer you wait, the more gold you receive per dollar.
        </p>
      </div>

      <div className="flex-1 px-6 space-y-3 overflow-auto scrollable pb-8">
        {Object.values(TIERS).map((tier, i) => (
          <button
            key={tier.id}
            onClick={() => onSelect(tier.id)}
            className="press-soft anim-slide-up w-full text-left p-5 rounded-2xl bg-surface border border-app"
            style={{ animationDelay: `${0.08 + i * 0.08}s` }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="font-display text-app text-2xl" style={{ fontWeight: 400 }}>
                  {tier.name}
                </div>
                <div className="text-[11px] text-dim mt-1">{tier.description}</div>
              </div>
              <ChevronRight size={16} className="text-dim mt-1.5" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-app">
              <Stat label="Lock" value={`${tier.lockMonths} mo`} />
              <Stat label="Discount" value={`${(tier.discount * 100).toFixed(1)}%`} accent />
              <Stat label="Per year" value={`+${(tier.annualized * 100).toFixed(0)}%`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-dim">{label}</div>
      <div className={`text-sm font-num mt-1 ${accent ? 'text-gold' : 'text-app'}`}>{value}</div>
    </div>
  );
}

function BuyScreen({ tierId, amount, setAmount, onBack, onHome, onConfirm }) {
  const tier = TIERS[tierId];
  const { price, unit: goldUnit } = useGold();
  const faceValue = amount * (1 + tier.discount);
  const grams = faceValue / price;
  const dailyGrams = grams / (tier.lockMonths * 30);

  return (
    <div className="h-full flex flex-col anim-slide-right">
      <div className="px-6 pt-3 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <ArrowLeft size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-auto scrollable">
        {/* Tier name + amount on one row to save vertical space */}
        <div className="px-6 pb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-2">
              {tier.lockMonths} month lock
            </div>
            <h1
              className="font-display text-app"
              style={{ fontWeight: 300, fontSize: '44px', lineHeight: '1' }}
            >
              {tier.name}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-2">Amount</div>
            <div
              className="font-display font-num text-app"
              style={{ fontWeight: 300, fontSize: '40px', lineHeight: '1' }}
            >
              ${amount}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`press-soft h-10 rounded-full text-[11px] font-num border ${
                  amount === a
                    ? 'bg-gold text-black border-gold'
                    : 'border-app text-dim'
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-surface border border-app rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">You'll receive</div>
            <div
              className="font-display font-num text-app mb-1"
              style={{ fontWeight: 300, fontSize: '34px', lineHeight: '1' }}
            >
              {formatGold(grams, goldUnit)}
              <span
                className="text-xl text-dim ml-1.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {goldUnitLabel(goldUnit)}
              </span>
            </div>
            <div className="text-xs text-dim font-num">
              {formatUSD(faceValue)} at today's spot
            </div>

            <div className="mt-4 pt-4 border-t border-app space-y-2.5">
              <Row label="Discount on spot" value={`${(tier.discount * 100).toFixed(1)}%`} accent />
              <Row label="Construction" value={`${CONSTRUCTION_DAYS} days`} />
              <Row label="Daily rate" value={`+${formatGold(dailyGrams, goldUnit, 5)}${goldUnitLabel(goldUnit)}`} />
              <Row label="First gold" value={`Day ${CONSTRUCTION_DAYS}`} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pb-12">
        <button
          onClick={onConfirm}
          className="press w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide"
        >
          Buy {tier.name}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-dim">{label}</span>
      <span className={`font-num ${accent ? 'text-gold' : 'text-app'}`}>{value}</span>
    </div>
  );
}

function UnitDetailScreen({ unit, onBack, onHome, onExit }) {
  const tier = TIERS[unit.tier];
  const { price, unit: goldUnit } = useGold();
  const status = unit.computedStatus;
  const isConstructing = status === 'constructing';
  const isActive = status === 'active';
  const isComplete = status === 'completed';
  const dailyRate = unit.gramsTotal / (tier.lockMonths * 30);

  return (
    <div className="h-full flex flex-col anim-slide-right relative">
      {/* Full-screen ambient layer — particles only, construction ambient is inlined in its hero */}
      {isActive && <Particles large />}

      <div className="relative px-6 pt-3 pb-4 flex items-center justify-between">
        <div className="min-w-[60px]">
          <button
            onClick={onBack}
            className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <ArrowLeft size={15} className="text-dim" />
          </button>
        </div>
        <MusaLogo />
        <div className="text-[10px] uppercase tracking-[0.3em] text-dim min-w-[60px] text-right">
          {isConstructing && 'Preparing'}
          {isActive && 'Mining'}
          {isComplete && 'Complete'}
        </div>
      </div>

      <div className="relative px-6 pb-5">
        <h1
          className="font-display text-app flex items-center gap-3"
          style={{ fontWeight: 300, fontSize: '48px', lineHeight: '1' }}
        >
          {tier.name}
          {isActive && (
            <span className="relative inline-flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
              <span className="pulse-ring" />
              <span className="relative w-2 h-2 rounded-full bg-gold" />
            </span>
          )}
        </h1>
      </div>

      <div className="relative px-6 pb-5">
        {isConstructing ? (
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Construction</div>
                <div
                  className="font-display font-num text-app"
                  style={{ fontWeight: 300, fontSize: '52px', lineHeight: '1' }}
                >
                  {Math.ceil(unit.daysToFirstDelivery)}
                  <span
                    className="text-lg text-dim ml-2"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    days
                  </span>
                </div>
                <div className="text-xs text-dim mt-3">until first delivery</div>
              </div>
              <div className="relative" style={{ width: '100px', height: '100px' }}>
                <Radar large />
              </div>
            </div>

            <div className="relative mt-5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full bg-gold progress-fill relative overflow-hidden"
                style={{ width: `${unit.constructionPct * 100}%` }}
              >
                <div className="progress-shimmer" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Mined</div>
            <div
              className={`font-display font-num text-app ${isActive ? 'pulse-gold' : ''}`}
              style={{ fontWeight: 300, fontSize: '60px', lineHeight: '1' }}
            >
              {formatGold(unit.gramsDelivered, goldUnit)}
              <span
                className="text-2xl text-dim ml-2"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {goldUnitLabel(goldUnit)}
              </span>
            </div>
            <div className="text-xs text-dim font-num mt-3">
              of {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)} · {formatUSD(unit.gramsDelivered * price)}
            </div>

            <div className="relative mt-5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full bg-gold progress-fill relative overflow-hidden"
                style={{ width: `${unit.pctDelivered * 100}%` }}
              >
                {isActive && <div className="progress-shimmer" />}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative px-6 pb-5">
        <div className="bg-surface border border-app rounded-2xl p-5 space-y-2.5">
          <Row label="Paid" value={formatUSD(unit.pricePaid)} />
          <Row label="Total gold" value={`${formatGold(unit.gramsTotal, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Lock period" value={`${tier.lockMonths} months`} />
          <Row label="Daily rate" value={`+${formatGold(dailyRate, goldUnit, 5)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Days remaining" value={`${Math.ceil(unit.daysRemaining)}`} />
        </div>
      </div>

      <div className="relative flex-1" />

      {tier.cancellable && isActive && (
        <div className="relative p-6 pb-12">
          <button
            onClick={onExit}
            className="press w-full h-12 rounded-full border border-app text-dim text-xs font-medium tracking-wide"
          >
            Exit early
          </button>
        </div>
      )}

      {isComplete && (
        <div className="relative p-6 pb-12">
          <div className="text-center text-[11px] text-gold uppercase tracking-[0.3em]">
            All gold delivered
          </div>
        </div>
      )}

      {!tier.cancellable && isActive && (
        <div className="relative p-6 pb-12">
          <div className="text-center text-[10px] text-dim">
            Spark mines complete on schedule. No early exit.
          </div>
        </div>
      )}
    </div>
  );
}

function ExitScreen({ unit, onBack, onHome, onConfirm }) {
  const tier = TIERS[unit.tier];
  const { price, unit: goldUnit } = useGold();
  const totalDeliveryDays = tier.lockMonths * 30;
  const pctElapsed = unit.deliveryElapsed ? unit.deliveryElapsed / totalDeliveryDays : 0;
  const penaltyPct = getExitPenaltyPct(pctElapsed);

  const undeliveredGrams = Math.max(0, unit.gramsTotal - unit.gramsDelivered);
  const undeliveredValue = undeliveredGrams * price;
  const refundValue = undeliveredValue * (1 - penaltyPct);
  const refundGrams = refundValue / price;
  const totalReceived = unit.gramsDelivered + refundGrams;

  return (
    <div className="h-full flex flex-col anim-slide-up-big">
      <div className="px-6 pt-3 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <X size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <div className="w-9" />
      </div>

      <div className="px-6 pt-1 pb-7">
        <h1
          className="font-display text-app"
          style={{ fontWeight: 300, fontSize: '48px', lineHeight: '1' }}
        >
          Exit
          <br />
          <span className="italic text-gold">early?</span>
        </h1>
        <p className="text-xs text-dim mt-4 max-w-[280px] leading-relaxed">
          You can close this contract now. A penalty applies on undelivered gold. Already-mined gold stays yours.
        </p>
      </div>

      <div className="px-6 pb-5">
        <div className="bg-surface border border-app rounded-2xl p-5 space-y-3">
          <Row label="Already mined" value={`${formatGold(unit.gramsDelivered, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Undelivered" value={`${formatGold(undeliveredGrams, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Penalty" value={`${(penaltyPct * 100).toFixed(0)}%`} accent />
          <div className="pt-3 mt-1 border-t border-app">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-dim">You receive</span>
              <span className="font-num text-app text-base">{formatGold(totalReceived, goldUnit)}{goldUnitLabel(goldUnit)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="text-[11px] text-dim leading-relaxed">
          The penalty decreases as more time passes. Wait, and you'll receive your full {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)}.
        </div>
      </div>

      <div className="flex-1" />

      <div className="p-6 pb-12 space-y-2">
        <button
          onClick={onConfirm}
          className="press w-full h-14 rounded-full border text-sm"
          style={{ color: '#e87560', borderColor: 'rgba(232,117,96,0.3)' }}
        >
          Confirm exit
        </button>
        <button
          onClick={onBack}
          className="w-full h-12 text-dim text-xs"
        >
          Keep mining
        </button>
      </div>
    </div>
  );
}
