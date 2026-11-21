# TREASURY.md

How musa funds the bonus without depending on anyone. Options, numbers, and a recommendation.

> **Status: PROPOSAL, 2026-11-21, first draft. Independent verification of the numbers is still running; figures may change.** Nothing here is locked. It does not change SPEC, ARCHITECTURE or BUSINESS until Pav approves. Section 11 lists the decisions that need a yes or no.
>
> **Numbers.** Every market figure is a dated snapshot with a source in the last section, not a forecast. Model figures come from `docs/research/treasury-model.py`, which uses the tiers in `src/app/lib/tiers.js` and the personas in `prototypes/musa-simulator.jsx`. No simulator parameter has been changed. Legal points are research, not legal advice.

---

## 0. The decision in one screen

1. **Today's tiers cannot be paid from on-chain yield.** Delivered gram by gram, the tiers cost **8.9% / 13.4% / 18.5% a year in gold** (Spark / Flow / Vein), not the 5 / 7 / 9% shown in the app. Honest gold-denominated yield tops out near 3-4% a year, and most of it is 0-2%.
2. **Build musa funded-first.** No position is created unless its principal and its bonus grams are already in the reserve. The bonus stops being a promise and becomes gold that was bought before it was shown. That is what self-sufficient means here: solvency never depends on a reserve, a partner or a yield engine.
3. **The bonus becomes a stack.** Base (self-funded, small, floats) + boost (partner-funded, capped per person) + mine rate (the miner discount, when the pipeline exists).
4. **Launch as option A.** Keep today's headline tiers on the first $500 a person buys per year, paid from the marketing budget. At the simulator's persona mix that costs about $14.50 per user per year against a $35 CAC. Above the cap the base rate applies.
5. **Use a gold partner (option B) by one rule: gold in first.** The partner sells gold into the reserve at spot and is paid from a T-bill escrow as grams vest. musa keeps the escrow yield: about **1.2% / 2.3% / 4.4%** per tier. No trust in the partner is needed, which is the right design while their standing is unknown.
6. **Customer gold is never pledged, lent or traded in the default tiers.** Option D (buy, collateralise, trade) is rejected on customer gold: it nets 0-1.4% a year at safe leverage, a 50% loan-to-value position opened at the January peak was liquidated this week, and pledged gold cannot legally be called backed.
7. **Self-generated yield on customer gold is a separate opt-in tier, later.** Realistic size: 1-3% a year in gold, which is +0.3-0.9% / +0.5-1.6% / +1.0-3.1% of bonus.

Realistic bonus by source (whole lock, gram-by-gram delivery):

| Source | Spark 6 mo | Flow 12 mo | Vein 24 mo | Who pays |
|---|---|---|---|---|
| Promised today | 2.5% | 7.0% | 18.8% | miner discount (no pipeline yet) |
| Base: exit forfeits | 0 | 0.3-0.5% | 0.6-1.0% | people who leave early |
| Partner gold, paid from escrow | 1.1-1.3% | 2.0-2.4% | 3.8-4.7% | partner's waived carry |
| Partner price discount | 0.3% | 0.3% | 0.3% | partner |
| Opt-in earn tier (customer gold at work) | 0.3-0.9% | 0.5-1.6% | 1.0-3.1% | lessees, DeFi borrowers |
| Boost on the first $500 per person per year | up to 2.5% | up to 7.0% | up to 18.8% | marketing budget |

So the always-on tier card is roughly **0 / 0.5 / 1** with no partner and roughly **1.5 / 3 / 5.5** with partner gold. Today's 2.5 / 7 / 18.8 survives only as a capped promotion or once real miner discounts exist.

---

## 1. The problem in numbers

**Linear delivery roughly doubles the cost of the bonus.** Gold starts leaving on day 30 and leaves evenly, so the average gram stays only 0.29 / 0.54 / 1.04 years. The `annualized` values in `tiers.js` (5 / 7 / 9%) are only true if all gold is delivered at the end.

| | Spark | Flow | Vein |
|---|---|---|---|
| Bonus | 2.5% | 7.0% | 18.8% |
| Average life of a gram, linear | 0.29 yr | 0.54 yr | 1.04 yr |
| Yield needed in gold terms, linear delivery | 8.9%/yr | 13.4%/yr | 18.5%/yr |
| Same, if only 94% of the payment buys gold | 34.9%/yr | 27.5%/yr | 26.2%/yr |
| Same, if delivered at the end (bullet) | 5.1%/yr | 7.0%/yr | 9.0%/yr |

The 94% row is the current split in BUSINESS.md: 2% processing, 1% reserve and 3% platform margin come out before the money reaches the gold. BUSINESS.md says miners get capital at 8-12%. With linear delivery and that split the implied cost to whoever supplies the gold is 26-35% a year in gold terms.

**With no reserve, every position starts under-backed.** If 100% of the payment buys gold, the solvency ratio at issuance is 97.6% / 93.5% / 84.2%. With the 6% split it is 91.7% / 87.9% / 79.1%. `createPosition` in `Musa.sol` does not check solvency at issuance, so the contract allows this today.

**One point of yield buys very little bonus.** Each 1% a year earned in gold on outstanding grams funds 0.29% / 0.54% / 1.04% of bonus (linear) or 0.50% / 1.00% / 2.01% (bullet).

**The miner discount paid for more than the bonus.** It also paid the 2% processing cost, the 3% platform margin and the 1% reserve. Without it, musa has no revenue line in the current model. See decision 5 in section 11.

---

## 2. What the market pays today

Gold fell 36-37% from its record of $5,594.82 on 2026-01-29 to about $3,520 on 2026-11-20 [1][2]. PAXG's realised volatility over the year was 29% [18]. Dollar rates: SOFR 3.91%, 3-month T-bill about 4.2-4.3%, and COMEX gold contango of 4.6-5.2% a year [3][4][5][29].

Two facts drive everything below.

- **Gold's own interest rate is about zero.** Contango is roughly the dollar rate, so the implied wholesale lease rate is near zero or slightly negative [4][5]. Hedged gold plus a risk-free dollar yield nets to the lease rate. Anything above about 1% a year in gold is a risk premium: credit, short volatility, or venue risk.
- **On-chain, gold is collateral, not a lendable asset.** Aave holds $51M of XAUt at 0% supply yield with none borrowed [8][9]. The "Aave PAXG 1-3%" line in ARCHITECTURE.md is wrong.

| Engine | Paid in | Net per year | Capacity | Verdict |
|---|---|---|---|---|
| Hold PAXG, or supply it to Aave / Morpho | gold | 0% | n/a | settlement asset only [8][9][10] |
| PAXG-XAUT liquidity pools (Ethereum) | gold | 0.5-2.3% | $2-3M | idle inventory only [8] |
| Leased-gold tokens: PAXGy, GLDY | gold | 2.3-3.7% | $1-3M | small, gated, lessee credit risk [14][15] |
| Direct gold leasing to jewellers and refiners | gold | 2-4% | $5-30M over 12-24 months | off-chain credit, slow [32][39] |
| Pledge gold at 30-40% LTV, deploy the dollars | gold | -0.1% to +1.4% | $8-25M | a funding line, not a yield [9][10] |
| Covered calls on gold | gold | about 0 (range -7% to +4%) | under $5M on-chain | avoid: loses grams in rallies [27] |
| Dollars + long gold perp (synthetic gold) | gold | -6.5% to +0.5% | n/a | avoid: pays the funding others earn [21] |
| T-bill tokens, prime USDC vaults on Base | USD | 3.6-5.1% | large | dollar float only [10][28] |
| Gold cash-and-carry: hold gold, short the perp | USD | about 5% (3-7.5%) | $10-25M | non-backing capital only [21][22] |
| Junior-miner gold credit | gold | gross 12-22%, net about 6% after losses | deal by deal | upside tranche, capped [34][38] |

Notes on the rows that look tempting:

- **Perp funding is real but it is dollars.** The Hyperliquid PAXG perp paid shorts 7.7% a year over 18 months and xyz:GOLD paid 8.35% since December 2025 [21]. Most of that is the dollar rate; the excess over T-bills is 1-3 points. It needs the gold exposure hedged away, so it cannot sit on gold that backs gram liabilities. The deployer halved funding once already (2025-12-19) [22].
- **Leasing is the only gold-in, gold-out yield at 3-4%.** Monetary Metals reports 3.9% on about 192,000 oz [32]. It is credit: part of one lease was seized in Turkey in January 2026 [33]. PAXGy is two months old and $5.7M [14].
- **Stable yield barely beat T-bills.** Over the last 12 months blue-chip DeFi dollars paid 3.5-4.6% against a 3.84% T-bill, with multi-day exit freezes in each large venue [8][30].
- **Honest retail gold yield tops out near 4%.** Higher headline rates in the market are capped promotions (Bybit: boosted rate on the first 0.1 XAUT) [42], retail-margin funded (Tanishq's 7.5% instalment bonus, paid in jewellery) [40][41], or failures (PIM Gold) [44].

---

## 3. Option A: no reserve, a partner who helps with marketing

**Shape.** Every deposit buys PAXG at once. Nothing is promised that has not been bought. The bonus is acquisition spend that lands in the user's wallet as gold.

**How the bonus is paid.**

- **Boost.** Today's headline rates on the first $500 a person buys per year, bought into the reserve at issuance from the marketing budget (musa's own, the partner's, or both).
- **Base.** Above the cap, the rate the bonus pool can fund that day. At launch that is zero. It rises as exit forfeits and partner contributions arrive.

**What it costs,** using the simulator's PWA Base personas and tier weights:

| Per-person cap on boosted purchases | Boost cost per user per year | Users fully inside the cap |
|---|---|---|
| No cap (today's design) | $215 | 100% |
| $1,000 | $25 | 80% |
| $500 | $14.50 | 80% |
| $250 | $9.20 | 80% |

Uncapped, the bonus costs 13.8% of volume, and most of it goes to the 5% of users who are whales. Capped at $500, four users in five still see exactly today's numbers and the cost is under half the simulator's $35 CAC. The current $3,000 a week marketing line buys headline bonuses on about $2.2M a year of Flow volume.

**Why this works with zero reserve.** The solvency ratio is 100% or higher from the first position, because the bonus grams exist before the position does. No yield engine is required. If the marketing money stops, the boost stops and nobody is owed anything.

**Weak points.**
- A capped promotion per person invites duplicate accounts. Boost only verified identities.
- Above the cap the product pays close to nothing extra until the pool fills. Whales get plain gold at spot.
- The 2% processing cost still has to be paid by someone. If the bonus is smaller than the fee, "more than you paid for" is not true for that purchase. See section 11.
- The partner should be paid a fee or CAC, never a share of treasury results, and must use approved copy only.

---

## 4. Option B: a partner with gold

Five ways to use a partner's gold, best first. All assume the partner's standing and cost base are unknown, so none of them lets musa carry partner credit risk.

**B1. Gold in first, paid from escrow (recommended).** The partner sells good-delivery gold or PAXG into the reserve at deposit-day spot. Title passes to the reserve vehicle on delivery, so the gold is unencumbered backing. The user's dollars sit in a T-bill escrow pledged to the partner and are released as grams vest. musa keeps the escrow yield.

| Escrow rate | Spark | Flow | Vein |
|---|---|---|---|
| 3.6% (T-bill tokens, 12-month net) | 1.05% | 1.95% | 3.75% |
| 4.2% (T-bill today) | 1.23% | 2.27% | 4.38% |
| 4.5% (prime USDC vaults, conservative mix) | 1.31% | 2.44% | 4.69% |

- This is where on-chain dollar yield belongs. The liability to the partner is in dollars and so is the asset. The gram liability is matched by gold already in the reserve.
- What the partner gives up is the carry on a deferred payment, about the dollar rate. For a holder of idle inventory that is cheap. A hedged trader will ask for it back, and then the structure earns nothing.
- It is also the cheapest test of the partner: can they deliver first.

**B2. A price discount.** Legally the cleanest, and it is the miner model. Realistic size on clean refined gold is 0.3%, with 1% as the ceiling. Industrial dore sells at 99.8% of spot [35]. A larger discount is either a marketing subsidy or a provenance problem.

**B3. A subordinated first-loss reserve.** Partner gold sits above 100% backing in a ring-fenced vehicle, ranked behind users. It generates nothing by itself. It lets musa fix bonuses in advance of the income that funds them. Sizing: about 3% of annual volume for a 1.2 / 2.3 / 4.4 tier card. For today's tiers it would be about 13% of annual volume, and it would be consumed, not lent, because no income replaces it. Fair price to the partner: 1-2% a year or a profit share.

**B4. An overlay on the excess.** Short gold perps against partner gold held above 100% and earn about 5% in dollars. It funds 5% x (excess / liabilities): a 30% excess supports about 0.4% / 0.8% / 1.6%. It only works if the partner accepts dollar exposure on that gold. It earns roughly the dollar rate for real venue risk, so it is a weak offer to a gold business that can do the same on COMEX.

**B5. A partner-funded physical perk.** If the partner mints or retails, the proven model is the jeweller scheme: the bonus comes out of the partner's fabrication margin when the user redeems in the partner's product [40][41]. Ask what margin they earn before designing around it.

**On a partner-issued gold token.** Accept it into the reserve only if it redeems 1:1 into London good-delivery metal with monthly attestation. Otherwise count it at a haircut or not at all. Never use it as the settlement asset: the gold tokens below the top two have almost no secondary liquidity.

**Do not:** prepay the partner unsecured, accept deliver-later at a fixed price, or lease treasury gold to the partner without 105-110% collateral or a bank guarantee. In each of these the partner's incentive to default peaks when gold has risen.

---

## 5. Option C: other yield, and what it risks

The table in section 2 is the menu. What each costs when it goes wrong:

| Source | What breaks | Seen in the last 13 months |
|---|---|---|
| Gold leasing | lessee default, seizure, no early exit | Leased gold seized in Turkey, Jan 2026 [33] |
| Leased-gold tokens | issuer redemption queue is the only exit; gated to non-US, non-EU or accredited | PAXGy $5.7M, GLDY 24 holders [14][15] |
| Gold as loan collateral | liquidation costs 5.7-6% of the pledged gold; oracle closed at weekends | 60% LTV liquidated 2026-03-23; 50% LTV liquidated 2026-11-18/19 [9][10][18] |
| Dollar lending vaults | exit freezes; shared collateral contagion | Aave USDC at 100% utilisation for 4-5 days, Apr 2026; Resolv USR -75%, Mar 2026 [30][31] |
| Perp cash-and-carry | auto-deleveraging removes the hedge in a crash; deployer sets funding and oracle | $57-80M of oracle-driven liquidations on the same deployer, Jul 2026 [25] |
| Covered calls | loses grams in exactly the rallies that make the liability expensive | Model backtest: worst month gave up 8-15% of the ounces |
| Junior-miner credit | restructuring is the base case | Akobo gold bond: 19% became 22% with an interest holiday [34] |
| Token issuer | freeze of the reserve address stops all deliveries | Paxos froze 1,906 PAXG and Tether 12,574 XAUt within an hour, 2026-10-29/30 [16] |

Two things that are not yield but do fund bonus:

- **Exit forfeits.** At the simulator's 3-5% a year exit rate, forfeits are 0.6-0.9% of cancellable face per year. Routed to the pool they fund about 0.3-0.5% on Flow and 0.6-1.0% on Vein. Spark is not cancellable and earns none. BUSINESS.md currently counts this as platform revenue.
- **Delivery shape.** Moving delivery later is the largest lever in the whole system. See section 8.

---

## 6. Option D: buy gold, collateralise it, trade

Step by step:

1. **Buy gold on deposit.** Yes, always. It is the only hedge for a gram liability that costs nothing to carry.
2. **Collateralise.** Borrowing dollars against gold costs 3.6-4.1% on Aave (XAUt on Ethereum only) and 5.7% on the Base PAXG market, which is four weeks old with $24K of idle liquidity [9][10].
3. **Trade.** The repeatable delta-neutral trade is funding capture at about 5% in dollars. Against a 4-5.7% borrow cost the spread is roughly zero.

The arithmetic: gold-terms return = LTV x (strategy return - borrow cost).

- At 40% LTV and a 5% borrow cost, a strategy earning 6% / 8% / 12% adds 0.4% / 1.2% / 2.8% a year.
- To fund today's tiers the strategy would have to net **22-50% a year** on the borrowed money, every year.
- Each extra point of trading return adds only 0.3-0.4 points in gold terms at safe leverage. A 10% loss on the strategy at 40% LTV costs 4% of the pledged gold.

The stress test already happened. On the real 2026 price path, a 50% LTV position opened at the January peak crossed the liquidation threshold on 2026-11-18/19. A managed 40% book needed three forced repayments totalling 29% of the debt [18].

And the label breaks. Five regimes use nearly the same wording for backed assets: "free and clear of all liens and encumbrances" (US model commodity code), "not encumbered nor pledged" (MiCA), "not rehypothecated" (VARA), "held in readiness for the customer at all times" (FINMA), "not lent, pledged, or rehypothecated for any reason" (SEC/CFTC, March 2026) [48][49][50][51][54]. Pledged customer gold cannot be called backed in any of them.

**Verdict: reject on customer gold.** Two narrow uses survive:
- Funding capture on capital that backs nothing: the bonus pool, retained surplus, first-loss partner capital. Capped at 5-10% of venue open interest, at most 3x on the perp leg, with the kill-switches in section 9.
- A credit line against gold at 30% LTV or less, as a liquidity tool inside the opt-in earn tier only.

Never run a book that is net short grams against what users are owed. Jieworui froze 13.4bn yuan of customer money in the January rally doing that [45].

---

## 7. Recommended architecture: funded-first

**Rule zero.** Unencumbered gold in the reserve is at least 100% of grams owed, principal and bonus, at every block. Enforced in the contract at issuance, not by policy.

```
user pays  ->  principal grams bought at T+0, held unencumbered     [reserve]
           ->  bonus grams bought at T+0 from the bonus pool        [reserve]

bonus pool <-  boost: marketing budget, partner money               (capped per person)
           <-  partner gold: escrow yield, price discount           (option B)
           <-  exit forfeits                                        (already stay in the reserve today)
           <-  income on musa's own capital                         (ring-fenced)
           <-  mine rate: miner discount                            (later)

rate card  =   what the pool can buy today, per tier, per person
```

**What changes for the user:** nothing in the flow. They still see a fixed number of extra grams at purchase and still receive gold gram by gram. The tier percentages stop being constants and become a rate card that moves with what is funded.

**What changes underneath:**

1. **Principal and bonus are separate.** Principal is what the user's money bought at spot. Bonus is a price discount at the point of sale, bought before it is shown. Fixing the bonus at purchase from a named source keeps the product on the sale-of-goods side. A bonus paid from musa trading pooled customer assets reads as an investment contract in the US, a deposit or fund in Switzerland, and a lending or management activity in Dubai [50][52][53].
2. **The pool can only spend what it holds.** No advance against future income unless a first-loss reserve (B3) underwrites it.
3. **Treasury strategies run on musa's own capital only,** in a ring-fenced vehicle whose losses cannot reach principal gold. Users do not share in its profit and loss.
4. **The solvency view splits in five:** unencumbered gold against principal grams; bonus grams and what is earmarked for them; encumbered gold with debt, LTV and liquidation price; non-gold assets and hedges by venue; first-loss capital.
5. **An opt-in earn tier comes later, under a lending licence.** Customer gold at work, variable rate, explicit agreement, hard caps, never called backed. This is the only place the 1-3% a year of gold-denominated yield can legally come from. It conflicts with "not a yield product" in BUSINESS.md, so it is Pav's call (section 11).

**Why this over the alternatives.**

- *Keep fixed tiers and let a partner reserve cover the gap.* The reserve is consumed at about 13% of annual volume with nothing refilling it. That is a subsidy with a countdown, and a fixed bonus at two to four times what any named gold borrower pays is the pattern regulators recognise from failed schemes.
- *Fund the bonus from a yield engine on customer gold.* At defensible risk it yields 1-3% a year, breaks the backed claim, and makes the default product a regulated lending product.
- *Float the whole bonus as a variable rate.* Honest, but it turns musa into a yield account and loses "more than you paid for" as a fixed fact at purchase.

Funded-first keeps the brand line true on every position, needs no trust in a partner or a venue, and lets each funding source be added or removed without touching the others.

**Phasing.**

| Phase | What is live | Bonus |
|---|---|---|
| 1. Mainnet, bounded exposure | Option A. 100% PAXG. Funded-first check on-chain. | Boost on capped tickets; base from zero |
| 2. Partner passes the gate | B1 escrow and B2 discount feed the pool. T-bill tokens and prime vaults for the escrow. | About 1.5 / 3 / 5.5 always-on |
| 3. Licence and audit in place | Opt-in earn tier. Funding capture on pool capital. | +0.3-0.9 / +0.5-1.6 / +1.0-3.1 for those who opt in |
| 4. Miner pipeline | Mine rate as a capped tranche, senior secured. | Upside, never the base |

---

## 8. Delivery shape: the largest lever

Everything that funds a bonus earns on gold or dollars that are still inside. Later delivery means more time inside.

| Delivery | Average life (S / F / V) | Escrow yield at 4.2% (S / F / V) | Bonus per 1%/yr of gold yield |
|---|---|---|---|
| Linear from day 30 (today) | 0.29 / 0.54 / 1.04 yr | 1.2 / 2.3 / 4.4% | 0.29 / 0.54 / 1.04 |
| Linear over the second half of the lock | 0.38 / 0.75 / 1.50 yr | 1.6 / 3.2 / 6.3% | 0.38 / 0.75 / 1.50 |
| All at the end | 0.50 / 1.00 / 2.00 yr | 2.1 / 4.2 / 8.6% | 0.50 / 1.00 / 2.01 |

Paying only the bonus at the end changes almost nothing, because the principal still leaves early.

Recommendation: keep linear delivery for Spark and Flow. Gram-by-gram arrival is the product, and prompt delivery to the user's own wallet is also the safer legal posture. Consider back-half delivery for Vein only, where it lifts the fundable bonus from 4.4% to 6.3%.

---

## 9. Limits and red lines

**Never.**
- Create a position the reserve does not already cover.
- Pledge, lend or pool customer gold in the default tiers.
- Hold fewer net grams than users are owed, by any route: unhedged dollars, short perps on backing gold, covered calls.
- Pay a bonus out of new deposits, an entry markup or a commission tree.
- Quote a headline that includes assumed gold price growth, or use "guaranteed", "yield" or "APY" in copy.
- Offer a fixed cash buy-back price. Cash-out is at spot.
- Prepay a partner unsecured or accept deliver-later at a fixed price.

**Caps on musa's own capital (the pool and anything else that backs nothing).**
- Dollar float: T-bill tokens and 0%-fee prime USDC vaults only. At most 25-30% per venue and 15-20% per curator. No long-tail synthetic dollars.
- Funding capture: at most 5-10% of a venue's open interest, at most 3x on the perp leg, two venues.
- Buy bonus grams when income is earned. The pool is held in gold, not dollars.
- Keep 2-4 weeks of scheduled deliveries in plain PAXG on Base outside any venue.

**Kill-switches for funding capture.** Unwind if 30-day funding falls below the T-bill rate plus 1%; if the deployer changes the funding multiplier or oracle method; if the perp trades more than 1% from its oracle for over an hour; if auto-deleveraging touches the position.

**If the earn tier is ever built.** Target 30% LTV, hard cap 40%, repay at 45%. Pledge at most half of opted-in gold, across two venues. At most 25% of opted-in gold in leases, with named counterparties. Enter every weekend at or below 40% LTV because the oracle is closed.

**Design for an issuer freeze.** Keep a documented compliance relationship with Paxos for the reserve address, and keep the settlement asset swappable.

---

## 10. What changes in the repo

Not done in this proposal. Listed so the scope is visible.

**Contract (`contracts/src/Musa.sol`).** Flag for audit before any of this is written.
- `createPosition` must revert unless the reserve covers all committed grams after the new position. Today it has no solvency check.
- Track principal and bonus grams separately per position and in totals.
- Expose pool grams (reserve minus committed) and the split solvency view.
- Forfeited grams already stay in the reserve. Make that an explicit pool credit with an event.
- Audit concerns to raise: rounding in gram-to-token conversion at the solvency boundary; ordering of the check against concurrent claims; owner-key power over issuance; any path that lets a deposit be counted twice.

**App.**
- `src/app/lib/tiers.js`: `discount` becomes a rate card served by the API. Remove `annualized`.
- `src/app/screens/BrowseScreen.jsx` line 64 shows "Per year +5/7/9%". It understates the user's real annualised benefit by about half under linear delivery, and a per-year rate is the wrong framing for a price discount.
- Per-person boost cap lives in the API and database, keyed to verified identity.

**Simulator.**
- Replace the miner split with funding sources: boost budget, escrow yield, forfeits.
- `DEFAULT_GOLD_PRICE_PER_GRAM` is $150; spot is about $113.50.
- `reserveYieldAnnual` of 3-5% on the PAXG reserve is not available. Idle PAXG earns 0%.

**Factual corrections to existing docs (pending approval).**
- ARCHITECTURE.md: "Aave PAXG market: 1-3% APY" is 0% [8][9].
- ARCHITECTURE.md: the bridge question is closed. Paxos issues PAXG natively on Base since 2026-11-06, with its own LayerZero route to Ethereum [12]. Base liquidity is thin (about $1.75M of DEX depth), so source through Paxos or Ethereum.
- ARCHITECTURE.md: Paxos now states PAXG is custodied by Paxos Trust Company, N.A. under OCC oversight, not NYDFS [13].
- ARCHITECTURE.md jurisdictions: Dubai (VARA) is the only surveyed regime whose rulebooks cover every piece. Switzerland fits only a fully backed, no-yield version. Singapore is hostile to retail incentives and offshore-only licensing. EU and US are closed for now [47][52][53][57][58].
- BUSINESS.md miner thesis: junior miners' alternatives now cost about 9.5-12% in dollars, roughly 5-8% in gold terms after contango. The spread the model assumes is not there once the liability is measured in grams [38].

---

## 11. Decisions for Pav

1. **Funded-first, yes or no.** No position without its bonus already in the reserve; tiers become a rate card. Recommendation: yes.
2. **Launch card and cap.** Recommendation: today's numbers on the first $500 per verified person per year; base rate above.
3. **Exit forfeits go to the bonus pool, not to platform revenue.** Recommendation: yes. It is the only self-generated source that touches no customer gold.
4. **Delivery shape.** Recommendation: keep linear for Spark and Flow; back-half for Vein.
5. **Who pays processing, and what is musa's revenue.** The miner discount used to pay both. Without it, a bonus smaller than the 2% fee makes "more than you paid for" false for that purchase. Options: an explicit fee on top, a buy spread, or cheaper rails. Needs a number from Pav.
6. **Opt-in earn tier.** It is the only route to yield on customer gold and it contradicts "not a yield product". Recommendation: not at launch; revisit after phase 2.
7. **Jurisdiction.** Recommendation: Dubai first, block US, EU and Singapore residents at KYC until counsel clears each.
8. **Vein.** 18.8% is the outlier in every scenario. Recommendation: reprice it with the rate card, and do not show 18.8% outside the capped boost.

## 12. Questions for the partner

Their answers decide which of B1-B5 is on the table.

1. Will you deliver gold first and be paid from escrow as it vests?
2. Do you hedge? An unhedged holder can sell at flat spot for deferred payment. A hedged one will price the forward.
3. Where is the metal and in what form: good-delivery bars in London or Zurich, kilobars in Dubai, dore, unrefined?
4. What is your funding cost and your all-in production or acquisition cost?
5. Would you subordinate a first-loss reserve, and at what fee?
6. Do you mint or retail? What margin do you earn on bars or product?
7. Gate before any gold moves: two years of audited accounts; a bar list of unencumbered allocated inventory with an independent count; LBMA good-delivery refiner or chain of custody; a current responsible-sourcing report; lien and sanctions searches; title transfer on delivery.

---

## 13. What is not verified

- CME margin levels after the 2026-11-20 selloff, and official settlements (curve taken from Yahoo quotes).
- No public gold lease benchmark exists; the near-zero lease rate is derived from futures and SOFR.
- PAXG creation being free, and the current redemption bands, rest on secondary sources.
- Whether Paxos shipped the promised timelock on the PAXG admin keys.
- Covered-call figures are model backtests, not traded prices.
- Net returns on junior-miner credit are judgment; no loss statistics were found.
- Legal findings are primary-text research across five jurisdictions. They need counsel before anything is built on them.
- Perp funding history is 11-19 months and contains one rally and one drawdown.

---

## Sources

Snapshot date 2026-11-21 unless stated. Full findings with per-claim sources are in `docs/research/treasury-evidence-2026-11-21.md`.

1. LBMA, Precious Metals Market Report Q3 2026 (2026-10-14). https://www.lbma.org.uk/articles/lbma-precious-metals-market-report-q3-2026
2. CNBC, gold market report (2026-11-20). https://www.cnbc.com/amp/2026/11/20/gold-federal-reserve-price-dollar-metals.html
3. New York Fed, SOFR (2026-11-19). https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json
4. CME Term SOFR via global-rates (2026-11-19). https://www.global-rates.com/en/interest-rates/cme-term-sofr
5. COMEX gold futures quotes via Yahoo Finance (2026-11-19/20). https://query1.finance.yahoo.com/v8/finance/chart/GCZ27.CMX
6. Federal Reserve statement (2026-10-28). https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm
7. BullionVault, lease-rate spike (2025-02-10). https://www.bullionvault.com/gold-news/gold-price-news/trump-tariffs-record-gold-china-021020251
8. DefiLlama yields API, live snapshot. https://yields.llama.fi/pools
9. Aave v3 API, live. https://api.v3.aave.com/graphql
10. Morpho API, live. https://blue-api.morpho.org/graphql
11. Fluid API, live. https://api.fluid.instadapp.io/v2/1/vaults
12. Paxos, PAXG mainnet addresses. https://docs.paxos.com/guides/stablecoin/paxg/mainnet
13. Paxos, PAX Gold. https://www.paxos.com/pax-gold
14. PAXGy transparency page, live. https://www.paxgy.com/transparency
15. Streamex GLDY distribution (2026-10-19). https://finviz.com/news/404251/streamex-corp-announces-september-2026-yield-dividend-distribution-for-gldy
16. Aave governance, PAXG assessments (2026-08). https://governance.aave.com/t/paxos-gold-paxg-on-aave-ethereum-assessments/25359
17. Aave governance, XAUt onboarding (2025-06). https://governance.aave.com/t/arfc-add-xaut-to-aave-v3-core-instance/22385
18. Binance public data, PAXGUSDT hourly klines. https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval=1h
19. Chainlink market hours. https://docs.chain.link/data-streams/market-hours
20. CryptoSlate, PAXG loans on Coinbase (2026-11-09). https://cryptoslate.com/tokenized-gold-can-now-back-a-coinbase-loan-the-price-feed-takes-weekends-off/
21. Hyperliquid info API, funding history and candles, live. https://api.hyperliquid.xyz/info
22. trade.xyz documentation. https://docs.trade.xyz/llms-full.txt
23. Hyperliquid HIP-3 documentation. https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals
24. Binance funding-rate archive. https://data.binance.vision/?prefix=data/futures/um/monthly/fundingRate/
25. Galaxy Research, trade.xyz oracle liquidations (2026-07-30). https://www.galaxy.com/insights/research/hyperliquid-tradexyz-oracle-liquidations
26. Blockworks, gold basis for Ethena (2026-04-14). https://blockworks.com/insights/ethena-gold-basis
27. Derive API, XAUT options, live. https://api.derive.xyz/v3/public/get_tickers
28. rwa.xyz, tokenized treasuries (2026-11-20). https://app.rwa.xyz/treasuries
29. FRED, 3-month Treasury (2026-11-19). https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO
30. Steakhouse, DeFi markets update (2026-11-18). https://kitchen.steakhouse.financial/p/defi-markets-update-2026-11-18
31. The Block, Resolv USR (2026-03-22). https://www.theblock.co/post/394582/resolvs-usr-stablecoin-depegs-after-attacker-mints-80-million-unbacked-tokens-extracts-roughly-25-million
32. Monetary Metals, lease yields (2026-07-07). https://www.monetary-metals.com/insights/articles/why-are-companies-paying-more-than-ever-to-lease-gold/
33. Monetary Metals, AgaBullion statement (2026-01-26). https://www.monetary-metals.com/about-us/newsroom/monetary-metals-statement-regarding-agabullion
34. Akobo Minerals restructuring (2025-09-05). https://www.inderes.fi/en/releases/akobo-minerals-ab-akobo-minerals-completes-financial-restructuring
35. ESGold dore purchase agreement (2026-05-26). https://esgold.com/esgold-signs-definitive-gold-and-silver-dore-purchase-agreement-with-ocean-partners/
36. World Gold Council, Gold Demand Trends Q3 2026, supply (2026-11-03). https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-q3-2026/supply
37. World Gold Council, pricing artisanal gold purchases (2025-12-09). https://www.gold.org/goldhub/research/central-bank-considerations-when-pricing-asgm-purchases/appendices
38. Crux Investor, West Red Lake refinancing (2026-11-02). https://www.cruxinvestor.com/posts/west-red-lake-gold-lines-up-us-95-million-to-refinance-its-nebari-debt-at-a-lower-cost
39. SafeGold, live page. https://www.safegold.com/
40. BankBazaar, Tanishq gold schemes (secondary). https://www.bankbazaar.com/gold-rate/tanishq-gold-schemes.html
41. Titan Company directors' report (2026-05-08). https://www.indiainfoline.com/company/titan-company-ltd/reports/directors-report
42. Bybit XAUT promotion (2026-01-14). https://www.prnewswire.com/apac/news-releases/bybit-joins-the-gold-rush-with-boosted-apr-for-xaut-flexible-easy-earn-302661183.html
43. Business Today, PhonePe gold cashback (2025-10-15). https://www.businesstoday.in/personal-finance/investment/story/phonepe-launches-dhanteras-cashback-offer-on-24k-digital-gold-purchases-498201-2025-10-15
44. Stiftung Warentest, PIM Gold (updated 2022-12-16). https://www.test.de/PIM-Gold-Anleger-bangen-um-150-Millionen-Euro-5525584-0/
45. The Standard, Jieworui (2026-01-28). https://www.thestandard.com.hk/finance/article/322935/Shenzhen-gold-trading-platform-Jieworui-encounters-redemption-risk-amid-gold-rally-with-134b-yuan-unpaid
46. Outlook Business, India ends sovereign gold bonds (2025-02-01). https://www.outlookbusiness.com/economy-and-policy/govt-likely-to-discontinue-sovereign-gold-bond-schemes-confirms-finance-ministry
47. MiCA Art. 40, interest prohibition. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-40-prohibition-granting-interest
48. MiCA Art. 37, custody of reserve assets. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-37-custody-reserve-assets
49. NASAA Model State Commodity Code. https://nasaa.org/wp-content/uploads/2023/05/MODEL-STATE-COMMODITY-CODE.pdf
50. SEC interpretation with CFTC guidance (2026-03-23). https://www.govinfo.gov/content/pkg/FR-2026-03-23/html/2026-05635.htm
51. FINMA Guidance 08/2023. https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/4dokumentation/finma-aufsichtsmitteilungen/20231220-finma-aufsichtsmitteilung-08-2023.pdf
52. FINMA Circular 2008/3, public deposits. https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/rundschreiben/finma-rs-2008-03.pdf
53. VARA Lending and Borrowing Services Rulebook. https://rulebooks.vara.ae/rulebook/lending-and-borrowing-services-rulebook
54. VARA Virtual Asset Issuance Rulebook. https://rulebooks.vara.ae/entiresection/294
55. VARA marketing guidance. https://rulebooks.vara.ae/rulebook/guidance-regulations-marketing-virtual-assets-and-related-activities-2024
56. DMCC, first tokenised commodity under the VARA framework (2026-09-07). https://dmcc.ae/latest-news/first-tokenised-commodity-asset-launched-under-dmcc-vara-framework-with-world-record-silver-bar
57. MAS, retail measures for digital payment tokens (2023-07-03). https://www.mas.gov.sg/news/media-releases/2023/mas-publishes-investor-protection-measures-for-digital-payment-token-services
58. MAS, digital token service providers (2025-06-06). https://www.mas.gov.sg/news/media-releases/2025/mas-clarifies-regulatory-regime-for-digital-token-service-providers
59. SEC v. Belmont Reid & Co., 9th Cir. 1986. https://www.casemine.com/judgement/us/5914c238add7b049347be347
60. In re Celsius Network, Earn opinion (2023-01-04). https://www.nysb.uscourts.gov/sites/default/files/opinions/312902_1822_opinion.pdf
