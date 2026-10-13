import json,sys,random
from collections import Counter
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); N=int(sys.argv[2]); rng=random.Random(7)
def play(pick):
    st=E.start(); log=[]
    for i in range(len(E.scenes)):
        v=E.view(i,st)
        if v:
            o=pick(len(log),v["options"]); log.append((E.scenes[i]["id"],o["id"],bool(o.get("historical")),bool(E.scenes[i].get("branch"))))
            st,end,_=E.choose(i,st,o)
            if end: return end,st,log
        st,end=E.resolve(i,st)
        if end: return end,st,log
H=lambda opts:[o for o in opts if o.get("historical")]
def lean(opts):
    h=H(opts)
    if h and rng.random()<0.55: return h[0]
    rest=[o for o in opts if not o.get("historical")] if h else opts
    return rng.choice(rest)
_,_,hl=play(lambda n,o:H(o)[0] if H(o) else o[0]); nh=len(hl)
dev=Counter(); routes=set(); src=Counter(); wins=0; mind=99; hist_end=0
for _ in range(N):
    end,st,log=play(lambda n,o:lean(o))
    if end=="axe": hist_end+=1
    if end!="long_live": continue
    wins+=1; d=tuple((s,o) for s,o,h,b in log if not h and not b and s.startswith("K") and not s.startswith(("KA","KL","KC","KE","KI","KB")))
    routes.add(d); mind=min(mind,len(d)); src[st["path"]]+=1
    for x in set(d): dev[x]+=1
print(f"History-leaning, {N:,} runs: axe {hist_end/N*100:.2f}%  long_live {wins/N*100:.3f}%")
print(f"distinct routes {len(routes)}; fewest departures from history {mind}; by final path {dict(src)}")
for (s,o),c in dev.most_common(8): print(f"   {s:5} {o:12} in {c/wins*100:5.1f}% of winning runs")
import os
if os.environ.get("NOFS"): sys.exit()
print(f"\nForesight (historical path has {nh} decisions): copy history for k decisions, deviate at k+1, then play freely")
res=[]
for k in range(nh):
    hit=0
    for t in range(4000):
        def pick(n,opts,k=k):
            if n<k: return H(opts)[0] if H(opts) else opts[0]
            if n==k:
                nonh=[o for o in opts if not o.get("historical")]; return rng.choice(nonh or opts)
            return rng.choice(opts) if rng.random()<0.5 else lean(opts)
        end,st,log=play(pick)
        if end=="long_live": hit+=1
    res.append(hit); print(f"  deviate at decision {k+1:2} ({hl[k][0]}): {hit} wins / 4000")
last=max([k for k,h in enumerate(res) if h>0],default=-1)
print(f"LATEST: decision {last+1} of {nh} ({(last+1)/nh*100:.0f}%)")
