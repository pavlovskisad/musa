# musa — Product & UX Spec

A consumer mobile app for buying forward purchase contracts on physical gold from working junior mines. Users lock USD for 6 / 12 / 24 months and receive gold delivered gram-by-gram to their wallet at a discount to spot price. Longer lock = bigger discount.

This spec describes the current prototype (`prototypes/musa-prototype-v33.jsx`). It is a single-file React app covering the full user journey: onboarding, home dashboard, browse/buy flows, unit detail, exit flow, and all supporting animation systems.

See `ARCHITECTURE.md` for technical decisions (PAXG, Privy, Base L2, contracts). See `BUSINESS.md` for economic model and scenarios.

---

## Brand & voice

- Name is always **lowercase** `musa`. Never capitalized except inside the `.musa-logo` small-caps tracked label.
- Reference anchor: **Mansa Musa**, 14th-century emperor of Mali, often cited as the wealthiest person in history. The name carries ancient, real, physical gold wealth.
- **No trailing periods** on hero copy: "Mine real / gold", "better than / money", "more than / you paid for", "safe and / sound", "touch the musa". Lore prose uses natural punctuation.
- Second line of each hero couplet is **italic gold** (Fraunces italic) — the stressed word: "gold", "money", "you paid for", "the dots". On the gold "safe and sound" screen, accent is **cream italic**.
- **"Real gold · real mines · delivered"** is a persistent footer across screens.
- Tone: confident, declarative, minimal. No marketing-speak. No exclamation points.
- Animations: slow, breathing, subtle. 3-6s cycles. Physical plausibility > exaggeration.

## Fonts (Google Fonts, imported in the CSS block)

| Font | Usage | Class |
|---|---|---|
| **Geist** | Default UI sans-serif — body text, UI chrome | (default) |
| **Fraunces** | Display serif — big headlines, italic accents | `.font-display` |
| **Geist Mono** | Numerical values, micro labels. Tabular numerals enabled | `.font-num` |

## Color palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0908` | near black — app background |
| `--text` | `#e8e6e0` | warm off-white — body text |
| `--text-dim` | rgba(232, 230, 224, 0.54) | dim labels |
| `--gold` | `#c9a961` | primary accent |
| `--gold-light` | `#e4c57e` | hover / light accent |
| `--surface` | `#161513` | card background |
| `--border` | `rgba(255,255,255,0.08)` | thin dividers |

Warmer cream tones used for flashes/highlights: `#F4DE9D`, `rgba(255, 248, 220, 1)`.

---

## Screen architecture

### Onboarding (7 snap-scroll screens)

Container: `scroll-snap-type: y mandatory`. Each screen is one viewport tall. The `activeScreen` index is derived from `scrollTop / clientHeight`.

1. **Mine real gold** — hook. Only `Begin` button here (subsequent screens have no button). ChevronDown scroll hint pulses at the bottom indicating scroll-to-continue.
2. **Lore** — Mansa Musa Q&A block. Radar pulse background (three heartbeat rings emanating from below the text).
3. **Better than money** — gold-vs-dollar SVG chart drawing on screen entry. Caption directly under headline: "$1 in 1971 buys 4¢ of gold today".
4. **From mine to your wallet** — falling gold grains accumulate into a soft pile at the bottom. Caption: "directly, gram by gram".
5. **More than you paid for** — three vertical tier columns (Spark / Flow / Vein). Base section is 240px fixed height across all three. Bonus sections are TRUE proportional to discount %: Spark 6px (2.5%), Flow 17px (7%), Vein 45px (18.8%). Caption: "lock longer for better".
6. **Safe and sound** — entire screen is a gold ingot (uses the `unit-card-complete` gradient). Slides up from below when active (prevents snap-seam bleed). Deep brown-black text. Italic cream accent. Assay mark at top "AU · 999.9 FINE". Heater shield + checkmark icon pops in with elastic curve (shield at 1.05s, checkmark draws at 1.75s). Shimmer sweep across the ingot starts at 0.9s. Caption: "audited custody, yours to claim, anytime".
7. **Connect the dots** — the closing CTA. See § "Connect-the-dots physics system" below. Tapping the circle = enter the app.

Only screen 0 has the Begin button. Screens 1-5 are narrative — user scrolls through them. Screen 6 circle tap = enter app.

### App screens

| Screen | Header | Purpose |
|---|---|---|
| **Home** | Back (→ onboarding), centered musa logo, settings gear (opens DevStrip) | Dashboard: total grams, USD value, pending grams, mine list, `+ New mine` CTA |
| **Browse** | Back (→ home), centered logo, phantom spacer | Pick tier: Spark / Flow / Vein |
| **Buy** | Back (→ browse), centered logo, phantom spacer | Confirm amount, see receive preview, "Buy [tier]" |
| **UnitDetail** | Back (→ home), centered logo, status text | View specific mine's progress: construction phase, delivery phase, grams delivered |
| **Exit** | Back (→ unitDetail), centered logo, phantom spacer | Close a mine early with penalty calculation |

All non-onboarding screens have back arrow on left, centered logo (identity mark, NOT clickable — back button handles navigation), right-side context.

---

## Tier economics (Tier 1 — locked)

| Tier | Lock | Bonus | Cancellable | Notes |
|---|---|---|---|---|
| Spark | 26 weeks (6 mo) | 2.5% | No — committed | Entry-level |
| Flow | 52 weeks (12 mo) | 7% | Yes — with penalty | Core tier |
| Vein | 104 weeks (24 mo) | 18.8% | Yes — with penalty | HNW tier |

- **Construction period:** 30 days (4 weeks) after purchase before delivery begins.
- **Daily delivery rate:** `total grams / (lockMonths × 30)` during delivery phase.
- **Exit penalty:** depends on % elapsed at exit time. Earlier exit = bigger penalty. Helper: `getExitPenaltyPct(elapsedPct)`.

Tier bonuses are expressed as a discount to spot. Locking $100 Flow means paying for ~93.5% of the gold grams at spot price; user receives 100% grams. Sourced from miners' saved cost of capital — see `ARCHITECTURE.md` § "Where the discount comes from".

---

## Animation systems

### Splash sequence (3.2s on app load)

1. Spark glow fades in (2.2s, cubic-bezier ease)
2. At 1.4s: dot expands (scale 0 → 20 over 1.6s)
3. At 2.4s: splash overlay fades out (0.8s)
4. Onboarding screen 0 entrance animations fire on label, headline, subtitle, button at staggered delays

### Reusable primitives

| Class | Behavior |
|---|---|
| `.musa-logo` | Breathing text-shadow glow (4.2s ease-in-out) + 5.5s shimmer sweep across letters |
| `.snap-button` | Drifts in from below when its screen is active (`translateY(80px) → 0`, opacity 0 → 1) |
| `.particle` + `.particle-drift` | Small gold dots drifting upward — ambient fill on various screens |
| `.particle-river` | Slow fullscreen rise from bottom edge to above top, with horizontal drift via `--drift-x` |
| `.surface-breath` | Subtle background-color oscillation on active mining cards |
| `.unit-card-complete` + `-shimmer` | Completed mines become gold ingots with diagonal cream-white shimmer sweep every 4.5s. Dark text on gold for contrast. |
| `.tier-bonus`, `.tier-base` | Vertical column animation (height transitions) for tier discount columns on screen 4 |

### Screen 3 "Better than money" chart

SVG gold-vs-dollar chart. Two paths animated via `stroke-dasharray` + `stroke-dashoffset`. Path lengths computed so both draw in proportion to real data (gold rising exponentially, dollar collapsing near-linear). Begins drawing when `activeScreen === 2`.

### Screen 4 "From mine to your wallet" grain delivery

Falling gold grains accumulate into a pile at the bottom. Animations only run when the parent has `.grains-on` class (added when `activeScreen === 3`). Grains animate the `top` property (parent-relative) rather than `translateY` percentages (which reference the 4px grain itself, not parent).

### Screen 5 tier columns

Three vertical columns. Base section 240px fixed. Bonus section heights are **proportional to discount %**: Spark 6px (2.5%), Flow 17px (7%), Vein 45px (18.8%). Heights transition in when `activeScreen === 4`.

### Screen 6 "Safe and sound" gold ingot

The ENTIRE SCREEN is a gold ingot. Inner `.vault-screen-bg` div slides up from below (translateY 100% → 0, 0.18s delay) when active — prevents seam-bleed during snap scroll. Shield icon pops in with elastic curve (scale 0 → 1.05 at 1.05s), checkmark SVG path draws via stroke-dasharray animation at 1.75s. Shimmer sweep across the ingot starts at 0.9s.

### Screen 7 "Connect the dots" physics system

This is the most complex animation system in the app. See dedicated section below.

---

## Connect-the-dots physics system

The closing CTA screen runs a real physics simulation. Three layers of particles plus a reactive singularity, all orchestrated by a requestAnimationFrame loop.

### Layer 1 — Ambient river (background)

**400 particles** slowly rising from below the screen to above the top edge.

- Zone-weighted distribution: 45% left gutter (left 0-32%), 45% right gutter (left 68-100%), 10% center band (32-68%). Center-band particles are forced small + dim so they read as deep background.
- **Depth-tiered sizes/opacities**:
  - 55% background (1px, opacity 0.20-0.45)
  - 33% midground (1.5px, opacity 0.45-0.70)
  - 12% foreground (2px, opacity 0.60-0.90)
- Each particle has its own duration (12-20s), horizontal drift (-15 to +15px), negative delay so river is fully populated at t=0.
- Keyframe: `particleRiver` — translateY 0 → -110vh, opacity fades in 0-8% and out 92-100%.

Purpose: creates the sense of a continuous cosmic current flowing past the central circle, with the circle a small gravitational feature in a vast field.

### Layer 2 — Orbital vortex (foreground)

**48 particles** spiraling inward toward the circle's center, uniform clockwise direction.

- Each particle enters at the circle's visible arc boundary (radius 125-140px — narrow capture band).
- Makes **3.2 full clockwise turns** during its life.
- Duration 24-30s per particle. Tight variance → uniform visual speed matching the river drift rate.
- **Three-phase radius decay** (`connectVortex` generator):
  - **0-55%**: outer drift, radius 1.0 → 0.55 (linear, gentle)
  - **55-88%**: inner orbit, radius 0.55 → 0.15 (slower decay, particle visibly circles tight to center)
  - **88-100%**: final collapse, 0.15 → 0 (sharp, `t^1.8` curve)
- Angular velocity is uniform throughout (linear angle progression).
- 22 waypoints per particle — each waypoint becomes a CSS keyframe percentage stop.
- Each particle has its own unique `@keyframes vortexN` injected via a single `<style>{vortexKeyframes}</style>` block in the screen. Animation name bound via inline `animationName: vortex${i}`.

### Layer 3 — Singularity glow (center)

48px radial gradient at the exact center of the circle. Dim baseline when screen is active (opacity 0.55, scale 0.9). Transitions defined so class-toggle produces smooth punch-and-decay.

- `.singularity-glow-on` — dim baseline (opacity 0.55, scale 0.9)
- `.singularity-glow-eat` — bright peak (opacity 1.0, scale 1.15, brightness 1.4). Added briefly on each eat event, then removed → CSS transitions handle the decay.

### The reactive system

A `requestAnimationFrame` loop runs while `activeScreen === 6`. Each frame:

1. Computes live `(x, y)` for every vortex particle by interpolating between adjacent waypoints based on elapsed time and each particle's `delay` + `dur`.
2. Checks which particles are currently inside `CAPTURE_RADIUS = 32` of center.
3. Tracks per-particle `wasInside` flag. A particle crossing INTO the radius (was outside last frame, inside now) is an **entry event** → increments `entryCount`.
4. When `entryCount >= EAT_EVERY` (currently **6**), fires an eat event and resets counter.

On an eat event, the following fire in synchronized choreography:

| Element | Timing in 950ms pulse | Effect |
|---|---|---|
| Singularity glow | 0ms → 180ms | Scale 1.15, brightness 1.4, class removed, CSS transition decays |
| Fill | 0ms → 180ms | Opacity 0.95, scale 1.08, class removed, CSS transition decays |
| musa logo | **10%** peak (~95ms) | Scale 1.15, brightness 1.4, decays by 35% |
| Arcs (grey + gold) | 0 → 45% peak (~430ms) | `strokeDasharray` draws grey right-side + gold left-side simultaneously. Both use `key={grey-${arcPulse}}` / `gold-${arcPulse}` so the animation restarts on each eat. Fades out by 100%. |
| "you" label (top) | **48%** peak (~456ms) | Color cream → near-white, letter-spacing 0.3em → 0.42em, text-shadow glow |
| USER dot (top) | 48% peak | Fill bright cream, scale 1.6. Key tied to arcPulse. |
| "miners" label (bottom) | 48% peak | Color dim grey → warm light gold, spacing expand, text-shadow |
| MINERS dot (bottom) | 48% peak | Fill light gold, scale 1.6 |

The narrative: singularity bites (0ms, center) → musa logo pops (95ms, center) → arcs propagate outward (95-430ms) → endpoints light up (456ms, top + bottom) → everything fades (456-950ms). Wave-out-from-center.

### Tunable constants (top of the detector `useEffect`)

```js
const CAPTURE_RADIUS = 32;  // px from center — glow's feeding zone
const EAT_EVERY = 6;         // how many entries trigger a pulse
```

No cooldown currently. The counter-based system produces natural rhythm because particles enter the radius at a fairly steady rate (~2/sec given 48 particles cycling through 24-30s). If rapid-fire pulses appear during natural clusters, add a minimum cooldown (400-500ms floor). Current behavior = fully reactive.

### Connect-the-dots layout

- Circle: 220px button, aria-label "Begin", `onClick={onContinue}`
- Fill: 200px diameter, centered. Radial gradient, 3px blur. `.connect-fill-on` adds dim baseline (opacity 0.55, scale 1). `.connect-fill-punch` is the eat class.
- SVG: 220×220 viewBox containing two arc paths (grey user→miners clockwise via right, gold miners→user via left) + USER dot (cx=110 cy=10 r=4) + MINERS dot (cx=110 cy=210 r=4) + MUSA text logo at center.

---

## State management

Single `App` component owns all state. Screens are pure components receiving props.

### Core state

| Variable | Purpose |
|---|---|
| `screen` | Current route ('onboarding' \| 'home' \| 'browse' \| 'buy' \| 'unitDetail' \| 'exit') |
| `units` | Array of created mining units (persisted to localStorage) |
| `simTime` | Simulation clock value in ms (advanced by timeMult) |
| `timeMult` | Clock multiplier (1x real, 1d/s, 1w/s, 1mo/s) — for testing time-based delivery |
| `goldPrice` | Current gold price per gram (fetched from CoinGecko PAXG on mount, fallback to `DEFAULT_GOLD_PRICE_PER_GRAM`) |
| `priceSource` | 'live' \| 'default' — indicator |
| `goldUnit` | Display unit ('g' \| 'oz') |
| `selectedTier`, `selectedAmount`, `selectedUnitId` | Flow context |
| `creating`, `celebratingUnit` | Overlay state |
| `devOpen` | DevStrip visibility |
| `splashActive` | Splash overlay state |

### Derived state

- `computedUnits` — takes raw units + simTime, computes `pctDelivered`, `gramsDelivered`, `computedStatus` (`constructing` \| `active` \| `completed` \| `exited`).
- `visibleUnits` — filters out exited units, sorts completed ones to bottom of list.

### `GoldContext`

Exposes `goldPrice`, `goldUnit`, and `unit` (= goldUnit) so any screen can display grams/oz without prop-drilling.

---

## Dev strip controls

Hidden behind settings gear on home screen. Opens a slide-down panel with backdrop.

- **Time multiplier:** 1x / 1d/s / 1w/s / 1mo/s (advances simTime proportionally to real clock)
- **Gold price display:** live value from CoinGecko PAXG ticker, or default fallback (labeled)
- **Unit toggle:** g / oz
- **Reset button:** clears all state, returns to splash

Used by Pav to test time-based delivery progression without waiting weeks.

---

## Constants

| Constant | Value | Meaning |
|---|---|---|
| `DEFAULT_GOLD_PRICE_PER_GRAM` | 150 | USD per gram fallback |
| `GRAMS_PER_TROY_OZ` | 31.1035 | g↔oz conversion |
| `CONSTRUCTION_DAYS` | 30 | Days before delivery begins |
| `PROCESSING_FEE` | 0.02 | 2% platform fee |

---

## File structure (prototype)

`musa-prototype-v33.jsx` — single file, ~3400 lines.

- Top: imports (React + lucide-react), CSS variables in :root, constants, helper functions (formatGold, formatUSD, getExitPenaltyPct, daysBetween), big `<style>` block
- `GoldContext` — provides gold price/unit globally
- Default export `App` — all state + screen routing + overlay rendering
- `MusaLogo` — the small-caps tracked identity mark component
- Screen components: `OnboardingScreen`, `HomeScreen`, `BrowseScreen`, `BuyScreen`, `UnitDetailScreen`, `ExitScreen`
- UI primitives: `UnitCard`, `Row`, `Particles`, `Radar`, `DevStrip`, `CreationOverlay`, `CelebrationOverlay`

---

## Known TODOs / open work

- Wire to real backend (currently localStorage)
- Privy embedded wallet integration
- Persona or Sumsub KYC flow
- Smart contract design + Solidity implementation (see `ARCHITECTURE.md` § "Build sequence")
- Split prototype into component modules for production
- Test on actual mobile devices beyond 390×844 (iPhone mini, Max, Android)
- Safe-area verification for various iOS device sizes
- **Tier 2**: junior miner pitch deck (separate deliverable)
- **Tier 3**: legal structure sketch (jurisdiction, entities, templates)
- **Tier 5**: platform funding raise deck (separate)
