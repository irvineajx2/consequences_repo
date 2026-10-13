import json, sys, random
from collections import Counter
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); N=int(sys.argv[2]) if len(sys.argv)>2 else 200000
def run(policy, rng, prefix=None):
    st=E.start(); log=[]; step=0
    for i in range(len(E.scenes)):
        v=E.view(i,st)
        if v is not None:
            opts=v["options"]
            if prefix is not None and step<len(prefix): o=[x for x in opts if x["id"]==prefix[step]][0]
            else: o=policy(opts,rng)
            step+=1; log.append((E.scenes[i]["id"],o["id"],bool(o.get("historical")),bool(E.scenes[i].get("branch"))))
            st,end,_=E.choose(i,st,o)
            if end: return end,st,log
        st,end=E.resolve(i,st)
        if end: return end,st,log
def uniform(opts,rng): return rng.choice(opts)
def leaning(opts,rng):
    h=[o for o in opts if o.get("historical")]
    if h and rng.random()<0.55: return h[0]
    rest=[o for o in opts if not o.get("historical")] if h else opts
    return rng.choice(rest)
def historical(opts,rng):
    h=[o for o in opts if o.get("historical")]; return h[0] if h else opts[0]
if __name__=="__main__":
    rng=random.Random(1)
    end,st,log=run(historical,rng)
    print("HISTORICAL PATH ->",end, {k:st[k] for k in R["meters"]})
    print("  decisions:",len(log),[f"{s}:{o}" for s,o,h,b in log])
    for name,pol in [("uniform",uniform),("leaning",leaning)]:
        C=Counter(); routes=Counter(); dec=[]; br=Counter(); arcs=Counter()
        for _ in range(N):
            end,st,log=run(pol,rng); C[end]+=1; dec.append(len(log))
            if end=="long_live": routes[st["path"]]+=1
            b=[s for s,o,h,bb in log if bb]
            if b: br[len(b)]+=1
            for s,o,h,bb in log:
                if s in("KA1","KL1","KC1","KE1","KI1"): arcs[s]+=1
        print(f"\n=== {name} play, {N:,} runs; mean decisions {sum(dec)/N:.1f} ===")
        for e,cat in R["endings"].items(): print(f"  {e:20} {cat:13} {C[e]/N*100:7.3f}%")
        print("  long_live routes:",dict(routes))
        print("  runs entering arcs:",{k:f"{v/N*100:.2f}%" for k,v in arcs.items()})
        print("  runs with branch scenes:",f"{sum(br.values())/N*100:.1f}%", "mean branch scenes when any:", f"{sum(k*v for k,v in br.items())/max(1,sum(br.values())):.2f}")
