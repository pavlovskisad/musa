"""musa bonus-fundability model. Reproduces every model figure in docs/TREASURY.md.

Run: python3 docs/research/treasury-model.py

Conventions
- Yields are GOLD-denominated effective annual rates unless a line says USD.
- A position: the user pays 1 (in gold value) at t=0. The treasury turns a fraction k of it into
  gold at t=0. The liability is (1 + d) of gold, where d is the tier bonus.
- Delivery: nothing for the construction window c (30 days, SPEC), then linear to the end of the
  lock L. This mirrors _vestedGrams in contracts/src/Musa.sol. 'bullet' = everything at L.
- Tiers come from src/app/lib/tiers.js. Personas, tier weights, CAC, marketing budget and exit
  rates come from prototypes/musa-simulator.jsx. Nothing here changes those inputs.
"""
import math

C = 30 / 360
TIERS = [("Spark", 0.5, 0.025), ("Flow", 1.0, 0.07), ("Vein", 2.0, 0.188)]


def mean_discount(y_cont, L, shape, c=C, n=4000):
    """Mean of exp(-y t) over the delivery schedule."""
    if shape == "linear":
        return sum(math.exp(-y_cont * (c + (L - c) * (i + 0.5) / n)) for i in range(n)) / n
    if shape == "backhalf":  # nothing until L/2, then linear to L
        return sum(math.exp(-y_cont * (L / 2 + (L / 2) * (i + 0.5) / n)) for i in range(n)) / n
    if shape == "bullet":
        return math.exp(-y_cont * L)
    raise ValueError(shape)


def required_yield(L, d, shape, k=1.0):
    """Effective annual yield at which k of gold today funds (1+d) delivered per `shape`."""
    lo, hi = -0.5, 3.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if (1 + d) * mean_discount(mid, L, shape) > k:
            lo = mid
        else:
            hi = mid
    return math.exp((lo + hi) / 2) - 1


def fundable_bonus(y_eff, L, shape, k=1.0):
    """Largest bonus d that an engine yielding y_eff funds."""
    return k / mean_discount(math.log(1 + y_eff), L, shape) - 1


def avg_life(L, shape):
    return {"linear": (C + L) / 2, "backhalf": 0.75 * L, "bullet": L}[shape]


def pct(x, nd=1):
    return f"{x * 100:.{nd}f}%"


print("1. Average life of a gram (years)")
for shape in ("linear", "backhalf", "bullet"):
    print(f"   {shape:9}", "  ".join(f"{n} {avg_life(L, shape):.3f}" for n, L, d in TIERS))

print("\n2. Gold-terms yield needed to fund today's bonus")
for label, shape, k in (("linear, k=1.00", "linear", 1.0), ("linear, k=0.94", "linear", 0.94),
                        ("bullet, k=1.00", "bullet", 1.0)):
    print(f"   {label:15}", "  ".join(f"{n} {pct(required_yield(L, d, shape, k))}" for n, L, d in TIERS))

print("\n3. Solvency ratio at issuance with no reserve")
for k in (1.0, 0.94):
    print(f"   k={k:.2f}", "  ".join(f"{n} {pct(k / (1 + d))}" for n, L, d in TIERS))

print("\n4. Bonus funded per 1%/yr of gold-terms yield")
for shape in ("linear", "backhalf", "bullet"):
    print(f"   {shape:9}", "  ".join(f"{n} {pct(fundable_bonus(0.01, L, shape), 2)}" for n, L, d in TIERS))

print("\n5. Bonus funded by an engine yielding 1% / 2% / 3% a year in gold, linear delivery")
for n, L, d in TIERS:
    print(f"   {n:6}", "  ".join(pct(fundable_bonus(y, L, "linear"), 2) for y in (0.01, 0.02, 0.03)))

print("\n6. Escrow yield as % of principal (USD), gold in first and paid as grams vest")
for r in (0.036, 0.042, 0.045):
    lin = "  ".join(f"{n} {pct(r * avg_life(L, 'linear'), 2)}" for n, L, d in TIERS)
    back = "  ".join(f"{n} {pct(r * avg_life(L, 'backhalf'), 2)}" for n, L, d in TIERS)
    bul = "  ".join(f"{n} {pct((1 + r) ** L - 1, 2)}" for n, L, d in TIERS)
    print(f"   r={pct(r)} linear   {lin}\n          backhalf {back}\n          bullet   {bul}")

print("\n7. Collateral engine: gold-terms return = LTV x (deploy - borrow)")
for borrow in (0.041, 0.05, 0.057):
    for ltv in (0.30, 0.40):
        row = "  ".join(f"{pct(dep)}: {ltv * (dep - borrow) * 100:+.2f}" for dep in (0.045, 0.06, 0.08, 0.12))
        print(f"   borrow {pct(borrow)} LTV {pct(ltv, 0)}  {row}")

print("\n8. Strategy return on borrowed money needed to fund today's tiers (borrow cost 5.2%)")
for n, L, d in TIERS:
    held = 1 - (L - C) / (2 * L)  # average share of principal still held under linear delivery
    for ltv in (0.40, 0.50):
        borrowed = held * ltv
        print(f"   {n:6} LTV {pct(ltv, 0)}: {pct((d / L + borrowed * 0.052) / borrowed, 0)} a year")

print("\n9. Exit forfeits (Musa.sol: 50/35/20/10% of undelivered grams by quarter of delivery elapsed)")
quarters = [(0.125, 0.50), (0.375, 0.35), (0.625, 0.20), (0.875, 0.10)]
per_exit = sum((1 - e) * p for e, p in quarters) / 4  # exits spread evenly over the delivery period
print(f"   average forfeit per exit: {pct(per_exit)} of position grams")
for rate in (0.03, 0.05, 0.15):  # simulator scenarios: PWA + PMF, PWA Base, Native Cold
    pool = rate * per_exit
    print(f"   exit rate {pct(rate, 0)}/yr -> {pct(pool, 2)} of cancellable face per year"
          f" -> bonus funded: Flow {pct(pool * avg_life(1.0, 'linear'), 2)}, Vein {pct(pool * avg_life(2.0, 'linear'), 2)}")

print("\n10. Capped boost, simulator personas (frequency/yr, ticket $, tier weights S/F/V)")
P = {"curious": (2, 60, (80, 15, 5)), "saver": (12, 200, (20, 55, 25)),
     "whale": (2, 7500, (5, 25, 70)), "megawhale": (1, 50000, (0, 10, 90))}
MIX = {"PWA Base": (80, 15, 4, 1), "PWA + PMF": (62, 25, 10, 3), "Native Cold": (88, 10, 2, 0)}
D = [d for _, _, d in TIERS]


def blended(weights):
    return sum(w / sum(weights) * d for w, d in zip(weights, D))


for name, mix in MIX.items():
    tot = sum(mix)
    vol = sum(m / tot * P[k][0] * P[k][1] for m, k in zip(mix, P))
    unc = sum(m / tot * P[k][0] * P[k][1] * blended(P[k][2]) for m, k in zip(mix, P))
    print(f"   {name}: volume/user/yr ${vol:,.0f}; uncapped bonus/user/yr ${unc:,.2f} ({pct(unc / vol)} of volume)")
    for cap in (250, 500, 1000):
        cost = sum(m / tot * min(P[k][0] * P[k][1], cap) * blended(P[k][2]) for m, k in zip(mix, P))
        inside = sum(m / tot for m, k in zip(mix, P) if P[k][0] * P[k][1] <= cap)
        print(f"      cap ${cap}: boost/user/yr ${cost:.2f}; users fully inside the cap {pct(inside, 0)}")
print("   $3,000/week marketing = $156,000/yr buys headline bonus on:",
      "  ".join(f"{n} ${156000 / d:,.0f}" for n, L, d in TIERS))

print("\n11. Unfunded bonus outstanding if bonuses are fixed in advance (PWA Base tier mix by $)")
mix = MIX["PWA Base"]
tot = sum(mix)
vol = sum(m / tot * P[k][0] * P[k][1] for m, k in zip(mix, P))
tier_share = [sum(m / tot * P[k][0] * P[k][1] * P[k][2][i] / sum(P[k][2]) for m, k in zip(mix, P)) / vol
              for i in range(3)]
print("   tier mix by $:", "  ".join(f"{n} {pct(s)}" for (n, _, _), s in zip(TIERS, tier_share)))
for label, card in (("today's tiers", D), ("1.2 / 2.3 / 4.4 card", [0.012, 0.023, 0.044])):
    at_issue = sum(s * d for s, d in zip(tier_share, card))
    outstanding = sum(s * d * avg_life(L, "linear") for s, d, (_, L, _) in zip(tier_share, card, TIERS))
    print(f"   {label}: {pct(at_issue)} of annual volume at issuance; about {pct(outstanding)} outstanding in steady state")

print("\n12. Excess-reserve overlay: USD carry x (excess / liabilities), bonus funded, linear")
for excess in (0.3, 1.0):
    y = excess * 0.05
    print(f"   excess {pct(excess, 0)} at 5% carry -> {pct(y, 2)}/yr ->",
          "  ".join(f"{n} {pct(fundable_bonus(y, L, 'linear'), 2)}" for n, L, d in TIERS))

print("\n13. One-off cost versus annual yield: a 1% saving at purchase equals this much gold-terms yield per year")
print("   ", "  ".join(f"{n} {pct(0.01 / avg_life(L, 'linear'), 2)}" for n, L, d in TIERS))
print("   yield needed for today's tiers if a 2% processing cost is not recovered (k=0.98):",
      "  ".join(f"{n} {pct(required_yield(L, d, 'linear', 0.98))}" for n, L, d in TIERS))

print("\n14. Reserve as an engine: reserve R earning y funds bonus b on annual sales S only if R/S = b/y")
for b, y in ((0.07, 0.03), (0.07, 0.05), (0.02, 0.03)):
    print(f"   bonus {pct(b, 0)} at reserve yield {pct(y, 0)} -> reserve = {b / y:.2f}x annual sales")
