"""Average-in versus day-one buyer, PAXG daily closes (Binance public data, from 2020-08-28).
Run: python3 docs/research/average-in-outcomes.py   (figures in docs/TREASURY.md were run on 2026-11-21)
A: all dollars buy gold on day one.  B: nothing for 30 days, then equal dollar slices each day to the end of
the lock at that day's close; interest on waiting dollars (simple daily accrual at `rate`) buys gold the day it is earned.
Output: grams(B) / grams(A)."""
import json, os, time, urllib.request, statistics as st

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paxg_daily.json")
if os.path.exists(CACHE):
    px = json.load(open(CACHE))
else:  # public market data, no key needed; not cached in the repo
    px, start = [], 1567296000000
    while True:
        u = f"https://data-api.binance.vision/api/v3/klines?symbol=PAXGUSDT&interval=1d&startTime={start}&limit=1000"
        d_ = json.load(urllib.request.urlopen(u, timeout=30))
        px += [(r[0], float(r[4])) for r in d_]
        if len(d_) < 1000:
            break
        start = d_[-1][0] + 86400000
T=[t for t,_ in px]; P=[p for _,p in px]
def d(i): return time.strftime("%Y-%m-%d",time.gmtime(T[i]/1000))
def ratio(i0, lock, rate, c=30):
    n=lock-c; bal=1.0; grams=0.0
    for k in range(1, lock+1):
        p=P[i0+k]
        intr=bal*rate/365; grams+=intr/p            # interest converted the day it is earned
        if k>c:
            slice_=1.0/n; grams+=slice_/p; bal-=slice_
    return grams/(1.0/P[i0])
def idx(date):
    for i in range(len(T)):
        if d(i)>=date: return i
for lock,name in ((180,"6 mo"),(360,"12 mo"),(720,"24 mo")):
    starts=range(0,len(P)-lock-1)
    r0=[ratio(i,lock,0.0) for i in starts]; r4=[ratio(i,lock,0.039) for i in starts]
    q=lambda x,p: sorted(x)[int(p*(len(x)-1))]
    print(f"{name}: {len(r0)} start dates {d(0)}..{d(len(P)-lock-2)}")
    print(f"   no interest : median {st.median(r0):.3f} mean {st.mean(r0):.3f} p5 {q(r0,.05):.3f} p95 {q(r0,.95):.3f} share>1 {sum(x>1 for x in r0)/len(r0):.0%}")
    print(f"   3.9% interest: median {st.median(r4):.3f} mean {st.mean(r4):.3f} p5 {q(r4,.05):.3f} p95 {q(r4,.95):.3f} share>1 {sum(x>1 for x in r4)/len(r4):.0%}")
    for label,a,b in (("starts in 2025","2025-01-01","2025-12-31"),("starts in 2026","2026-01-01","2026-12-31")):
        sel=[r4[i] for i in starts if a<=d(i)<=b]
        if sel: print(f"   {label}: n={len(sel)} median {st.median(sel):.3f} min {min(sel):.3f} max {max(sel):.3f}")
for date in ("2025-01-01","2026-01-29"):
    i=idx(date)
    for lock,name in ((180,"6 mo"),(360,"12 mo"),(720,"24 mo")):
        if i+lock < len(P):
            print(f"start {d(i)} at ${P[i]:.0f}, {name}: no interest {ratio(i,lock,0):.3f}, with 3.9% {ratio(i,lock,0.039):.3f}  (end {d(i+lock)} at ${P[i+lock]:.0f})")
        else:
            print(f"start {d(i)}, {name}: lock not finished in the data")
