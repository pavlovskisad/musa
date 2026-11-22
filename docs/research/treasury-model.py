"""musa bonus-fundability model. Reproduces every model figure in docs/TREASURY.md.

Run: python3 docs/research/treasury-model.py

Conventions
- Yields are GOLD-denominated effective annual rates unless a line says USD.
- A position: the user pays 1 (in gold value) at t=0. A fraction k of it buys gold at t=0.
  The liability is (1 + d) of gold, where d is the tier bonus.
- Delivery: nothing for the construction window c, then linear to the end of the lock L. This
  mirrors _vestedGrams in contracts/src/Musa.sol. 'bullet' = everything at L.
- Assumptions to keep in mind: c is 30 days (SPEC and BUSINESS; the contract constant is still a
  60-second testnet value) and a year is 360 days (the contract locks are 180 / 360 / 720 days).
  On an actual/365 count the required yields are 9.0 / 13.6 / 18.8% instead of 8.9 / 13.4 / 18.5%.
- Dollar interest on a falling balance is simple interest: rate x average life.
- Tiers come from src/app/lib/tiers.js. Personas, tier weights, churn, CAC, marketing budget and
  exit rates come from prototypes/musa-simulator.jsx (the code, not the older table in BUSINESS.md).
  Nothing here changes those inputs.
"""
import math

C = 30 / 360
TIERS = [("Spark", 0.5, 0.025), ("Flow", 1.0, 0.07), ("Vein", 2.0, 0.188)]
NAMES = [n for n, _, _ in TIERS]


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
    """Largest bonus d that an engine yielding y_eff on outstanding gold funds."""
    return k / mean_discount(math.log(1 + y_eff), L, shape) - 1


def avg_life(L, shape="linear"):
    return {"linear": (C + L) / 2, "backhalf": 0.75 * L, "bullet": L}[shape]


def pct(x, nd=1):
    return f"{x * 100:.{nd}f}%"


def row(fn, nd=2):
    return "  ".join(f"{n} {pct(fn(n, L, d), nd)}" for n, L, d in TIERS)


print("1. Average life of a gram or a waiting dollar (years)")
for shape in ("linear", "backhalf", "bullet"):
    print(f"   {shape:9}", "  ".join(f"{n} {avg_life(L, shape):.3f}" for n, L, d in TIERS))

print("\n2. Gold-terms yield needed to fund today's bonus")
for label, shape, k in (("linear, 100% buys gold", "linear", 1.0), ("linear, 98% buys gold", "linear", 0.98),
                        ("linear, 94% buys gold", "linear", 0.94), ("bullet, 100% buys gold", "bullet", 1.0)):
    print(f"   {label:23}", row(lambda n, L, d: required_yield(L, d, shape, k), 1))

print("\n3. Solvency ratio at issuance with no reserve")
for k in (1.0, 0.94):
    print(f"   {pct(k, 0)} buys gold:", row(lambda n, L, d: k / (1 + d), 1))

print("\n4. Bonus funded per 1%/yr of gold-terms yield on gold that is still inside")
for shape in ("linear", "backhalf", "bullet"):
    print(f"   {shape:9}", row(lambda n, L, d: fundable_bonus(0.01, L, shape)))

print("\n5. A 1% one-off cost at purchase equals this much gold-terms yield per year")
print("   ", row(lambda n, L, d: 0.01 / avg_life(L)))

print("\n6. Carry: dollar interest on waiting dollars, % of the purchase (simple interest = rate x average life)")
for r in (0.035, 0.039, 0.043, 0.046):
    print(f"   rate {pct(r)}")
    for shape in ("linear", "backhalf", "bullet"):
        print(f"      {shape:9}", row(lambda n, L, d: r * avg_life(L, shape)))
print("   upfront discount equal to a zero-interest deferral, at the seller's cost of money:")
for r in (0.042, 0.10):
    print(f"      {pct(r)}:", row(lambda n, L, d: 1 - mean_discount(math.log(1 + r), L, "linear")))

print("\n7. Leased gold at 2.3% / 3.9% a year in gold")
for shape in ("linear", "bullet"):
    print(f"   {shape:7}", "  ".join(
        f"{n} {pct(fundable_bonus(0.023, L, shape))}-{pct(fundable_bonus(0.039, L, shape))}" for n, L, d in TIERS))

print("\n8. Pledging gold: gold-terms return = LTV x (deploy - borrow)")
for borrow in (0.041, 0.05, 0.057):
    for ltv in (0.30, 0.40):
        cells = "  ".join(f"{pct(dep)}: {ltv * (dep - borrow) * 100:+.2f}" for dep in (0.045, 0.06, 0.08, 0.12))
        print(f"   borrow {pct(borrow)} LTV {pct(ltv, 0)}  {cells}")
print("   strategy return needed on the borrowed money to fund today's tiers, 40% LTV, 5% borrow cost:")
for n, L, d in TIERS:
    held = 1 - (L - C) / (2 * L)  # average share of principal still held under linear delivery
    borrowed = held * 0.40
    gross = (d / L + borrowed * 0.05) / borrowed
    print(f"      {n:6} {pct(gross, 0)} a year gross, {pct(gross - 0.05, 0)} above the borrow cost")

print("\n9. Exit forfeits (Musa.sol: 50/35/20/10% of undelivered grams by quarter of delivery elapsed)")
quarters = [(0.125, 0.50), (0.375, 0.35), (0.625, 0.20), (0.875, 0.10)]
per_exit = sum((1 - e) * p for e, p in quarters) / 4  # exits spread evenly over the delivery period
print(f"   average forfeit per exit: {pct(per_exit)} of position grams")
print("   steady state: a position is exposed to exit for its whole lock, so forfeits per unit of")
print("   annual sales = exit rate x average forfeit x lock length")
for rate in (0.03, 0.05, 0.15):  # simulator scenarios: PWA + PMF, PWA Base, Native Cold
    print(f"   exit rate {pct(rate, 0)}/yr -> Flow {pct(rate * per_exit * 1.0, 2)}, Vein {pct(rate * per_exit * 2.0, 2)} of sales")

print("\n10. Boost, simulator personas (purchases/yr, ticket $, tier weights S/F/V, weekly churn)")
P = {"curious": (2, 60, (80, 15, 5), 0.030), "saver": (12, 200, (20, 55, 25), 0.005),
     "whale": (2, 7500, (5, 25, 70), 0.003), "megawhale": (1, 50000, (0, 10, 90), 0.002)}
MIX = {"PWA Base": (80, 15, 4, 1), "PWA + PMF": (62, 25, 10, 3), "Native Cold": (88, 10, 2, 0)}
D = [d for _, _, d in TIERS]


def blended(weights):
    return sum(w / sum(weights) * d for w, d in zip(weights, D))


def year_volume(k):
    return P[k][0] * P[k][1]


def years_active(k):
    return 1 / (52 * P[k][3])


for name, mix in MIX.items():
    tot = sum(mix)
    share = {k: m / tot for m, k in zip(mix, P)}
    vol = sum(share[k] * year_volume(k) for k in P)
    unc = sum(share[k] * year_volume(k) * blended(P[k][2]) for k in P)
    whales = sum(share[k] * year_volume(k) for k in ("whale", "megawhale")) / vol
    print(f"   {name}: volume/user/yr ${vol:,.0f}; uncapped bonus/user/yr ${unc:,.2f} ({pct(unc / vol)} of volume);"
          f" whales are {pct(whales, 0)} of dollars")
    for cap in (250, 500, 1000):  # cap on boosted purchase dollars per person per year
        cost = sum(share[k] * min(year_volume(k), cap) * blended(P[k][2]) for k in P)
        dollars = sum(share[k] * min(year_volume(k), cap) for k in P) / vol
        inside = sum(share[k] for k in P if year_volume(k) <= cap)
        life = sum(share[k] * min(year_volume(k), cap) * blended(P[k][2]) * years_active(k) for k in P)
        print(f"      purchase cap ${cap}: ${cost:.2f}/user/yr; {pct(dollars)} of dollars boosted;"
              f" {pct(inside, 0)} of users fully inside; lifetime ${life:.0f} per acquired user")
    for bcap in (15, 35):  # cap on bonus dollars per person per year
        cost = sum(share[k] * min(year_volume(k) * blended(P[k][2]), bcap) for k in P)
        life = sum(share[k] * min(year_volume(k) * blended(P[k][2]), bcap) * years_active(k) for k in P)
        print(f"      bonus cap ${bcap}/person/yr: ${cost:.2f}/user/yr; lifetime ${life:.0f} per acquired user")
    if name == "PWA Base":
        print("      per persona at a $500 purchase cap (bonus received / uncapped, blended rate on all purchases):")
        for k in P:
            got = min(year_volume(k), 500) * blended(P[k][2])
            print(f"         {k:9} ${got:,.2f} of ${year_volume(k) * blended(P[k][2]):,.2f}  ({pct(got / year_volume(k))})")
        print("      if every capped dollar is put into Vein: $%.2f/user/yr" %
              sum(share[k] * min(year_volume(k), 500) * 0.188 for k in P))

print("\n11. What the miner discount used to pay, per user per year (PWA Base, BUSINESS.md split)")
mix = MIX["PWA Base"]
tot = sum(mix)
vol = sum(m / tot * year_volume(k) for m, k in zip(mix, P))
for label, s in (("processing 2%", 0.02), ("platform margin 3%", 0.03), ("reserve 1%", 0.01)):
    print(f"   {label}: ${vol * s:.0f}")

print("\n12. Float and revenue per $10M of annual sales (PWA Base tier mix by dollars)")
tier_share = [sum(m / tot * year_volume(k) * P[k][2][i] / sum(P[k][2]) for m, k in zip(mix, P)) / vol
              for i in range(3)]
float_years = sum(s * avg_life(L) for s, (_, L, _) in zip(tier_share, TIERS))
print("   tier mix by $:", "  ".join(f"{n} {pct(s)}" for n, s in zip(NAMES, tier_share)))
print(f"   waiting dollars at steady state: {float_years:.2f} x annual sales = ${float_years * 10:.1f}M")
for r in (0.035, 0.039, 0.043):
    print(f"   carry at {pct(r)}: ${float_years * 10e6 * r / 1e3:,.0f}K a year")
print(f"   each point of carry musa keeps: ${float_years * 10e6 * 0.01 / 1e3:,.0f}K a year, and costs the user",
      " / ".join(pct(0.01 * avg_life(L)) for _, L, _ in TIERS), "of bonus")
print("   card processing at 2% of sales: $200K; a 0.5% spread: $50K;"
      " simulator overhead $144K and marketing $156K a year")

print("\n13. Fixing today's bonus in advance with nothing funding it")
at_issue = sum(s * d for s, d in zip(tier_share, D))
print(f"   {pct(at_issue)} of sales, every year, consumed")

print("\n14. Reserve as an engine: reserve R earning y funds bonus b on annual sales S only if R/S = b/y")
for b, y in ((0.07, 0.03), (0.07, 0.05), (0.02, 0.03)):
    print(f"   bonus {pct(b, 0)} at reserve yield {pct(y, 0)} -> reserve = {b / y:.2f}x annual sales")

print("\n15. Lifetime cost of today's uncapped bonus per acquired user (PWA Base)")
print("   $%.0f" % sum(m / sum(MIX["PWA Base"]) * year_volume(k) * blended(P[k][2]) * years_active(k)
                     for m, k in zip(MIX["PWA Base"], P)))
