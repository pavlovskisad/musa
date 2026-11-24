# musa: blueprint for a gold supplier

> **Draft for Pav's review, 2026-11-21. Not sent to anyone.** Written to be handed to a prospective gold partner for discussion. Every figure comes from `docs/TREASURY.md`, where the sources are. Nothing here is a commitment or an offer; licences and legal review are still ahead.

---

## 1. What we built

A retail app for buying gold, and the contract behind it.

1. **A person pays once.** They pick an amount and a term: 6, 12 or 24 months.
2. **A position is created on-chain.** It records how many grams they are owed, fixed at that day's price.
3. **Gold arrives gram by gram.** After a short opening period the contract releases gold evenly until the term ends.
4. **It lands in a wallet they own.** The wallet is created for them at sign-up. They can withdraw what has arrived at any time.
5. **They receive more gold than their money buys at spot.** That extra is the reason they agree to wait.
6. **Anyone can check the reserve.** The contract shows the gold it holds against the grams it owes.

Today this runs on a test network, with PAXG as the gold. The app, the wallet layer, the contract and the reserve view work end to end.

**The gold token is a setting, not a foundation.** The contract releases whatever gold token it is deployed with. It can run on PAXG, on your gold, or on both side by side. See section 4.

## 2. What we are asking

We do not know your side of the business well enough to propose one deal. This page shows what exists, what can be built around it, and what it could do for a supplier. Tell us which parts fit how you work, and which numbers are wrong for you.

---

## 3. What can be built around it

### For a supplier

| | What it means for you |
|---|---|
| **Retail demand at spot** | You sell to end buyers at the benchmark price, with no dealer in between. |
| **Orders fixed on day one** | Price and grams are set when the user pays. You can buy your input the same day at the same price and stay matched. |
| **A delivery schedule you can see** | Every order becomes a known number of grams due each day for months ahead. |
| **Money ahead of metal** | In the prepaid configuration you are paid when the order is placed and deliver over time. |
| **Gold you can borrow** | Users who opt in lend their gold. A gold business is the natural borrower. |
| **Metal coming back** | Users who sell need a buyer. A standing bid from you is a source of metal and a margin. |
| **An outlet for finished product** | Users can take delivery in bars or coins you make. |
| **A consumer product for your own gold token** | If you issue one, musa is a ready front end: people acquire it gram by gram, hold it, lend it, borrow against it. |
| **A named source** | musa's line is "Real gold · real mines · delivered". A real supplier behind it is worth more to us than a discount. |

### For users

| Module | What it does | State |
|---|---|---|
| Buy and receive over time | The flow in section 1 | built, test network |
| Borrow against gold | Dollars against gold the user already holds, without selling it | to build; a lending market for PAXG exists on the same network |
| Lend gold | Opt-in. Gold lent for a fixed term, returned with interest in grams | to build; needs a borrower and a lending licence |
| Sell back | A standing bid, so users always have an exit | to build; needs a bidder |
| Take it physical | Delivery in bars or coins | to build; needs a mint |
| Monthly plan | Fixed instalments, with a bonus instalment at the end | to build |
| Jewellery store | Your pieces sold in the app. A better price for paying with gold received here. Pre-order: the buyer pays up front and gets a position that accumulates gold toward the order, bulk orders included | idea, 2026-11-22; not designed |
| Pilgrimage | A seasonal caravan after Mansa Musa's pilgrimage. Buyers join a season by opening a mine and earn generosity status by gifting grams, bringing friends, staying to term and playing small games; top ranks get the supplier's jewellery and closed tiers. Referral programme and marketing in one; the game mechanics can seed a bonus system on the supplier's token | idea, 2026-11-24; not designed. Games must not change how much gold anyone receives without a legal review |
| A market for the gold token | A liquidity pool against dollars, and one against a reference gold token to hold the price to gold | to build; matters most for a new token |

---

## 4. Which gold

**Route A: PAXG.** Users receive PAXG, redeemable for London good-delivery bars. Your metal can become PAXG if Paxos accepts your bars: that needs the good-delivery standard and at least 430 oz, and the terms have to be confirmed with Paxos. Otherwise you sell your metal as you do today, users receive PAXG, and your own metal reaches them through physical delivery.

**Route B: your gold.** Users receive a token you issue against your own metal. musa becomes the way people acquire and use it. For users to accept it in place of an established token, it needs:

- **Allocated metal** behind every token, in a recognised vault, with a public bar list.
- **Independent attestation** of the reserve, monthly.
- **Redemption** for metal on published terms.
- **A licence** for the issue. Dubai has a framework for tokenised commodities.
- **A way out for holders:** a standing buy-back bid and a liquidity pool. A new token has no market until one is built.
- **Clear rules** on who can freeze or pause it, and when.

**Both.** The two can run side by side, and the user chooses.

**A staged path (added 2026-11-22).** The order we would propose:

1. **Launch on PAXG.** An established token, redeemable for bars. Buyers and a track record build from day one.
2. **Your token alongside PAXG.** When it is ready, the user chooses which gold to receive. Your token arrives to an audience that already exists.
3. **Your token as the default,** once redemption works and there is a market and a track record.

"Ready" should be agreed up front: the list above, plus a redemption for metal that we have tested ourselves. On our side this is separate work: the contract today is deployed for one gold token, so a second token means a second deployment or a contract that holds two.

---

## 5. Supply configurations

Each can stand alone. They can be combined or reached in steps.

### 5.1 Sell on delivery

You supply gold as users' deliveries fall due. Paid at once, at spot.

- **You get:** a steady retail outlet. No credit exposure either way.
- **You give:** nothing beyond the metal. Any discount is your choice.

### 5.2 Deliver first, paid on schedule

You deliver the whole order on day one. The purchase price is held for you in US Treasury bills and paid on a fixed calendar as the user's gold vests.

- **You get:** the full spot price, secured in T-bills from the first day. Volume that only exists because users are paid to wait.
- **You give:** time. The interest on the held money becomes the users' extra gold.

### 5.3 Prepaid supply

You are paid in full when the order is placed. You deliver gram by gram over the term, always a set period ahead of what users are due.

- **You get:** working capital on day one, at a price fixed against your own purchase. You keep use of the metal until each delivery.
- **You give:** the users' extra gold, added on day one. In effect you pay for the money at a rate you set.
- **It needs:** security for the part not yet delivered: a bank guarantee, collateral, or a cap that grows with track record.

### 5.4 Borrow users' gold

Users who opt in lend their gold for a fixed term. You borrow it and return it with interest in grams.

- **You get:** metal financing from a new source.
- **You give:** interest in gold. Secured gold leases to jewellers and refiners pay 3-4% a year today.
- **It needs:** collateral of 105-110% or a bank guarantee, which is the norm for such leases.

### 5.5 Buy-back and physical delivery

You post a standing bid for users' gold, and offer delivery in your own bars or coins.

- **You get:** metal at your bid, and an outlet for minted product at retail.
- **You give:** the bid, and fabrication.

### 5.6 Reserve

You place gold in musa's reserve as a buffer above what users are owed.

- **You get:** a fee or a share of results.
- **You give:** gold that stays in the contract.
- On our numbers this is the least efficient use of your gold: a reserve earns nothing while it sits.

---

## 6. What each configuration can pay users

The extra gold is what brings users in. It can only be as large as what funds it.

| Configuration | 6 months | 12 months | 24 months | Paid by |
|---|---|---|---|---|
| 5.1 Sell on delivery | your discount | your discount | your discount | you, if you choose |
| 5.2 Deliver first, paid on schedule | 0.9-1.1% | 1.8-2.2% | 3.5-4.3% | interest on the held payment |
| 5.3 Prepaid supply | 1.0-1.8% | 2.0-3.5% | 4.0-7.0% | you, for the use of the money |
| 5.4 Borrow users' gold (paid at the end) | 1.1-1.9% | 2.3-3.9% | 4.7-8.0% | you, as lease interest |

Row 5.2 assumes T-bill rates of 3.5-4.3%. Row 5.3 assumes your money costs 4-7% a year in gold terms; if your real figure is different, so is the row. Row 5.4 assumes 2.3-3.9% a year.

**The target (added 2026-11-22).** For the retail product to sell, the buyer needs about 1.5% on 6 months, 4% on 12 and 10% on 24. With prepaid supply that means the money costs you 6, 8 and 10% a year on those terms. Whatever is above your usual cost of money is what you pay for the customer: on a $1,000 two-year order, $30-60. You pay it in grams of your own metal, so at your cost of metal it is lower by your margin.

musa's own income is a share of these, a fee on lending, and the spread on buy-back.

---

## 7. What any configuration needs

- **Clean, documented origin.** A current responsible-sourcing report and chain of custody. One doubtful shipment would put every user's gold at risk.
- **Accounts.** Two years, audited.
- **For prepaid supply or borrowing:** a guarantee or collateral, as above.
- **For your own token:** the list in section 4.

---

## 8. Questions for you

1. Which configurations fit how you buy, refine and sell?
2. What does money cost you today, and what would prepaid orders be worth?
3. How long from buying input to finished bars? How many times a year does your capital turn?
4. Where is your metal and in what form: good-delivery bars, kilobars, dore, unrefined?
5. Do you hedge price between buying and selling?
6. Do you mint or retail? Would you post a buy-back bid?
7. Are you planning a gold token of your own? If so: when, under which licence, on which network, how many grams per token, and on what redemption terms?
8. What volume could you supply per month to start, and at what scale would this matter to you?
9. Could you post a bank guarantee or collateral for prepaid orders?

---

## 9. A path in steps

1. **Sell on delivery.** No exposure on either side. Proves the flow.
2. **Deliver first, paid on schedule.** Users get a funded bonus; you are secured from day one.
3. **Prepaid supply and gold lending,** sized to track record and security.
4. **Your token, buy-back and physical delivery** alongside any of these, when each is ready.
