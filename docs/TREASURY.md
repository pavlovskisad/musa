# TREASURY.md

Where the bonus can come from once nobody is assumed to pay for it. Options, numbers, a recommendation.

> **Status: PROPOSAL, 2026-11-21. Nothing here is locked.** It does not change SPEC, ARCHITECTURE or BUSINESS until Pav approves. Section 11 lists the decisions, each a yes or no.
>
> **Numbers.** Every market figure is a dated snapshot with a source in the last section, not a forecast. Model figures come from `docs/research/treasury-model.py` and `docs/research/average-in-outcomes.py`. The model reads the tiers in `src/app/lib/tiers.js` and the personas in `prototypes/musa-simulator.jsx` (the code, which differs from the older scenario table in BUSINESS.md); no simulator parameter has been changed. The first draft was checked by independent re-derivation and three adversarial reviews and rewritten to their findings. The rewrite has not had a second independent review. What could not be confirmed is in section 13. Legal points are research, not advice.
>
> **Words.** "Bonus" is the `discount` in `tiers.js`. "Welcome bonus", "leased gold" and "waiting dollars" are working names for this document, not interface copy.

---

## 0. The answer in one screen

1. **Today's tiers cost 8.9% / 13.4% / 18.5% a year in gold** (Spark / Flow / Vein), because gold starts leaving on day 30. On-chain, gold earns 0% idle and 2.3-3.9% leased out. Dollars earn 3.5-4.6%. No on-chain source pays the tiers.
2. **The miner discount that was meant to pay is not there at these numbers,** and it was also paying the 2% processing cost, the 3% margin and the 1% reserve. Without it musa has no revenue line.
3. **A gram that is already bought earns nothing unless it is lent.** So a bonus has only four possible payers: a sponsor (marketing, a partner, a miner), a borrower of the gold (credit risk), the user's own waiting dollars (the user gives up the purchase-day price), or other users (exit penalties). There is no fifth.
4. **A musa that pays its own bonus is a yield product.** BUSINESS.md says it is not one. That is the real decision, and it is Pav's (decision 2).

What each payer can fund, over the whole lock:

| Who pays | Spark 6 mo | Flow 12 mo | Vein 24 mo | Self-generated |
|---|---|---|---|---|
| Promised today | 2.5% | 7.0% | 18.8% | no payer exists |
| Marketing: welcome bonus, capped per person | 2.5% | 7.0% | 18.8% | no |
| Partner: gold first, paid later, waives the interest | 0 to 1.3% | 0 to 2.3% | 0 to 4.5% | no. Base case 0 |
| Leased gold, delivered at the end of the lock | 1.1-1.9% | 2.3-3.9% | 4.7-8.0% | yes. Lessee credit risk on the user's gold |
| User's waiting dollars earn until they become gold | 1.0-1.3% | 1.9-2.3% | 3.7-4.5% | yes. But gold is bought at each day's price, which since 2020 meant fewer grams than buying on day one two times in three |
| Pledge the gold and trade (option D) | about 0 | about 0 | about 0 | rejected |

**Recommendation.**

- **Now:** make the contract refuse any position it does not already hold the gold for. Show card costs at checkout. Launch with gold at today's price and a welcome bonus at today's tier rates until a person has received $35 of bonus in a year. That is a marketing cost, about $11 per user per year at the simulator's mix, and it is not self-funding.
- **Next, opt-in:** leased gold. It is the only self-generated source that gives a day-one buyer more grams, at 2.3-3.9% a year. It is credit risk on the user's gold, it needs a lending licence, and it can never be called backed.
- **Alongside, for lump-sum buyers who want to spread their entry:** waiting dollars in T-bills, converted to gold on a schedule, the interest buying extra gold. It needs nobody and risks no gold, but it is a different exposure and must not be sold as a bonus. The same rails pay a fixed-price tier if a partner delivers gold first and waits to be paid.
- **Not doing:** borrowing against customer gold to trade. It returns about zero and the gold stops being the customer's unencumbered gold.

Decisions are in section 11.

---

## 1. The problem in numbers

**Linear delivery roughly doubles the cost of the bonus.** Gold leaves evenly from day 30, so the average gram stays 0.29 / 0.54 / 1.04 years. The `annualized` values in `tiers.js` (5 / 7 / 9%) are only true if all gold is delivered at the end.

| | Spark | Flow | Vein |
|---|---|---|---|
| Bonus | 2.5% | 7.0% | 18.8% |
| Yield needed in gold terms, linear delivery | 8.9%/yr | 13.4%/yr | 18.5%/yr |
| Same, if a 2% processing cost is not recovered | 16.7%/yr | 17.8%/yr | 20.9%/yr |
| Same, with today's full split (94% reaches the gold) | 34.9%/yr | 27.5%/yr | 26.2%/yr |
| Same, if all gold were delivered at the end | 5.1%/yr | 7.0%/yr | 9.0%/yr |

BUSINESS.md says miners get capital at 8-12%. With linear delivery and the 2% + 1% + 3% split, whoever supplies the gold is paying 26-35% a year in gold terms.

**The miner thesis does not close.** Senior secured debt for near-producing juniors now prices at SOFR + 5.5% and up, about 9.4-11.7% in dollars, which is 4.2-7.4% in gold terms after contango [36]. The miners who pay 19-22% in gold are the ones being restructured [34]. A miner that will take musa's money at the rates the tiers imply is adverse selection. Deliveries on a prepay also start 12-21 months after funding, while musa delivers from day 30.

**With no reserve, every position starts under-backed.** If the whole payment buys gold, the solvency ratio at issuance is 97.6% / 93.5% / 84.2%. `createPosition` in `Musa.sol` does not check solvency, so the contract allows this today.

**One point of yield buys little; one point of cost hurts a lot.** Each 1% a year earned on gold still inside funds 0.29% / 0.54% / 1.04% of bonus. A 1% saving at purchase is worth the same as 3.4% / 1.9% / 1.0% a year of yield. On the short tiers the payment rail matters more than any yield source.

**The hole the miner discount leaves,** per user per year at the simulator's base mix: $31 of processing, $47 of platform margin, $16 of reserve contribution. None of the options below funds all three.

---

## 2. What the market pays today

Gold fell 36-37% from its record of $5,594.82 on 2026-01-29 to about $3,520 on 2026-11-20 [1][2]. PAXG's realised volatility over the year was 29% [17]. Dollar rates: SOFR 3.91%, 3-month T-bill 4.2-4.3% today and 3.84% on average over the last 12 months, COMEX gold contango 4.6-5.2% a year [3][4][5][6].

- **Gold's own interest rate is about zero.** Contango is roughly the dollar rate, so the implied wholesale lease rate is near zero [4][5]. Hedged gold plus a risk-free dollar yield nets to the lease rate. Anything above about 1% a year in gold is a risk premium.
- **On-chain, gold is collateral, not a lendable asset.** Aave holds $51M of XAUt at 0% supply yield with none borrowed [8]. The "Aave PAXG 1-3%" line in ARCHITECTURE.md is wrong.

| Source | Paid in | Net per year | Usable size | What breaks |
|---|---|---|---|---|
| Hold PAXG, or supply it to Aave / Morpho | gold | 0% | n/a | issuer freeze [19] |
| PAXG-XAUT liquidity pools (Ethereum) | gold | 0.2-2.3%, about 1.1% today | $2-3M | holds whichever token fails [7] |
| Leased-gold tokens: PAXGy, GLDY, XAUE | gold | 2.2-3.7% | $1-3M | lessee default; exit is the issuer's queue; gated [13][14][15] |
| Direct leases to jewellers and refiners | gold | 3-4% on secured books; 5-5.75% single-name | $5-30M over 12-24 months | default, seizure, no early exit [30][32][33] |
| Pledge gold at 30-40% LTV, deploy the dollars | gold | -0.5% to +0.1% on the last year's rates | about $8M, XAUt on Ethereum only | liquidation costs 4.5-5.7% of the gold; price feed closed at weekends [8][9][18] |
| Covered calls on gold | gold | about 0 (model range -7% to +4%) | under $5M on-chain | loses grams in rallies [23] |
| Dollars + long gold perp (synthetic gold) | gold | -3% to -6% | n/a | pays the funding others earn [20] |
| T-bill tokens | USD | 3.5-3.9% | large | holder eligibility [25] |
| Prime USDC vaults on Base | USD | 4.0-4.6% over 12 months | $10-25M | 93-100% in one market; multi-day exit freezes [9][26][27][28] |
| Hold gold, short the perp (funding capture) | USD | about 5% on total capital | about $4M per venue at exitable size | hedge removed in a crash; deployer sets funding [20][21][22] |
| Junior-miner gold credit | gold | 13-22% gross on the two known bonds | deal by deal | one of the two was restructured [34] |

Notes on the rows that look tempting:

- **Perp funding is real but it is dollars, and most of it is the dollar rate.** The Hyperliquid PAXG perp paid shorts 7.7% a year over the last 18 months and xyz:GOLD 8.35% since December 2025 [20]. xyz:GOLD paid 14.5% in its first 68 days and 6.8% since March. At 3x on the perp leg that is about 5% on total capital against a 4.3% T-bill, and in the typical hour it is 4.1%, below the bill. The deployer halved funding once already [21]. Insuring the venue costs 3.5% a year [29].
- **Leasing is the only gold-in, gold-out yield of size.** Monetary Metals reports a 3.91% average lease yield for 2026 on a book of about 192,000 oz [30][31]. It is credit: its highest-paying lease, at 5%, was to the refiner whose metal was seized in Turkey in January 2026 [32]. PAXGy is two months old and $5.7M [13].
- **Dollar vaults barely beat T-bills.** Cover on the prime vaults costs 0.6-0.7% a year, about the whole premium over bills [29].
- **Retail gold yield without a sponsor is 3-4% on secured leases and 5-6% on single-name credit** [30][33]. Higher headline rates are capped promotions (Bybit: a boosted rate on the first 0.1 XAUT) [40] or failures (PIM Gold) [42].
- **The most familiar retail gold bonus works on float.** Indian jeweller instalment plans pay up to 7.5% because the jeweller gets to use the customer's money; the World Gold Council puts such schemes at 20-30% of small-city jewellers' funding [37][38][39]. Whoever holds the waiting money can afford to pay for it.

---

## 3. Option A: no reserve, a partner who helps with marketing

**Shape.** Every deposit buys PAXG at once. Nothing is promised that has not been bought. The bonus is acquisition spend that lands in the user's wallet as gold.

**The welcome bonus.** Today's tier rates, until a person has received a fixed dollar amount of bonus in a year. Capping bonus dollars, not purchase dollars, makes the cost the same whichever tier people choose. Capped promotions are how the market already does this: Bybit boosts the first 0.1 XAUT, PhonePe paid 2% capped at Rs 2,000 [40][41].

| Cap | Cost per user per year | Over a user's life | Who keeps today's numbers |
|---|---|---|---|
| None (today's design) | $215, 13.8% of sales | about $1,550 | everyone |
| First $500 of purchases per year | $14.50, or $37 if all of it goes to Vein | $56 | Curious buyers. 12.6% of dollars |
| **$35 of bonus per person per year** | **$10.80** | **$35** | Curious buyers in full; everyone else on their first purchases |
| $15 of bonus per person per year | $6.80 | $16 | Curious buyers in full |

Simulator base scenario: CAC $35, 80% Curious. A recurring $35 cap costs about one more CAC over a user's life. It is added to acquisition cost, not taken from it: the simulator's $3,000 a week is already spent buying users.

**What it does not do.**

- **It is a subsidy.** Stop the marketing money and the bonus stops. Nobody is owed anything, which is the point of buying the grams first.
- **It leaves most dollars with no bonus.** Whales and megawhales are 71% of dollars in the base scenario. A Saver buying $2,400 a year gets $35 against $217 today. Above the cap the product is gold at spot with a lock, and a buyer does as well buying PAXG directly. The simulator has not been re-run with those buyers gone.
- **It has no revenue.** Processing is unfunded unless it is charged (decision 3).
- **Duplicate accounts farm it.** Welcome bonus only for a verified identity, a unique payment instrument, and funds that can no longer be reversed. ARCHITECTURE.md sets full KYC only above $1K-5K, so the whole bonus band is light-KYC today.
- **It needs working capital.** Gold is bought at once; card money settles days later.

**What the marketing partner does.** It brings users, and is paid per verified buyer or a share of fees. Never a share of treasury results, and only approved copy. If it will fund the welcome bonus itself, the cap can rise by what it funds. Issuer and network grant budgets were not researched and may be the cheapest marketing partner available: Paxos launched PAXG on Base on 2026-11-06 [10][58].

---

## 4. Option B: a partner with gold

The partner's standing and cost are unknown, so the options are ranked by how much trust each needs. More trust buys more bonus.

| | Structure | Bonus it funds | Trust needed |
|---|---|---|---|
| B0 | Partner sells gold, paid on delivery | 0, plus any discount (my judgment: 0-0.3%) | none |
| B1 | **Gold first, paid later.** Partner delivers at purchase-day price and is paid on a fixed calendar | 0 to 1.3% / 2.3% / 4.5% | none in their credit; all in their generosity |
| B2 | Money first, gold later. Partner takes the prepayment as working capital | its cost of funds: roughly 4-7% a year in gold terms for a sound borrower | full: this is unsecured credit to the partner |
| B3 | Partner lends a gold reserve as first-loss | none by itself | they trust musa |

**B0. Paid on delivery.** The cleanest, and the only one that needs nothing from anyone. Refined gold trades within about 0.1% of spot, and industrial dore sells at 99.8% of spot less refining [35], so a discount above 1% on deliverable metal is either a marketing subsidy or a provenance problem. What a gold business can give cheaply instead: waived minting fees, physical redemption, a buy-back bid. It also makes the footer true: real gold from a named source, delivered.

**B1. Gold first, paid later.** The partner delivers PAXG into the contract at the purchase-day price. musa holds the purchase price in a T-bill ladder and pays the partner on a fixed calendar that matches vesting. musa keeps the interest: 1.0-1.3% / 1.9-2.3% / 3.7-4.5% at 3.5-4.3%.

- Every point of that is interest the partner agrees not to earn. A zero-interest deferral is worth 1.2% / 2.2% / 4.2% of the price to a seller whose money costs 4.2%, and 2.7% / 5.0% / 9.3% to one whose money costs 10%. That is 4 to 30 times a 0.3% discount. **Plan on zero until it is negotiated.**
- It makes musa the partner's secured debtor. The payable must show in the solvency view, the partner's recourse must be limited to the T-bill ladder, and the contract must bar retention of title and set-off. Whether the held purchase price is client money needs counsel before this is offered.
- Hard terms: PAXG only, in the contract, before any position is issued. Paid on the original calendar whatever users do. Bills or T-bill tokens only, never lending vaults: a frozen vault is a payment default. Hold back 10% for 12 months after final vesting against title and origin defects.
- It is the cheapest test of the partner: can they deliver first and wait.

**B2. Money first, gold later.** This is the original miner model and the jeweller-scheme model. It pays the most because the partner is paying for working capital, and for that reason it is unsecured credit to a counterparty of unknown standing. Only against a bank guarantee or 105-110% collateral, which is the market norm for gold leases. A partner who can post that is no longer of unknown standing.

**B3. A reserve lent as first-loss.** A reserve earns nothing by itself: to fund a 7% bonus from a 3% yield it would have to be 2.3 times annual sales. Lenders of subordinated gold will want at least the secured lease rate, 3-6% a year [30][33]. Paying that for a buffer that earns zero is negative carry. Take it only as a profit share, and only to backstop the leased tier.

**Using the reserve to keep today's tiers** would consume 13.8% of sales every year with nothing refilling it.

**A token tied to or backed by gold.** A partner token cannot be pledged (no lending market lists one) or sold at size: PGOLD, the largest gold token from a smaller issuer on a public chain, shows a $69M market cap and $48 of daily volume [43]. Count it at zero until one test redemption into London good-delivery metal has cleared. After that, use it only as first-loss, never as backing and never as what users receive. A token tied to the gold price without allocated bars counts at zero.

---

## 5. Option C: yield the system makes itself

Two sources are large enough to matter. Both make musa a yield product.

### C1. Leased gold

**Shape.** Opt-in. The user's gold is lent to jewellers and refiners against collateral, and comes back with interest in grams.

| | Spark | Flow | Vein |
|---|---|---|---|
| 2.3-3.9% a year, principal delivered at the end | 1.1-1.9% | 2.3-3.9% | 4.7-8.0% |
| 2.3-3.9% a year, linear delivery | 0.7-1.1% | 1.2-2.1% | 2.4-4.0% |

- It keeps the purchase-day price and pays in grams, and a longer lock earns more. It is the only self-generated source that leaves the product as specified, and it is real gold at work in the gold trade.
- It is credit on the customer's own gold. The seizure in Turkey is the live example [32]. Losses fall on the holder unless someone stands first-loss.
- It cannot be called backed, and it needs a lending licence. VARA's lending rulebook allows fixed or variable interest to clients and requires it to be quoted as an annual percentage yield [51].
- Delivery has to wait: leases run 3-12 months with no early exit. The lock becomes real.
- Route: PAXGy first, capped at a quarter of its size (about $1.4M today), then direct leases ($5-30M over 12-24 months). PAXGy sits on Ethereum, excludes US and EU holders and has a two-month record [13].
- The partner could be the lessee. That is B2 again: only against a bank guarantee.

### C2. Waiting dollars earn until they become gold

**Shape.** The user pays up front. Dollars not yet converted sit in T-bill-grade assets. A fixed dollar slice becomes gold on a schedule, at that day's price, and goes to the user's wallet. The interest buys extra gold as it is earned.

| Rate on waiting dollars | Spark | Flow | Vein |
|---|---|---|---|
| 3.5% (T-bill tokens, 12-month realised) | 1.0% | 1.9% | 3.7% |
| 3.9% (T-bills, 12-month average) | 1.1% | 2.1% | 4.1% |
| 4.3% (3-month T-bill today) | 1.3% | 2.3% | 4.5% |

Before musa's share. If all sales went this way, each point of the rate musa keeps would be $82K a year per $10M of sales, and costs the user 0.3% / 0.5% / 1.0%.

**What it has going for it.**

- It is where the on-chain yield is. Dollars earn 3.5-4.6%; gold earns zero.
- It needs no partner, no reserve and no hedge. There is no gram liability, so there is nothing to be insolvent on. Nothing is advanced: the extra gold is bought when the interest exists.
- Delivered gold is in the user's wallet and nobody else's. Nothing is pledged or lent.
- Capacity is not a constraint at any size musa will reach.
- An early exit costs the user nothing: they take their remaining dollars. No exit penalty is needed.
- B1 runs on the same rails. If a partner delivers gold first and waits, the user gets the purchase-day price and the same interest.

**What it is not: a bonus.** The user's gold is bought at each day's price, and the price path is ten times larger than the interest. Every start date since August 2020, PAXG daily prices, interest at 3.9%:

| Lock | Median grams against a day-one buyer | Ended with more grams | Worst 5% / best 5% of start dates |
|---|---|---|---|
| 6 months | 3% fewer | 36% of start dates | 15% fewer / 11% more |
| 12 months | 5% fewer | 32% | 21% fewer / 9% more |
| 24 months | 8% fewer | 38% | 28% fewer / 10% more |

A 12-month plan started on 2025-01-01 ended with 22% fewer grams than buying that day. A 6-month plan started at the January 2026 peak ended with 24% more. Gold rose over most of the sample, so averaging in mostly lost.

- It suits someone holding a lump sum who would rather spread their entry. It does nothing for a Saver buying monthly out of income: there are no waiting dollars.
- The gram total on the buy screen becomes an estimate. SPEC shows a fixed number.
- It is still a yield product.

**Not researched.** Whether holding the waiting dollars is client money or a deposit in the launch jurisdiction, and whether the interest may be passed to a retail user. Which T-bill-grade asset a retail user outside the US may hold. The cost of small scheduled conversions on Base, where PAXG depth is about $1.75M.

### C3. Small sources

- **Funding capture on musa's own capital.** Hold gold, short the same notional of a gold perp, keep a third as USDC margin, top up by rule. About 5% in dollars, about one point over a T-bill since March. Sized to what can be exited on a weekend, about $4M a venue. It only applies to capital that backs nothing, and musa has almost none.
- **PAXG-XAUT pools.** About 1% on $2-3M of idle inventory.
- **Exit forfeits.** At today's penalties and the simulator's 3-5% exit rate they would be 0.6-0.9% of Flow sales and 1.1-1.9% of Vein sales a year. Plan on zero. They are other customers' principal; the 10-50% penalty was set against 7% and 18.8% bonuses and compensated a miner prepay that no longer exists; with the gold already bought, musa loses nothing when a user leaves, which is the test unfair-terms rules apply [57].

**Scale.** Below about $10M of assets a 1% excess return is under $100K a year, less than the cost of running any strategy beyond T-bills.

---

## 6. Option D: buy gold, collateralise it, trade

1. **Buy gold on deposit.** Yes, for anything sold at the purchase-day price. It is the only hedge for a gram liability that costs nothing to carry.
2. **Collateralise.** Borrowing dollars against gold cost 4.3-4.6% on Aave over the last year (3.6-4.1% at today's low) and takes XAUt on Ethereum only. The Base PAXG market is four weeks old, charges 5.7% and has $24K of idle liquidity [8][9].
3. **Trade.** Three things "capturing delta" can mean:
   - *Funding capture* (C3). About 5% in dollars against a 4.3-5.7% borrow cost. The spread is roughly zero. Exchange-listed gold perps paid 5-13% over the same period and some take gold tokens as margin, but they need an off-chain entity and exchange custody [24].
   - *Making markets in PAXG-USDC.* Pool fees show 10-15% a year on $1-3M [7], but the position is short volatility in gold terms and loses grams when gold trends. Not measured well enough to count as yield.
   - *Directional trading.* A bet, not a hedge. Nothing in the evidence supports funding a fixed liability from it.

**The arithmetic.** Gold-terms return = LTV x (strategy return - borrow cost).

- On the last year's rates, 40% LTV into the best conservative dollar yields returned -0.5% to +0.1% a year. At today's snapshot rates it is +0.9% to +1.4%.
- To fund today's tiers at 40% LTV the strategy would have to earn 26% / 37% / 50% a year on the borrowed money.
- Each extra point of strategy return adds 0.3-0.4 points in gold terms. A 10% strategy loss costs 4% of the pledged gold before interest.

**The stress test already happened, and it is not the reason to reject.** On this year's hourly prices, no loan opened at 45% LTV or below would have been liquidated in the 37% fall. A 50% loan opened at the January peak crosses the threshold in mid-November; across all entry days 2% of 50% loans and about half of 60% loans do. A managed 40% book needed three or four forced repayments totalling 29-39% of the debt, at the lows [17].

**The reasons to reject are the return and the label.** The return is about zero. And pledged gold is no longer the customer's unencumbered gold: it cannot count as segregated customer assets, and describing it as backed without saying so is a misleading-marketing risk in every regime looked at [45][47][48][52]. Some allow pledging with the customer's explicit consent [46][50], which is what the opt-in leased tier is for.

**Verdict: no borrowing against customer gold.** Funding capture stays available for musa's own capital under the limits in section 9.

---

## 7. Recommended architecture

**Rule zero.** The contract refuses to create a position unless the PAXG it holds covers every gram owed after the new one. Checked on-chain at issuance. Anything held off-chain is attested, not enforced, and does not count.

This makes musa solvent without anyone's help. It does not fund a bonus. It only guarantees that whatever is shown was bought first.

**Ways to buy, one rule.**

| | The user gets | The bonus is | Live when |
|---|---|---|---|
| Today's price, held (the default) | Gold bought at once and never lent | Welcome bonus only | Launch |
| Leased (C1), opt-in | Gold bought at once, lent out, returned with interest | Lease income in grams | After a lending licence |
| Over time (C2), opt-in | Gold bought each day; waiting dollars earn | Interest, as extra gold. Not a bonus | After counsel clears it |
| Today's price, partner-funded (B1) | Gold delivered first by the partner | The interest on the deferred payment | When a partner signs and delivers first |
| Mine rate | Gold bought forward from a miner | The miner's discount | When a secured deal exists |

**What a sponsor adds.** Marketing money, a partner discount or a miner discount each buys bonus grams into the contract before they are shown. Remove any one and nothing else changes.

**What musa earns.** With the miner split gone, three lines remain: a disclosed share of what the self-funding tiers earn, card costs passed through at checkout, and optionally a disclosed spread. Each $1M that sits in a self-funding tier for a year earns $23-39K leased or $35-43K in T-bills, before it is split with the user. Simulator overhead and marketing are $300K a year. Keeping one point covers that only with about $30M sitting in those tiers. Phase 1 has no revenue and runs on equity.

**Phasing.**

| Phase | Live | What it costs or earns |
|---|---|---|
| 1. Mainnet, bounded exposure | Today's price, welcome bonus, rule zero on-chain, card cost shown | About $11 per user per year of bonus; no revenue |
| 2. Self-funding, opt-in | Leased gold (C1) under a lending licence, sized to what the lease market can take | 1.1-1.9 / 2.3-3.9 / 4.7-8.0 at the end of the lock, before musa's share; first revenue |
| 3. Alongside | Over time (C2) once counsel clears it. B1 if a partner delivers first | 1.0-1.3 / 1.9-2.3 / 3.7-4.5 of interest, before musa's share |
| 4. Sponsors | Mine rate, partner discounts | Whatever is bought in advance |

**Why not the alternatives.**

- *Keep today's tiers and cover the gap with a partner reserve.* It burns 13.8% of sales a year. A fixed bonus at two to five times what secured gold borrowers pay is also the pattern regulators know from failed schemes.
- *Run a yield engine on customer gold by default.* The only one of size is leasing. Making credit risk the default while calling the gold backed is the misrepresentation the legal review warns about. Opt-in, labelled and capped is the only form that holds.
- *Make averaging-in the main product.* It is the safest thing here and the least like musa: it gives up the purchase-day price, and since 2020 it left buyers with fewer grams two times in three.

---

## 8. Delivery shape

Everything that funds a bonus earns on what is still inside. Later delivery means more time inside.

| Delivery | Average life (S / F / V) | Interest at 3.9% (S / F / V) |
|---|---|---|
| Linear from day 30 (today) | 0.29 / 0.54 / 1.04 yr | 1.1 / 2.1 / 4.1% |
| Linear over the second half | 0.38 / 0.75 / 1.50 yr | 1.5 / 2.9 / 5.9% |
| All at the end | 0.50 / 1.00 / 2.00 yr | 2.0 / 3.9 / 7.8% |

Paying only the bonus at the end changes almost nothing, because the principal still leaves early.

- **Shape only pays where something is earning.** For gold bought at today's price and held, it adds nothing and only keeps customer gold pooled in one address for longer. Deliver that gold promptly.
- **For C1** delivery at the end is forced by the lease.
- **For C2 and B1** the user can be offered the choice: slower conversion, more interest.
- **The 30-day construction window** existed to deploy money to miners. Under rule zero it has one remaining use: the period in which a card payment can still be reversed before gold leaves.

---

## 9. Limits and red lines

Starting values. Each needs an owner, a data source and a breach action before mainnet.

**Never.**
- Create a position the contract does not already cover.
- Pledge, lend or pool gold outside the opt-in leased tier.
- Hold fewer net grams than users are owed, by any route. No hedge or overlay on gold that counts toward grams owed.
- Count anything but PAXG in the contract as backing. No bars, no partner token, no off-chain asset.
- Pay a bonus out of new deposits, an entry markup or a commission tree.
- Quote a rate that includes assumed gold price growth. No "guaranteed" and no "safe" in copy; VARA's marketing rules bar implying either [53]. No per-year rate on the default tier.
- Offer a fixed cash buy-back price.
- Prepay a partner unsecured, or accept deliver-later at a fixed price without a bank guarantee.

**Keys and issuance.** `Musa.sol` today lets the owner create a position to itself and exit it in the same block for a 50% refund, which drains the reserve. Rule zero does not stop that.
- Owner is a timelocked multisig. A separate issuer role with per-position and per-day gram caps.
- No exit before the construction window ends.
- Pause held by a guardian, with automatic expiry.
- Surplus PAXG in the contract at most 3 days of sales.
- Exposure caps from BUSINESS.md stay: $10K per user, $500K in total at launch.

**Payments.**
- A position is revocable until the funds behind it cannot be reversed.
- Welcome bonus only on irrevocable funds, a verified identity and a unique payment instrument. Capped per person and per day in bonus dollars. Bonus grams vest last and are forfeited first.
- A chargeback loss budget as a share of card volume, with an automatic stop.

**Waiting dollars and partner payables.** Bills or T-bill tokens only. No lending vaults. Stablecoins at most 5 days of payouts. Partner paid on a fixed calendar.

**musa's own capital.**
- Dollars: T-bill tokens, and 0%-fee prime USDC vaults up to 25% per underlying market.
- Funding capture: at most what one thin weekend session can absorb per venue (about $3.6M on xyz:GOLD today). At most 3x, with a pre-funded USDC buffer of 25% of notional: a 3x short had one point of room in January's +30% month. Unwind when 0.75 x 30-day funding is below the T-bill plus one point. Half size on weekends, when the venue's oracle is its own order book.

**Leased tier.** At most 5% of leased gold per lessee, with 105-110% collateral or a bank guarantee. At most 25% of any lease token's size. No pledging of leased-tier gold: at safe LTV it adds under 0.5% a year.

**Issuer.** All customer gold in one address can be frozen or paused by Paxos; the contract's token is immutable and XAUT is not on Base, so there is no fallback today. State it in the terms. Before mainnet get Paxos's written treatment of pooled contract addresses, and audit a timelocked migration path.

---

## 10. What changes in the repo

Not done in this proposal. Listed so the scope is visible.

**Contract (`contracts/src/Musa.sol`).** Flag for audit before any of it is written.
- `createPosition` has no solvency check. It must revert unless the PAXG held covers all committed grams after the new position.
- The owner can drain the reserve by issuing to itself and exiting in the same block. Roles, caps, timelock and no exit during construction, as in section 9.
- `CONSTRUCTION_SECONDS` is 60. Every figure here assumes 30 days.
- Track principal and bonus grams separately. Exit forfeits only unvested bonus.
- No revocation path exists for a reversed payment.
- `paxg` is immutable with no migration path.
- Audit concerns to raise: rounding at the solvency boundary; ordering of the check against concurrent claims; reentrancy on any pool credit; front-running of rate updates; a stale weekend price feed if any price enters the contract; any path that counts a deposit twice.

**App and SPEC.**
- `tiers.js`: `discount` becomes what is funded that day, served by the API. Remove `annualized`.
- `BrowseScreen.jsx` line 64, "Per year +5/7/9%": the real figure under linear delivery is about twice that, and a per-year rate is the wrong framing for a price discount.
- SPEC onboarding screen 5 draws 2.5 / 7 / 18.8 with "lock longer for better". Under option A that holds only inside the cap.
- "more than / you paid for" is true only when the bonus exceeds the fee on that purchase.
- The "safe and sound" screen needs checking against VARA's marketing rules if Dubai is first.
- "Real gold · real mines · delivered": in phase 1 the gold is market PAXG. It becomes literally true with B0.

**Simulator.**
- Replace the miner split with the funding sources here. Re-run with the capped welcome bonus and with whale demand at the base rate.
- `DEFAULT_GOLD_PRICE_PER_GRAM` is $150; spot is about $113.
- `reserveYieldAnnual` of 3-5% is available on dollars in T-bills, not on a PAXG reserve.
- The scenario table in BUSINESS.md (CAC $5, $600 a week, three personas) no longer matches the code (CAC $35, $3,000 a week, four personas). On the BUSINESS.md inputs a $500 purchase cap costs 3.7 times CAC. One of them has to govern.

**Where this departs from BUSINESS.md and ARCHITECTURE.md.**
- The bonus source: miner discount becomes later upside.
- The 3% margin, 1% reserve contribution and $200-500K launch reserve go. Rule zero replaces the reserve.
- "Not a yield product" is narrowed to the default tier, if decision 2 is yes.
- ARCHITECTURE.md: Aave PAXG pays 0%, not 1-3% [8]. The bridge question is closed: Paxos issues PAXG natively on Base [10]; Base liquidity is about $1.75M, so buy through Paxos or Ethereum. Paxos now states custody by Paxos Trust Company, N.A. under OCC oversight, not NYDFS [11].
- Jurisdiction: Dubai has a licence category for each activity, but nothing in VARA's rulebooks addresses a prepaid lock with a bonus, several licences are likely, and every incentive needs VARA's confirmation [51][52][53]. Switzerland fits only a fully backed version with no interest [49]. Singapore bars retail incentives and lending if the gold token is a payment token, which is not settled [54][55]. The EU's interest ban reaches time-linked discounts from third parties [44]. The US was not cleared.

---

## 11. Decisions for Pav

> **Decided by Pav, 2026-11-22** (the rest of this section is still open):
>
> 1. **Delivery starts on the first day.** The 30-day opening period is dropped, which is also how the contract runs today (`CONSTRUCTION_SECONDS` = 60). Every figure in this document was computed with 30 days. With delivery from day one the average gram waits 0.25 / 0.50 / 1.00 years (was 0.29 / 0.54 / 1.04), so each 1% a year of yield funds a 0.25 / 0.50 / 1.00% bonus. The overview page and both blueprint docs use the new figures; the tables in this document do not yet.
> 2. **Decision 5 is yes: leaving early forfeits only the unearned bonus, never principal.** Example: $100 paid, 2% bonus, exit at 60% of the term. The buyer keeps the $61.20 already delivered and receives the remaining $40.00 of their own gold at once; the $0.80 of bonus not yet earned stays in the reserve. The contract and the app still apply the old stepped penalty (50 / 35 / 20 / 10% of the undelivered part) until they are changed, which needs principal and bonus grams tracked separately (section 10) and a new deployment.
>
> 3. **App tier bonuses are 1.5% / 4% / 10%** (were 2.5 / 7 / 18.8%). These are the rates Pav judges the product needs to sell. With delivery from day one they cost 6 / 8 / 10% a year. T-bill-level yield funds about 1 / 2 / 4%, so the difference (0.5 / 2 / 6% of the purchase) has to come from a supplier under prepaid supply: it is met in full if prepaid money is worth 6 / 8 / 10% a year to them, and whatever exceeds their real cost of money is their cost of acquiring the customer ($30-60 on a $1,000 two-year order at a 4-7% cost of money). **Not funded by anyone yet**: no supplier has agreed, so by rule zero these rates cannot go to a live product until one does.
>
> Open consequence of 2: it is cheap only where the gold is already in the reserve (PAXG bought on day one, or the supplier delivering the whole order up front). Under prepaid supply the undelivered gold has not arrived yet, so early exit there needs its own rule: paid out as the supplier delivers, or limited to what the reserve holds.


Each is a yes or no. My answer is in brackets.

1. The contract refuses any position it does not already hold the gold for. [yes]
2. musa adds opt-in tiers that fund themselves, and those tiers are yield products. "Not a yield product" then covers only the default tier, where gold is bought at once and held. [yes]
3. Card costs are shown and charged at checkout; bank and stablecoin deposits are free; every bonus is quoted after fees. [yes, subject to real payment costs, which were not researched]
4. Launch bonus: today's tier rates until a verified person has received $35 of bonus in a year, with a total weekly budget. [yes]
5. In the default tier, leaving early forfeits only unvested bonus, never principal. [yes]
6. Tier numbers in the app become what is funded that day. The "Per year" figure goes. [yes]
7. The offer to the gold partner is B0 (paid on delivery) with B1 (gold first, paid later) on the table. No prepayment and no lending to them without a bank guarantee. [yes]
8. The miner discount becomes later upside, not the base of the model. [yes]
9. The first self-funding tier to scope is leased gold, ahead of averaging-in, because it keeps the purchase-day price. [yes, scope only]
10. Dubai first; block US, EU and Singapore residents at KYC until counsel clears each. [yes]

## 12. Questions for the partner

1. Will you sell gold as PAXG, paid on delivery? At what price against the LBMA benchmark?
2. What is your cost of money, and what total concession per ounce (discount plus waiting to be paid) will you fund?
3. Where is the metal and in what form: good-delivery bars in London or Zurich, kilobars in Dubai, dore, unrefined? Can it become PAXG? Paxos lists in-kind conversion at 0.05% with a 430 oz minimum [12].
4. Do you mint or retail? Would you fund physical redemption or a buy-back bid?
5. If you want our users' gold or money as working capital, can you post a bank guarantee?
6. Gate before any gold moves: two years of audited accounts; a bar list of unencumbered allocated inventory with an independent count; an LBMA good-delivery refiner or chain of custody; a current responsible-sourcing report; lien and sanctions searches, repeated monthly.

---

## 13. What is not verified

- **Not researched:** the legal treatment of holding waiting dollars and passing on interest (C2); which T-bill-grade assets a retail user may hold on Base; the cost of small scheduled conversions; real payment costs. BUSINESS.md assumes 2% for cards. Stripe's published US card price is 2.9% + $0.30, which is 3.4% on a $60 ticket, and its restricted-business list includes precious metals and crypto [59][60]. Neither was checked further.
- The average-in comparison covers August 2020 to November 2026 only, a period in which gold mostly rose.
- No counsel has seen any of this. A fixed return can itself make a product an investment contract [56], so the tier rates and the welcome bonus need the same review as the yield tiers. The legal sections compare primary texts in five places; three of the five "unencumbered" rules bind token issuers or stakers and are used here by analogy. UAE consumer law on prepaid contracts and exit penalties could not be read.
- Whether card processors will serve a prepaid 6-24 month gold product at all, and the chargeback window on it.
- CME margin levels and official settlements (the curve is from Yahoo quotes). No public gold lease benchmark exists.
- PAXG creation being free rests on Paxos's fee page as of August; the waiver is stated to end 2027-01-01 [12]. Whether creation and redemption are available directly on Base.
- Whether Paxos shipped the promised timelock on the PAXG admin keys [16].
- Monetary Metals' yields and zero-default record are self-reported. The outcome of the Turkish seizure is unknown.
- Covered-call figures are model backtests. Perp funding history is 11-19 months and one deployer.
- The simulator's exit rates and personas were set for 2.5 / 7 / 18.8. Demand at the new numbers is unknown.
- The 60% LTV liquidation date depends on the price feed: late March on hourly token prices, early June on daily closes.

---

## Sources

Snapshot date 2026-11-21 unless stated. Per-claim sources for everything else are in `docs/research/treasury-evidence-2026-11-21.md`.

1. LBMA, Precious Metals Market Report Q3 2026 (2026-10-14). https://www.lbma.org.uk/articles/lbma-precious-metals-market-report-q3-2026
2. CNBC, gold market report (2026-11-20). https://www.cnbc.com/amp/2026/11/20/gold-federal-reserve-price-dollar-metals.html
3. New York Fed, SOFR (2026-11-19). https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json
4. CME Term SOFR via global-rates (2026-11-19). https://www.global-rates.com/en/interest-rates/cme-term-sofr
5. COMEX gold futures quotes via Yahoo Finance (2026-11-19/20). https://query1.finance.yahoo.com/v8/finance/chart/GCZ27.CMX
6. FRED, 3-month Treasury. https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS3MO
7. DefiLlama yields API, live. https://yields.llama.fi/pools
8. Aave v3 API, live, with one-year borrow-rate history. https://api.v3.aave.com/graphql
9. Morpho API, live. https://blue-api.morpho.org/graphql
10. Paxos, PAXG mainnet addresses. https://docs.paxos.com/guides/stablecoin/paxg/mainnet
11. Paxos, PAX Gold. https://www.paxos.com/pax-gold
12. Paxos, PAX Gold fees (2026-08-13). https://support.paxos.com/articles/2899561282-PAX-Gold-Fees
13. PAXGy transparency page, live. https://www.paxgy.com/transparency
14. Streamex GLDY distribution (2026-10-19). https://finviz.com/news/404251/streamex-corp-announces-september-2026-yield-dividend-distribution-for-gldy
15. XAUE vaults on Morpho, forum post (2026-07-15), NAV read on-chain. https://forum.morpho.org/t/introducing-touchstone-xaue-vaults-and-lending-markets-on-morpho/2355
16. Aave governance, PAXG assessments (2026-08). https://governance.aave.com/t/paxos-gold-paxg-on-aave-ethereum-assessments/25359
17. Binance public data, PAXGUSDT hourly klines. https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval=1h
18. Chainlink market hours. https://docs.chain.link/data-streams/market-hours
19. Issuer freezes of 2026-10-29, press summary; amounts and times confirmed from Ethereum logs. https://www.bitrue.com/blog/xaut-freeze-binance-wallet-theft
20. Hyperliquid info API, funding history and candles, live. https://api.hyperliquid.xyz/info
21. trade.xyz documentation. https://docs.trade.xyz/llms-full.txt
22. Galaxy Research, trade.xyz oracle liquidations (2026-07-30). https://www.galaxy.com/insights/research/hyperliquid-tradexyz-oracle-liquidations
23. Derive API, XAUT options, live. https://api.derive.xyz/v3/public/get_tickers
24. Binance funding-rate archive. https://data.binance.vision/?prefix=data/futures/um/monthly/fundingRate/
25. rwa.xyz, tokenized treasuries (2026-11-20). https://app.rwa.xyz/treasuries
26. Steakhouse, DeFi markets update (2026-11-18). https://kitchen.steakhouse.financial/p/defi-markets-update-2026-11-18
27. The Block, Resolv USR (2026-03-22). https://www.theblock.co/post/394582/resolvs-usr-stablecoin-depegs-after-attacker-mints-80-million-unbacked-tokens-extracts-roughly-25-million
28. Aave governance, rsETH incident report (2026-04-20). https://governance.aave.com/t/rseth-incident-report-april-20-2026/24580
29. Nexus Mutual cover pricing API, live. https://api.nexusmutual.io/v2/capacity
30. Monetary Metals, lease yields (2026-07-07). https://www.monetary-metals.com/insights/articles/why-are-companies-paying-more-than-ever-to-lease-gold/
31. Monetary Metals, gold under management (2026-06-16). https://fortune.com/press-releases/monetary-metals-redefining-market-investors-earn-yield-gold-silver-2026-06-16/
32. Monetary Metals, AgaBullion statement (2026-01-26). https://www.monetary-metals.com/about-us/newsroom/monetary-metals-statement-regarding-agabullion
33. Monetary Metals, 5.75% gold bond (2026-11-02). https://www.prnewswire.com/news-releases/monetary-metals-issues-38-million-in-gold-bonds-to-fuel-growth-302926554.html
34. Akobo Minerals restructuring (2025-09-05). https://www.inderes.fi/en/releases/akobo-minerals-ab-akobo-minerals-completes-financial-restructuring
35. ESGold dore purchase agreement (2026-05-26). https://esgold.com/esgold-signs-definitive-gold-and-silver-dore-purchase-agreement-with-ocean-partners/
36. Crux Investor, West Red Lake refinancing at SOFR + 5.50% (2026-11-02). https://www.cruxinvestor.com/posts/west-red-lake-gold-lines-up-us-95-million-to-refinance-its-nebari-debt-at-a-lower-cost
37. World Gold Council, India's gold jewellery market structure (2022-09-28). https://www.gold.org/goldhub/research/indias-gold-jewellery-market-structure
38. BankBazaar, Tanishq gold schemes (secondary). https://www.bankbazaar.com/gold-rate/tanishq-gold-schemes.html
39. Titan Company directors' report (2026-05-08). https://www.indiainfoline.com/company/titan-company-ltd/reports/directors-report
40. Bybit XAUT promotion (2026-01-14). https://www.prnewswire.com/apac/news-releases/bybit-joins-the-gold-rush-with-boosted-apr-for-xaut-flexible-easy-earn-302661183.html
41. Business Today, PhonePe gold cashback (2025-10-15). https://www.businesstoday.in/personal-finance/investment/story/phonepe-launches-dhanteras-cashback-offer-on-24k-digital-gold-purchases-498201-2025-10-15
42. Stiftung Warentest, PIM Gold (updated 2022-12-16). https://www.test.de/PIM-Gold-Anleger-bangen-um-150-Millionen-Euro-5525584-0/
43. CoinGecko markets API, gold tokens, live. https://api.coingecko.com/api/v3/coins/markets
44. MiCA Art. 40, interest prohibition. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-40-prohibition-granting-interest
45. MiCA Art. 37, reserve assets of issuers. https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-37-custody-reserve-assets
46. NASAA Model State Commodity Code. https://nasaa.org/wp-content/uploads/2023/05/MODEL-STATE-COMMODITY-CODE.pdf
47. SEC interpretation with CFTC guidance (2026-03-23). https://www.govinfo.gov/content/pkg/FR-2026-03-23/html/2026-05635.htm
48. FINMA Guidance 08/2023. https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/4dokumentation/finma-aufsichtsmitteilungen/20231220-finma-aufsichtsmitteilung-08-2023.pdf
49. FINMA Circular 2008/3, public deposits. https://www.finma.ch/en/~/media/finma/dokumente/dokumentencenter/myfinma/rundschreiben/finma-rs-2008-03.pdf
50. VARA Compliance and Risk Management Rulebook, client assets and client money. https://rulebooks.vara.ae/entiresection/123
51. VARA Lending and Borrowing Services Rulebook. https://rulebooks.vara.ae/rulebook/lending-and-borrowing-services-rulebook
52. VARA Virtual Asset Issuance Rulebook. https://rulebooks.vara.ae/entiresection/294
53. VARA Marketing Regulations. https://rulebooks.vara.ae/entiresection/419
54. MAS, retail measures for digital payment tokens (2023-07-03) and Part 2 consultation response (2023-11-23). https://www.mas.gov.sg/news/media-releases/2023/mas-publishes-investor-protection-measures-for-digital-payment-token-services
55. MAS, digital token service providers (2025-06-06). https://www.mas.gov.sg/news/media-releases/2025/mas-clarifies-regulatory-regime-for-digital-token-service-providers
56. SEC v. Edwards, 540 U.S. 389 (2004). https://www.law.cornell.edu/supct/html/02-1196.ZO.html
57. Council Directive 93/13/EEC, unfair terms, Annex 1(e). https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31993L0013
58. CryptoSlate, PAXG on Base and Coinbase gold loans (2026-11-09). https://cryptoslate.com/tokenized-gold-can-now-back-a-coinbase-loan-the-price-feed-takes-weekends-off/
59. Stripe pricing. https://stripe.com/pricing
60. Stripe restricted businesses (updated 2026-09-22). https://stripe.com/legal/restricted-businesses
