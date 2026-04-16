# musa

Retail forward-gold-purchase platform. Users lock USD for 6 / 12 / 24 months and receive physical gold delivered gram-by-gram to their wallet at a discount to spot. Built on PAXG (settlement), Privy (wallets), Base L2 (chain).

This repo is the **prototype + working documents stage.** Not production code. The prototype is a single-file React app that demonstrates the full onboarding flow, home dashboard, buy/exit flows, and all animation systems. It runs standalone via Vite.

---

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The prototype renders the app inside a phone frame at 390×844. All state persists to localStorage. Reset via the settings gear on home → Reset.

---

## Repo structure

```
musa/
├── README.md               ← you are here
├── CLAUDE.md               ← build conventions, working style, do's and don'ts
├── docs/
│   ├── SPEC.md             ← product & UX spec (screens, brand, animations, state)
│   ├── ARCHITECTURE.md     ← technical decisions (PAXG, Privy, Base, contracts)
│   └── BUSINESS.md         ← economic model, scenarios, simulator results
├── prototypes/
│   ├── musa-prototype-v33.jsx   ← current single-file prototype (the app)
│   └── musa-simulator.jsx       ← economic simulator (personas, scenarios, Monte Carlo)
├── src/
│   ├── main.jsx            ← Vite entry, renders the prototype
│   └── App.jsx             ← thin wrapper that imports the prototype
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## For Claude Code (continuation prompt)

When opening this repo in Claude Code for the first time, the following prompt gives you enough context to resume work:

```
Read these files in order:
  1. README.md
  2. CLAUDE.md
  3. docs/SPEC.md
  4. docs/ARCHITECTURE.md
  5. docs/BUSINESS.md
  6. prototypes/musa-prototype-v33.jsx

This is the musa project — a retail forward-gold-purchase platform on Base L2
using PAXG as settlement. Pav is the founder; you are the build partner.
Pav's audit team will review and rebuild contract code post-v1.

Respect the brand voice: lowercase "musa", no trailing periods on hero copy,
slow breathing animations (not aggressive), terse direct exchanges, real math
over exaggerated. Confirm any architectural decisions against ARCHITECTURE.md
before deviating. Capture new decisions in the relevant doc as we go.

Current state: single-file React prototype is production-quality UI. Next step
is to split into components, wire real backend (currently localStorage), and
begin Solidity contract design per ARCHITECTURE.md "build sequence".
```

---

## Current status

- **UI prototype:** complete (v33). Onboarding, home, buy, exit, animations — all working.
- **Economic simulator:** complete. Three scenarios (Base/Optimistic/Stressed), three personas (Curious/Saver/Whale), weekly simulation step.
- **Smart contracts:** not started. See `docs/ARCHITECTURE.md` § "Build sequence".
- **Backend / wallet integration:** not started. Prototype uses localStorage.
- **Miner agreements:** co-founder is handling relationship work. Not code.
- **Legal/jurisdiction:** pending. See `docs/ARCHITECTURE.md` § "Jurisdiction strategy".

---

## What's in the prototype (`musa-prototype-v33.jsx`)

~3400 lines. Single file by design — easy to hand off, easy to read end-to-end. Production build would split into modules.

- **7-screen onboarding flow** (snap-scroll): hook, Mansa Musa lore, gold-vs-dollar chart, mine-to-wallet animation, tier columns, safe-and-sound ingot screen, connect-the-dots CTA with live physics singularity
- **Home dashboard** with active/completed mine cards, total grams, pending grams
- **Buy flow:** browse tiers → select amount → confirm
- **Unit detail:** per-mine progress with construction/delivery phases
- **Exit flow:** early-exit calculation with time-elapsed penalty
- **Dev strip** (hidden behind settings gear): time multiplier for testing time-based delivery, gold price display, unit toggle, reset

The connect-the-dots screen runs a physics-based particle system (rising river + orbital vortex + gravity-well singularity) with requestAnimationFrame proximity detection firing synchronized arc/fill/endpoint/logo pulses on each consumption event. Details in `docs/SPEC.md` § "Animation systems".
