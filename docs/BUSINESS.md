# musa — Business Model & Economics

This document describes the economic model of musa and the weekly simulator used to test it. The simulator (`prototypes/musa-simulator.jsx`) is a standalone React app that models user acquisition, churn, purchases, tier allocation, platform revenue, reserve growth, gold delivery, and default events across a three-persona user mix over a multi-year horizon.

See `SPEC.md` for product/UX. See `ARCHITECTURE.md` for technical and stack decisions.

---

## The product in one paragraph

User pays $100 in fiat (Stripe / Apple Pay / bank transfer). Behind the scenes, a Privy embedded wallet is created silently. A smart contract on Base L2 issues a vesting position backed by PAXG in the platform's treasury. After a 30-day construction window, the contract releases gold gram-by-gram to the user's wallet over the lock period (6, 12, or 24 months). At completion, the user holds PAXG — tokenized, redeemable physical gold from LBMA-certified refined bars stored at Brinks and audited monthly by Paxos. The user paid $100 and received gold worth more than $100 at spot. The difference — the "discount" — is the product's core promise.

## Where the discount comes from

The user's bonus (2.5% to 18.8% depending on tier) has to come from somewhere real. The source is **miners' saved cost of capital**.

Junior miners commonly pay 12-25% effective rates on their alternative financing options:
- High-yield debt
- Gold streaming agreements with Wheaton / Franco-Nevada (which extract ~20-30% of upside)
- Equity dilution at unfavorable valuations during construction phase

musa offers miners capital at effective 8-12% cost — competitive for them, profitable for the platform. The 3-15% delta between the miner's savings and the user's bonus funds:

| Component | % of gross |
|---|---|
| User bonus (passed through) | 5-10% |
| Platform margin | 2-4% |
| Reserve buffer (gold price volatility during construction) | 1-3% |

---

## Tier economics (Tier 1 — locked)

| Tier | Lock period | User discount vs spot | Lock weight | Cancellable |
|---|---|---|---|---|
| Spark | 26 weeks (6 mo) | 2.5% | 0.5× (uncancellable short lock) | No |
| Flow | 52 weeks (12 mo) | 7.0% | 1.0× (full lock-in) | Yes (with penalty) |
| Vein | 104 weeks (24 mo) | 18.8% | 1.0× (full lock-in) | Yes (with penalty) |

**Construction period:** 30 days (4 weeks) after purchase before delivery begins. During this window, musa is deploying capital to miners; gold isn't flowing back yet. This is the period of highest platform risk and the rationale for the reserve (see below).

**Daily delivery rate after construction:** `total grams / (lock months × 30)`. Each day, that fraction accrues on-chain (lazy vesting — mathematical tracking, single PAXG transfer on claim/completion).

**Processing fee:** 2% flat, applied at gross inflow. Covers card processing, KYC, and on-chain gas (sponsored via paymaster).

---

## User personas (three archetypes)

Based on research into pump.fun churn data, neobank cohort patterns, and traditional gold-buying demographics. Three archetypes with distinct purchase frequency, ticket size, and churn.

### Curious — top-of-funnel testers

- **Frequency:** ~2 purchases per year
- **Average ticket:** $60
- **Tier mix:** 80% Spark / 15% Flow / 5% Vein (mostly testing the product)
- **Weekly churn:** 3.0% → ~80% annual churn compounded
- **Role in the model:** fills the top of funnel. Most churn before repeat-buying. Few convert to Savers.

### Saver — disciplined monthly savers

- **Frequency:** ~18 purchases per year (~1.5/month, paycheck cadence)
- **Average ticket:** $150
- **Tier mix:** 20% Spark / 55% Flow / 25% Vein (building a real position)
- **Weekly churn:** 0.5% → ~23% annual
- **Role in the model:** the business. Recurring revenue with long tenor. Low CAC repeat purchases.

### Whale — HNW / accredited

- **Frequency:** ~2 purchases per year (rare but huge)
- **Average ticket:** $7,500
- **Tier mix:** 5% Spark / 25% Flow / 70% Vein (maximum discount on largest tier)
- **Weekly churn:** 0.3% → ~14% annual
- **Role in the model:** low user count, disproportionate TVL contribution. 1-2% of users can drive 40%+ of gross inflows.

---

## Scenarios

Three calibrated scenarios for stress-testing and discussion.

### Base

Realistic steady-state assumptions. Represents the central case for a launched product finding its audience.

| Parameter | Value |
|---|---|
| Marketing budget | $600/week |
| CAC per paid user | $5 |
| Organic multiplier | 20% (ratio of organic to paid) |
| Persona mix (new users) | 70% Curious / 25% Saver / 5% Whale |
| Platform margin | 3.0% |
| Max reserve cap | $200,000 |
| Reserve yield (annual) | 4.0% |
| Churn multiplier | 1.0× |
| Early exit rate | 5% of eligible units/year |
| Default rate | 2% annual probability of any default event |
| Monthly overhead | $7,000 |
| Reserve contribution | 1.0% of gross |

### Optimistic

Product-market fit achieved, referrals compounding, premium demographics shifting toward Savers and Whales.

| Parameter | Value |
|---|---|
| Marketing budget | $1,200/week |
| CAC per paid user | $3 |
| Organic multiplier | 40% |
| Persona mix | 55% Curious / 35% Saver / 10% Whale |
| Platform margin | 3.0% |
| Max reserve cap | $500,000 |
| Reserve yield | 5.0% |
| Churn multiplier | 0.6× |
| Early exit | 3%/year |
| Default rate | 1%/year |
| Monthly overhead | $9,000 |

### Stressed

Economic downturn, customer trust issues, fraud in partner network, gold price volatility, CAC inflation.

| Parameter | Value |
|---|---|
| Marketing budget | $600/week |
| CAC per paid user | $12 |
| Organic multiplier | 10% |
| Persona mix | 85% Curious / 13% Saver / 2% Whale |
| Platform margin | 3.0% |
| Max reserve cap | $300,000 |
| Reserve yield | 3.0% |
| Churn multiplier | 2.5× |
| Early exit | 15%/year |
| Default rate | 6%/year |
| Monthly overhead | $8,000 |

---

## Simulation mechanics

The simulator runs in weekly steps. Each step:

1. **Acquisition**: `paidUsers = marketing / cac`, plus `organicUsers = paidUsers × orgMult + referralUsers`. Allocated across personas by scenario mix.
2. **Churn** (per-persona, lock-in protected): users with active locked Flow/Vein units can't churn. Eligible users churn at persona-specific weekly rate × scenario multiplier.
3. **Purchases** (per-persona): `expectedPurchases = (persona.frequency × freqMult / 52) × userCount`. Fractional purchases resolve probabilistically. Each purchase allocated to tier by persona tier-weights.
4. **Per-unit accounting**: `gross = count × persona.ticket`. `processing = gross × 2%`. `reserve = gross × 1%`. `platformCut = gross × margin%`. `toMiner = gross - processing - reserve - platformCut`. `gramsCommitted = gross × (1 + tier.discount) / goldPricePerGram`.
5. **Reserve**: contributions fill toward cap; overflow flows to platform revenue. Weekly yield accrues on current balance at scenario rate.
6. **Gold delivery**: weekly rate = `undeliveredGrams / 60` (blended ~14-month average tenor across the tier mix).
7. **Costs**: `weeklyCosts = (monthlyOverhead / 4.33) + marketing + processing`.
8. **Defaults**: probabilistic weekly trigger. When fires: nominal exposure = 5% of inflight capital (capped $1.5M realistic single-partner tranche). Recovery 60%. Net loss 40% absorbed by reserve first, then P&L.

### Key invariants tracked

- `totalGoldGramsCommitted` — grams promised to users
- `totalGoldGramsDelivered` — grams actually flowed
- `reserveBalance` — current reserve (PAXG equivalent)
- `workingCapitalInFlight` — capital out to miners, not yet repaid
- `cumulativeProfit` — revenue - costs - defaults over full sim

---

## What the sim reveals

### 1. Whales dominate TVL despite being rare

With Whale at $7,500 ticket and 2/yr frequency, even at 5% of user base they contribute more gross inflow than Curious at 70%. Product design (social proof, referral, concierge onboarding for Vein tier) should lean into this.

### 2. Reserve caps matter more than starting reserves

The reserve cap determines when contributions "spill" into platform revenue. At $200K cap with 1% contribution rate and $50-100K/week gross volume after year 1, the cap saturates within 4-6 months. Further contributions become direct revenue (small but persistent).

### 3. Construction-period exposure is the bottleneck

For 30 days after every purchase, musa has deployed capital to miners without any gold flowing back. At steady-state with $100K/week inflow, ~$400K is in the construction pipeline at any given time. Reserve must cover at least worst-case default on this outstanding pipeline.

### 4. Lock-in compounds

Flow and Vein users are churn-protected during their lock. After 6-12 months of steady acquisition, 40-60% of active users are locked. Stressed-scenario churn multipliers (2.5×) only bite the unlocked minority — system is more resilient than a naive churn model would predict.

### 5. Default severity > default frequency

A single 2% annual default probability is manageable. The dangerous case is a single default coinciding with a gold-price spike and reserve drawdown. The simulator models this with the 60% recovery / 40% net-loss assumption — but real insurance + legal framework is what makes this survivable. See `ARCHITECTURE.md` § "Risks to plan for".

---

## Bootstrap reality

### Phase 1 (months 1-6)

- Limited miner pipeline
- User PAXG backed primarily by platform-seeded reserve
- Effectively running a subsidized savings product
- Growth-constrained by available reserve, not demand

### Phase 2 (months 6-12)

- First miner agreements close (see co-founder's relationship work)
- Hybrid: new issuances partially backed by miner pipeline, partially by reserve
- Reserve becomes buffer + yield generator rather than primary backing

### Phase 3 (year 2+)

- Miner pipeline covers most new issuance
- Reserve → emergency buffer, yield pool, solvency signal
- Unit economics fully standalone

User UX is identical across all phases. The difference is entirely in the backend capital mechanics.

---

## Operational cost reality

Not in the naive simulator but real in production. See `ARCHITECTURE.md` § "Operational cost reality":

- Gas sponsorship (paymaster): pennies per tx on Base, few hundred $/month
- Oracle subscriptions (Chainlink gold price feed): ~$100-500/month
- Indexer (The Graph hosted or self-hosted Ponder): $200-1000/month
- Monitoring (Tenderly, Forta): ~$200-500/month
- Multi-sig coordination: low direct cost, significant time cost
- Key management (hardware wallets, HSM if large): setup $5-10K, annual ~$2-5K
- KYC (Persona/Sumsub): $0.50-5 per user onboarded

**Estimate: $5-15K/month in on-chain-specific operational costs** beyond what a traditional fintech would pay. Add to overhead in scenarios for any multi-year realistic run.

---

## Funding plan

Not final — placeholder for when raise deck is drafted.

### Pre-seed / seed (current phase)

- Purpose: build v1 prototype → real contracts → audited mainnet
- Size: rough $1-3M range depending on runway / reserve size
- Use: engineering (Pav + contract auditor + Privy integration), legal (jurisdiction selection + entity setup), initial PAXG reserve ($200-500K), miner-side negotiation expenses, monthly burn for 18 months

### Key milestone for Series A-able story

- Mainnet live with bounded exposure ($10K/user, $500K total initial caps)
- 100-300 active users
- First miner agreement executed (not just talked about)
- Audited solvency invariant running on-chain, public dashboard

### Long-term margin profile

- Platform margin: 2-4% of gross (locked in simulator as 3%)
- Reserve yield contribution: small but persistent, scales with reserve cap
- Overflow from capped reserve: revenue bonus after reserve saturates
- Early-exit penalties: additional non-recurring revenue (1-2% of active portfolio)

Gross to net: monthly overhead + marketing + occasional default losses. At $200K/week steady-state volume (~$10M/year), expected net margin 1-2% ($100-200K/year) — thin but real. Scale economics only kick in at $1M+ weekly volume.

---

## What this business ISN'T

Worth saying explicitly to orient decisions.

- **Not a yield product.** We don't pay APY. We deliver gold. The "discount" is not yield — it's a better price, full stop.
- **Not a synthetic/derivatives product.** Real PAXG, real allocated gold, real audit trail. Users can redeem PAXG for physical bars via Paxos.
- **Not a trading product.** Buy-and-hold framing. No price speculation, no leverage, no charts.
- **Not a community/social product.** No forum, no DAO, no token. Users show up, buy, hold, receive gold. Minimal social surface.
- **Not a US-first launch.** See `ARCHITECTURE.md` § "Jurisdiction strategy". Switzerland / UAE / Singapore first. US expansion later once regulatory path clear.

---

## Open questions for business decisions

Same as in `ARCHITECTURE.md` but from a business angle:

1. **Exit penalty curve shape** (linear / exponential / stepped) — tradeoff between user-friendliness and platform protection. Business call, not technical.
2. **Tier reversibility** — can user upgrade Spark → Flow mid-lock? Adds huge complexity. Default no in v1.
3. **Referral program structure** — how much bonus, to whom, in what form? Need to design before launch.
4. **Concierge tier for Vein whales** — human touchpoint? At what ticket threshold?
5. **First jurisdiction** — Switzerland, UAE, or Singapore? Drives entity setup, KYC partners, contract templates.
6. **Reserve target size for launch** — $200K (Base scenario) or $500K (Optimistic)? Drives initial fundraise ask.

---

## The simulator as tool

`prototypes/musa-simulator.jsx` is a standalone React app, not part of the prototype. Run separately to explore scenarios and tune parameters.

Inputs adjust live via sliders:
- Marketing budget, CAC, organic multiplier, persona mix
- Platform margin, reserve cap, reserve yield
- Churn multiplier, early exit rate, default rate, monthly overhead

Outputs displayed live:
- Active users (per persona), total users ever
- Cumulative cash inflow, to-miners, platform revenue
- Reserve balance, reserve yield accrued, overflow
- Gold grams committed vs delivered
- Cumulative profit / loss
- Working capital in-flight
- Weekly flow visualization (user → platform → miner → platform → user)

Not a forecasting tool. A stress-testing and intuition-building tool. Use it to verify the business logic holds under a range of assumptions, not to predict outcomes.
