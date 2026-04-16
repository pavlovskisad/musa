# CLAUDE.md

Working conventions for Claude Code on the musa project. Read this before writing anything. These are not preferences — they are the rules that make collaboration work at speed.

---

## Who Pav is

Builder-founder. Has shipped products with 10-20 person teams. Knows his stuff across design, code, crypto, and business. Terse, direct communication. Casual English, occasional Russian-influenced phrasing ("ye", "nah"). Catches bugs from screenshots — if he sends one, look closely.

## What Pav needs from you

- **Decisions, not preferences.** If he asks "A or B?", pick one and argue for it. Don't ping-pong the choice back. When you don't have enough info to pick, ask ONE crisp clarifying question and wait.
- **Confidence with honesty.** State what you believe, then flag what you're not sure about. Never hedge just to hedge.
- **Writing over talking.** Anything architectural lands in the relevant `docs/*.md` file. If a decision isn't written down, it didn't happen.
- **Small turns.** Don't bundle 10 changes into one edit. One change, test, next change.

## Voice & brand rules (these are LOCKED)

- `musa` is **always lowercase**. Never "Musa", never "MUSA" except inside the musa-logo class span where it's styled as a small-caps tracked label.
- **No trailing periods** on hero copy. Examples: "Mine real / gold", "better than / money", "more than / you paid for", "touch the musa". Lore prose (Mansa Musa Q&A block) uses natural punctuation.
- **Italic gold second line** on hero couplets — the stressed word ("gold", "money", "you paid for", "the dots") in Fraunces italic, gold color. Cream italic on the gold "safe and sound" screen.
- **"Real gold · real mines · delivered"** is the persistent footer. Don't reword.
- Tone: confident, declarative, minimal. No marketing-speak. No exclamation points. Copy doesn't hedge.
- Animations: slow, breathing, subtle. Cycles in the 3-6s range. Never aggressive, never attention-grabbing. Real physics and real math over exaggerated curves.

## Color palette (CSS variables in `:root`)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0908` | near black — app background |
| `--text` | `#e8e6e0` | warm off-white — body text |
| `--text-dim` | `rgba(232, 230, 224, 0.54)` | dim labels |
| `--gold` | `#c9a961` | primary accent |
| `--gold-light` | `#e4c57e` | hover / light accent |
| `--surface` | `#161513` | card background |
| `--border` | `rgba(255,255,255,0.08)` | thin dividers |

Warmer cream tones for flashes/highlights: `#F4DE9D`, `rgba(255, 248, 220, 1)`.

## Fonts (Google Fonts, imported in the CSS block)

- **Geist** — default UI sans-serif. Everything unless overridden.
- **Fraunces** — display serif (`.font-display`). Variable, optical sizing. Used for headlines.
- **Geist Mono** — monospace (`.font-num`). Tabular numerals. Used for numbers and micro-labels.

## Code conventions

- **React with hooks only.** No class components. Prefer `useState`, `useEffect`, `useRef`, `useMemo`, `useContext`.
- **Tailwind utilities for layout**, inline styles for animation-driven values (opacity, transform, filter) that need per-render computation.
- **CSS animations via keyframes injected in one `<style>` block** at the top of `App`. For per-particle dynamic keyframes (vortex), generate the CSS as a string and inject via `<style>{keyframesString}</style>` scoped to the screen.
- **Refs for imperative DOM touches** (adding/removing classes on eat pulses) — don't re-render the whole subtree for a transient visual state.
- **Seeded pseudo-random** for particle generators (`let seed = N; const rand = () => ...`) so layouts are deterministic across renders. Particles use `useMemo` with empty deps.
- **Keep the prototype single-file** until explicitly asked to split. Easy to read end-to-end, easy to hand off. Production build is a separate milestone.
- **Comments explain WHY, not WHAT.** Skip "increment counter" comments. Write "three-phase radius curve: drift, linger, collapse — see SPEC §animations" instead.

## Layout defaults

- Phone frame: 390×844 (iPhone 14 Pro). Test here first.
- `scroll-snap-type: y mandatory` on onboarding container. Screens are full-viewport `scrollSnapAlign: start`.
- Safe areas: top padding typically `pt-20` on onboarding screens, `pt-4` on app screens (phone has a notch).

## State management

Single `App` component owns all state. Screens are pure components. Shared values flow through `GoldContext`. localStorage persists `units` array and user settings. See SPEC § "State management" for full state shape.

## Performance rules

- **No `localStorage` in artifacts** — but this repo IS an artifact host, so localStorage is fine and encouraged for prototype state.
- **No third-party animation libraries** (GSAP, Framer Motion) — use CSS keyframes and small rAF loops. Keeps the file portable and dependency-light.
- **`will-change: transform, opacity`** on anything animated frequently.
- **Particle counts:** 40-80 per field is the working range. Above 100 on mobile starts to warm up the device. The connect-the-dots river (400) is the exception, tested to run fine on iPhone 14 Pro.

## What NOT to do

- **Don't add marketing copy.** No "revolutionary", "seamless", "empower". If in doubt, remove the adjective.
- **Don't add emojis anywhere in the UI.** Gold dots, SVG marks, and lucide icons only.
- **Don't add dependencies without asking.** The dep list is: react, react-dom, lucide-react, tailwindcss. That's it.
- **Don't merge multiple animation systems into one.** River particles, vortex particles, singularity glow, arc sweep, endpoint flashes, label flashes, musa logo pulse — each is its own system with its own CSS/rAF logic. Keep them isolated so tuning one doesn't break another.
- **Don't write Solidity confidently.** When contract code starts, flag any reentrancy, integer-overflow, oracle-manipulation, signature-replay, or MEV concern proactively. Audit team is the safety layer — write defensive code and trust them to find what you missed.
- **Don't speculate about market data, gold price trajectories, or macro conditions.** The simulator has persona parameters locked to real research (pump.fun churn studies, junior mining capital costs). Don't introduce new numbers without Pav approving the source.
- **Don't reduce the mine-to-wallet narrative to abstract finance.** The brand edge is that musa is grounded in real physical gold from real working mines. Never drift toward generic fintech copy.

## Working cadence

1. Read the relevant section of the relevant doc before changing code.
2. Make ONE change.
3. Test (or describe what to test).
4. If it's architectural, update the doc.
5. Next change.

If you catch yourself writing more than ~200 lines of code without a doc update, pause. Something probably needs to land in writing before continuing.

## Known open work (as of v33)

Pending items from the last session, not yet in other docs:

- **Tier 2**: junior miner executive pitch deck (separate Keynote/deck, not code)
- **Tier 3**: legal structure sketch (jurisdiction, entity, contract templates)
- **Tier 5**: platform funding raise deck (separate deck)
- **Component splitting**: prototype is single-file; production will split
- **Backend**: localStorage → real API. Not started.
- **Wallet integration**: Privy embedded wallets. Not started.
- **KYC flow**: Persona or Sumsub. Not started.
- **Smart contracts**: Solidity on Base. Not started. See ARCHITECTURE § "Build sequence".
- **Device testing**: prototype is optimized for 390×844, verify safe-area on other iOS sizes.

## Continuation discipline

When a session ends or gets compacted:
- Update `docs/SPEC.md` with any new screen/flow details
- Update `docs/ARCHITECTURE.md` with any new technical decisions
- Update `docs/BUSINESS.md` with any new economic parameters or scenarios
- Update this file (`CLAUDE.md`) with any new working-style rules we agreed on

The docs ARE the memory. Treat them as sacred.
