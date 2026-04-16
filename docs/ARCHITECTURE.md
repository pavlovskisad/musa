# musa — Architecture & Build Strategy

This document captures the architectural decisions and reasoning from the design session that followed prototype completion. Read alongside `SPEC.md` (product/UX spec) and `BUSINESS.md` (economic model, scenarios, simulator results).

---

## Core architectural decision

**musa is built on PAXG as the settlement layer + Privy embedded wallets + smart contracts on Base L2.**

The platform never holds physical gold custody. PAXG handles that via Paxos Trust Company (NYDFS-regulated, allocated London Good Delivery bars in Brinks vaults). musa is the originator + distribution layer + miner-relationship layer on top.

## The user flow (UX)

**Inflow:** Pure fiat. Stripe, Apple Pay, Google Pay, bank transfer. User taps "Buy Flow $100", enters payment details, done. Never sees a wallet, never signs a transaction, never hears the word "PAXG" unless they look for it.

**During lock period:** Reads-only. App shows "Flow · 0.3775g delivered of 0.713g · 12mo · 7%" with progress bar. No transactions from user side.

**Outflow:** Three options offered when contract completes (or early exit):
1. **Hold** PAXG in their Privy wallet
2. **Withdraw to external wallet** (MetaMask etc.) for crypto-native users
3. **Cash out** one-tap to USD via integrated off-ramp, small conv fee (0.5–1%)

Privy embedded wallet is created silently on signup, self-custodial via passkey/biometric. User owns their keys.

## What's actually happening behind the scenes

When user pays $100 fiat:
1. Stripe (or similar) processes card → USD lands in operating account
2. Backend records confirmed payment
3. Backend triggers smart contract call (signed by ops wallet, not user wallet): "create vesting position for [user's Privy wallet] with parameters: tier=Flow, amount=0.7133g, schedule=daily over 365 days starting day 30"
4. Contract checks treasury has enough PAXG to back the new position, locks it, emits event
5. User's app updates

User never signed a transaction. Privy wallet is the destination for eventual PAXG, not the source of any creation action.

**Lazy vesting:** Contract doesn't transfer PAXG every day (gas insanity). Tracks vested grams mathematically based on elapsed time. PAXG sits in treasury contract, "owed" to user but not yet transferred. Single transfer on claim/completion/exit.

**Gas sponsorship:** Use Base's paymaster system or service like Pimlico. Users never see gas fees. Pennies per tx on Base, totally affordable, removes biggest UX wart.

## Where the discount comes from (business model)

User pays $100 → receives 0.713g (worth $107 at spot) over 12 months. The 7% bonus has to come from somewhere.

**Source:** miners' saved cost of capital. Junior miners often pay 12–25% effective rates on alternative financing (high-yield debt, streaming agreements with Wheaton/Franco-Nevada, equity dilution). If musa gives them capital at effective 8–12% cost, the delta funds:
- 5–10% bonus passed to users
- 2–4% platform margin
- Buffer for gold price volatility during construction period

The flow:
```
User → musa (locks $100 fiat)
         ↓
musa → Miner (advances cash for forward gold delivery at discount)
         ↓
Miner produces gold → sells to refiner/LBMA pipeline
         ↓
Refiner/intermediary → repays musa (in cash, musa buys PAXG; OR direct PAXG settlement if pipeline integration achieved)
         ↓
musa → User (releases PAXG over delivery schedule per smart contract)
```

## Treasury bridge (hybrid bootstrap model)

Don't wait for full miner pipeline before launching. Fund a PAXG reserve at launch — operational gold pool serving three jobs:
1. Backs early user contracts (real obligations, real backing)
2. Generates yield while idle (Aave PAXG market: 1–3% APY currently)
3. Demonstrates solvency to miner counterparties (on-chain proof during pitches)

**Sizing:** 2–3x projected first-cohort obligations. If month 1–3 targets $200K user contracts, want $500–700K PAXG at start.

**Phasing:**
- **Phase 1 (months 1–6):** All user PAXG comes from treasury. Effectively running subsidized savings model.
- **Phase 2 (months 6–12):** First miner agreements close. New contracts partially backed by miner-pipeline PAXG, partially by treasury. Hybrid.
- **Phase 3 (year 2+):** Miner pipeline covers most new issuance. Treasury becomes buffer/overflow/emergency only.

User never sees the difference. Same UX throughout.

## Smart contract architecture

```
TreasuryReserve (PAXG pool) ─┐
                             ├─→ ContractIssuer ─→ User vesting position (per user)
MinerPipeline (incoming) ────┘
```

Issuer doesn't care which source funded a position. Verifies "is there enough PAXG in combined treasury to back this new obligation?" before issuance. **This is the solvency invariant. Anyone can read it on-chain.** This is musa's core trust offering.

**v1 minimum scope (resist adding more):**
- User locks USDC/USD via Privy
- Contract issues vesting position (struct or NFT)
- Treasury holds PAXG, releases per schedule (lazy vesting)
- User can claim accrued PAXG
- User can exit early with penalty calculation

**Defer to post-audit v2:**
- Miner repayment ingestion logic
- Multi-sig admin
- Governance
- Anything fancy

## Stack

- **Chain:** Base L2 (cheap fast EVM, Coinbase ecosystem alignment with PAXG)
- **Wallet:** Privy embedded wallets (self-custodial via passkey/biometric, NOT custodial tier)
- **Settlement asset:** PAXG bridged from Ethereum to Base. Validate bridge choice (Wormhole vs LayerZero) with audit team. For contract sizes $100–10,000, L2 is worth the bridge complexity.
- **Frontend:** React (existing prototype = `musa-prototype-v33.jsx`)
- **Smart contracts:** Solidity, audited
- **Fiat rails:** Stripe + crypto on-ramp backup (MoonPay, Transak, Ramp)
- **Off-ramp:** Partner with one good provider (Mt Pelerin, Coinbase Commerce, etc.)
- **KYC:** Persona or Sumsub. Light KYC for small accounts, full KYC above threshold ($1K–5K, jurisdiction dependent)
- **Test infra:** Foundry preferred (unless audit team specifies otherwise), Base Sepolia testnet
- **Indexing:** The Graph or Ponder for read APIs

## What goes on-chain vs off-chain

**On-chain (smart contracts on Base):**
- Each forward purchase contract (NFT or struct in registry)
- User's PAXG balance owed (vesting schedule, daily release rate)
- Penalty calculations for early exit
- Custodian attestations (signed messages from auditor) referenceable
- Total outstanding obligations vs PAXG treasury balance — solvency invariant publicly verifiable

**Off-chain (real world / traditional backend):**
- Miner agreements (legal documents in jurisdiction X)
- Refiner relationships
- Geological monitoring + production reports
- Insurance policies
- Customer KYC + fiat rails
- Customer support
- Tax reporting (1099s in US, equivalents elsewhere) — track cost basis per user position from day one, retrofit is painful

## Build sequence (the "fun ride" workflow)

Two-build approach: dirty v1 to learn + prove the model, full rebuild post-audit.

1. **v1 build (Pav + Claude, 2–3 months):** Claude writes contracts and frontend, Pav reviews and makes architectural calls. Deploy to **testnet only**. Real flows, fake money. NEVER mainnet at this stage — temptation will be to "soft launch" with $10K real value to test waters. Resist.

2. **Audit team takes v1 (months 3–4):** Pav's audit team (described as "god mode guys") reviews. Tells us what's wrong: security, gas, architecture, missing edge cases. Likely suggests substantial rewrite.

3. **v2 rebuild (Pav + Claude + audit feedback, months 4–6):** Implement audit team's recommendations. This is where "optimal stack" comes in. Maybe vesting math redone with fixed-point library. Maybe treasury withdrawal restructured with pull-pattern + access controls.

4. **Audit v2 + bless (months 6–7):** Or another iteration. Unpredictable count.

5. **Mainnet deploy with bounded exposure:** Caps at first (max $10K per user, max $500K total exposure), expand as confidence grows.

**Total realistic timeline:** 5–8 months from start to first real users with real money. Fits in 3–6 month build window + 2–3 months audit cycles.

## What Claude is and isn't as a build partner

**Strengths:** Fast Solidity contributor, no fatigue, no context-switching, internalized many patterns. Can write contracts, integrate Privy, build frontend, wire fiat rails, design state machines, write tests.

**Limits to plan around:**
- **No memory between sessions.** SPEC.md + ARCHITECTURE.md + codebase ARE the memory. Pav becomes institutional memory keeper. Every architectural decision needs to land in writing or it gets re-litigated.
- **No production runtime.** Claude can't be paged at 3am. Pav deploys, monitors, responds to incidents. Claude debugs from logs Pav brings.
- **Will confidently write subtly wrong Solidity.** Reentrancy, integer overflow in obscure paths, oracle manipulation, signature replay, MEV vulnerabilities, edge cases in vesting math — exactly the categories where LLMs produce plausible-looking buggy code. **Audit team is not optional. They are the actual safety layer.**
- **No knowledge of Pav's specific operational/jurisdictional context.** Patterns yes, decisions no.

## What Claude needs from Pav to make it work

- **Decisions, not preferences.** "Should penalty curve be linear, exponential, stepped?" needs a business answer, not "you decide."
- **Specs in writing.** Every feature, parameter, flow in a doc that survives between sessions.
- **Audit team's standards upfront.** Patterns they require/forbid. Foundry vs Hardhat. OpenZeppelin version. Get the list before building, saves rewrites.
- **Real test environment.** Base Sepolia, staging where trusted users poke at it for weeks before mainnet.
- **Legal/jurisdiction clarity.** Lawyer engaged before contract design freezes.

## Risks to plan for

1. **Compliance interpretation flips.** Forward purchase contracts on commodities sit in fuzzy zone. CFTC, SEC, state regulators all have potential claims. Get real fintech/crypto lawyer in launch jurisdiction BEFORE taking user funds.

2. **Treasury impairment from gold price moves.** Gold drops 15% during user lock period — treasury buys more grams per dollar going forward but existing obligations stay nominal. Track real-time obligation coverage. Possibly hedge in futures market.

3. **First miner default WILL happen.** Plan for it. Build legal framework, insurance layer, public communication playbook BEFORE needed. A handled default builds trust ("system worked as designed"). Unhandled one kills the company.

4. **Regulatory change in custody jurisdiction.** Paxos is NYDFS-regulated. If NYDFS action, audit failure, or sanctions issue at Paxos, settlement layer compromised. Backup plan: XAUT (Tether Gold) as second source. Design contracts so swapping settlement assets is possible without migration — abstract "gold token" as interface.

5. **Operational readiness gaps.** Even with perfect code: runbooks for "user disputes balance," "miner missed delivery," "Paxos paused account," "gold price moved 20% overnight," "regulator calls." Real preparation needed.

6. **Treasury key management.** The keys to the PAXG treasury wallet are the most valuable thing in the company. Multi-sig, hardware wallets, signing procedures, disaster recovery — design and rehearse before mainnet.

## Jurisdiction strategy

**Don't try to launch globally on day 1.** Pick one jurisdiction with clear rules for tokenized commodities:
- Switzerland (DLT law)
- UAE (VARA framework)
- Singapore (MAS framework)

Get legal structure right there, build to that. Expand later. **US-first launch would be aggressive and potentially fatal.**

## Operational cost reality

On-chain operations have ongoing costs pure-fintech competitors don't have:
- Gas (sponsored by platform via paymaster)
- Oracle subscriptions (Chainlink for gold price feed if needed)
- Indexer infrastructure (The Graph hosted plan or self-hosted Ponder)
- Monitoring (Tenderly, Forta)
- Key management infrastructure
- Multi-sig coordination overhead

Estimate: $5–15K/month in operational costs that traditional competitors don't pay. Worth it for the trust premium, but real burn.

## Honest framing of what musa is

The platform is structurally similar to Centrifuge, Maple, Ondo, Goldfinch, Backed — RWA platforms converging on the same pattern: real-world asset, tokenized custody, on-chain accounting, traditional fintech UX wrapped around it. The pattern works because it's the only honest way to bring real assets on-chain at scale without becoming a vault company.

**What makes musa interesting is the specific user proposition** (forward purchase contracts on physical mining production, retail-friendly, time-locked savings frame) rather than the architecture. Architecture is becoming standard. **Edge is the product design, brand, miner relationships, and UX** — Pav is already strong on these.

## Trust kernel

The minimum trust users must extend, in order:
1. **Paxos** holds real gold (mitigated: NYDFS regulation, monthly audits, proven track record)
2. **musa** is solvent (mitigated: on-chain solvency invariant, anyone can verify)
3. **musa** will not freeze withdrawals (mitigated: smart contracts are public, withdrawal logic is deterministic, no admin override on user funds)
4. **musa** delivers PAXG matching contract terms (mitigated: vesting math is on-chain, code is audited)

That's the entire trust ask. Smaller than any traditional gold investment product. This is the actual marketing story.

## Co-founder context

Pav's co-founder is described as a "Farafina co-owner alike type" — meaning insider relationships in the junior mining world. This is the missing piece most RWA crypto projects don't have. Without insider relationships, junior miner agreements take 18+ months of cold introductions. With them, quarters not years.

Strategy: while technical build happens (3–6 months), co-founder negotiates with top-level junior miner contacts using prototype + Monte Carlo sim + this architecture doc as pitch materials. Some operational reserve funded from start, kept in PAXG, used as both backing and credibility signal.

## Open questions to resolve before contract design freezes

1. **Custody model:** Pure PAXG (your reserve = your PAXG holdings) or pooled vault with on-chain ledger? PAXG-only is cleaner architecturally, simpler to audit.

2. **Settlement asset abstraction:** PAXG-only at launch but design the interface so XAUT or future basket could substitute? Recommended yes — minor extra complexity, large optionality value.

3. **Penalty curve shape:** Linear, exponential, stepped? Affects exit-economics math — should reflect business judgment about how much friction you want vs how much fairness.

4. **Tier reversibility:** Can a user move funds between tiers mid-lock (e.g., upgrade Spark → Flow)? Probably no in v1 (massive complexity), but worth deciding explicitly.

5. **Auto-claim vs manual claim on completion:** When contract completes, does PAXG auto-transfer to user wallet, or do they need to tap "claim"? Auto is friendlier UX, manual is cheaper gas-wise.

6. **Multi-jurisdiction launch order:** Which jurisdiction first, what's the expansion sequence?

7. **Bridge selection for PAXG → Base:** Wormhole, LayerZero, or stay on Ethereum mainnet? Audit team should weigh in.

These are the Pav-decides items. Claude can lay out tradeoffs but can't make the calls.

---

## Continuation prompt for Claude Code

```
Read SPEC.md, ARCHITECTURE.md, and musa-prototype-v33.jsx in this repo.
This is the musa project — a retail forward-gold-purchase platform on Base
L2 using PAXG as settlement. Pav is the founder; you (Claude) are the
build partner. Pav's audit team will review and rebuild post-v1.

Resume work where left off. Respect the brand voice (lowercase musa,
no trailing periods on hero copy, slow breathing animations, terse
exchanges). Confirm any architectural decisions against ARCHITECTURE.md
before deviating. Capture new decisions in writing as we go.
```
