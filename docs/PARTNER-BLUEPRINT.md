# musa: blueprint for a gold supplier

> **Draft for Pav's review, 2026-11-21. Not sent to anyone.** Written to be handed to a prospective gold partner for discussion. Every figure comes from `docs/TREASURY.md`, where the sources are. Nothing here is a commitment or an offer; licences and legal review are still ahead.

---

## What musa is

A retail app for buying gold. A person pays once and receives real gold, gram by gram, over 6, 12 or 24 months, into a wallet they own. They receive more gold than their money buys at spot. That extra is the reason they agree to wait.

The gold reaches the user as PAXG, a token redeemable for London good-delivery bars. The contract that holds and releases it is public, so anyone can check that every gram owed is there.

musa is in build: the app and the contract run on a test network today.

## What we are asking

We do not know your side of the business well enough to propose one deal. This page shows what musa can be built to do with a supplier. Tell us which parts fit how you work, and which numbers are wrong for you.

---

## What musa gives a supplier

| | What it means for you |
|---|---|
| **Retail demand at spot** | You sell to end buyers at the benchmark price, with no dealer in between. |
| **Orders fixed on day one** | Price and grams are set when the user pays. You can buy your input the same day at the same price and stay matched. |
| **A delivery schedule you can see** | Every order becomes a known number of grams due each day for months ahead. |
| **Money ahead of metal** | In the prepaid configuration you are paid when the order is placed and deliver over time. |
| **Gold you can borrow** | Users who opt in lend their gold. A gold business is the natural borrower. |
| **Metal coming back** | Users who sell need a buyer. A standing bid from you is a source of metal and a margin. |
| **An outlet for finished product** | Users can take delivery in bars or coins you make. |
| **A named source** | musa's line is "Real gold · real mines · delivered". A real supplier behind it is worth more to us than a discount. |

---

## Configurations

Each can stand alone. They can also be combined or reached in steps.

### 1. Sell on delivery

You sell gold to musa as users' deliveries fall due. Paid at once, at spot.

- **You get:** a steady retail outlet. No credit exposure either way.
- **You give:** nothing beyond the metal. Any discount is your choice.
- **It needs:** delivery as PAXG.

### 2. Deliver first, paid on schedule

You deliver the whole order on day one. The purchase price is held for you in US Treasury bills and paid to you on a fixed calendar as the user's gold vests.

- **You get:** the full spot price, secured in T-bills from the first day. Volume that only exists because users are paid to wait.
- **You give:** time. The interest on the held money becomes the users' extra gold.
- **It needs:** delivery as PAXG. Nothing else from you.

### 3. Prepaid supply

You are paid in full when the order is placed. You deliver gram by gram over the term, always a set period ahead of what users are due.

- **You get:** working capital on day one, at a price fixed against your own purchase. You keep use of the metal until each delivery.
- **You give:** the users' extra gold, added on day one. In effect you pay for the money at a rate you set.
- **It needs:** security for the part not yet delivered: a bank guarantee, collateral, or a cap that grows with track record.

### 4. Borrow users' gold

Users who opt in lend their gold for a fixed term. You borrow it and return it with interest in grams.

- **You get:** metal financing from a new source.
- **You give:** interest in gold. Secured gold leases to jewellers and refiners pay 3-4% a year today.
- **It needs:** collateral of 105-110% or a bank guarantee, which is the norm for such leases.

### 5. Buy-back and physical delivery

You post a standing bid for users' gold, and offer delivery in your own bars or coins.

- **You get:** metal at your bid, and an outlet for minted product at retail.
- **You give:** the bid, and fabrication.
- **It needs:** a published price rule against the benchmark.

### 6. Reserve

You place gold in musa's reserve as a buffer above what users are owed.

- **You get:** a fee or a share of results.
- **You give:** gold that stays in the contract.
- **It needs:** agreement on rank and return. On our numbers this is the least efficient use of your gold: a reserve earns nothing while it sits.

---

## What each configuration can pay users

The extra gold is what brings users in. It can only be as large as what funds it.

| Configuration | 6 months | 12 months | 24 months | Paid by |
|---|---|---|---|---|
| 1. Sell on delivery | your discount | your discount | your discount | you, if you choose |
| 2. Deliver first, paid on schedule | 1.0-1.3% | 1.9-2.3% | 3.7-4.5% | interest on the held payment |
| 3. Prepaid supply | 1.2-2.0% | 2.2-3.8% | 4.2-7.3% | you, for the use of the money |
| 4. Borrow users' gold (paid at the end) | 1.1-1.9% | 2.3-3.9% | 4.7-8.0% | you, as lease interest |

Row 2 assumes T-bill rates of 3.5-4.3%. Row 3 assumes your money costs 4-7% a year in gold terms; if your real figure is different, so is the row. Row 4 assumes 2.3-3.9% a year.

musa's own income is a share of these, a fee on lending, and the spread on buy-back.

---

## What any configuration needs

- **PAXG.** Users receive PAXG. Metal becomes PAXG through Paxos, which takes London good-delivery bars with a 430 oz minimum. If your bars do not qualify, you sell them where you sell today and deliver PAXG, and your own metal reaches users through physical delivery.
- **Clean, documented origin.** A current responsible-sourcing report and chain of custody. One doubtful shipment would put every user's gold at risk.
- **Accounts.** Two years, audited.
- **For prepaid supply or borrowing:** a guarantee or collateral, as above.

---

## Questions for you

1. Which configurations fit how you buy, refine and sell?
2. What does money cost you today, and what would prepaid orders be worth?
3. How long from buying input to finished bars? How many times a year does your capital turn?
4. Where is your metal and in what form: good-delivery bars, kilobars, dore, unrefined?
5. Do you hedge price between buying and selling?
6. Do you mint or retail? Would you post a buy-back bid?
7. What volume could you supply per month to start, and at what scale would this matter to you?
8. Could you post a bank guarantee or collateral for prepaid orders?

---

## A path in steps

1. **Sell on delivery.** No exposure on either side. Proves the flow.
2. **Deliver first, paid on schedule.** Users get a funded bonus; you are secured from day one.
3. **Prepaid supply and gold lending,** sized to track record and security.
4. **Buy-back and physical delivery** alongside any of these.
