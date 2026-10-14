import json,sys,random,os
from collections import Counter,defaultdict
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); rng=random.Random(int(os.environ.get("SEED",1)))
MODE=sys.argv[2]; N=int(sys.argv[3])
H=lambda o:[x for x in o if x.get("historical")]
def lean(opts):
    h=H(opts)
    if h and rng.random()<0.55: return h[0]
    rest=[o for o in opts if not o.get("historical")] if h else opts
    return rng.choice(rest)
def play(pick):
    st=E.start(); log=[]
    for i in range(len(E.scenes)):
        v=E.view(i,st)
        if v:
            o=pick(len(log),v["options"],st,i); log.append((E.scenes[i]["id"],o["id"],bool(o.get("historical")),bool(E.scenes[i].get("branch"))))
            st,end,_=E.choose(i,st,o)
            if end: return end,st,log
        st,end=E.resolve(i,st)
        if end: return end,st,log
CAT=R["endings"]
if MODE=="rates":
    for name,pol in [("uniform",lambda n,o,s,i:rng.choice(o)),("leaning",lambda n,o,s,i:lean(o))]:
        C=Counter(); arcs=Counter(); routes=Counter(); where=Counter()
        for _ in range(N):
            end,st,log=play(pol); C[end]+=1
            if end in("annexed","exiled_forever","paraded_chains"): where[(end,log[-1][0])]+=1
            if end=="queen_of_kings": routes[st["patron"]+("/won" if st["warwon"] else "")+("/warn" if st["caesaralive"] else "")]+=1
            for s,o,h,b in log:
                if s in("QN1","QW1","QE1","QB1","QB2","QB3","QB4"): arcs[s]+=1
        print(f"== {name} {N:,}")
        for e,c in CAT.items(): print(f"  {e:18} {c:13} {C[e]/N*100:7.3f}%")
        print("  where:",", ".join(f"{e}@{s} {c/N*100:.1f}%" for (e,s),c in where.most_common(8)))
        print("  QoK routes:",dict(routes)); print("  branch entry:",{k:f"{v/N*100:.2f}%" for k,v in sorted(arcs.items())})
if MODE=="influence":
    # for each main scene, ending-category distribution conditional on option chosen (leaning play)
    D=defaultdict(lambda:defaultdict(Counter)); wins=0; dev=Counter(); routes=set()
    for _ in range(N):
        end,st,log=play(lambda n,o,s,i:lean(o))
        for s,o,h,b in log:
            if not b: D[s][o][CAT[end]]+=1
        if end=="queen_of_kings":
            wins+=1; d=tuple((s,o) for s,o,h,b in log if not h and not b); routes.add(d)
            for x in set(d): dev[x]+=1
    cats=["historical","outperformed","fallen_short","fallen","alternate"]
    print(f"leaning {N:,}: QoK wins {wins}; distinct routes {len(routes)}")
    for (s,o),c in dev.most_common(6): print(f"   {s} {o:12} in {c/max(1,wins)*100:5.1f}% of wins")
    print("\nDecision influence: largest gap in ending mix between two options (total variation), and best option's survival lift")
    for s in [x["id"] for x in R["scenes"] if not x.get("branch")]:
        if s not in D: continue
        dist={o:{c:D[s][o][c]/max(1,sum(D[s][o].values())) for c in cats} for o in D[s]}
        tv=max(0.5*sum(abs(dist[a][c]-dist[b][c]) for c in cats) for a in dist for b in dist)
        print(f"  {s}  TV {tv*100:5.1f}%   "+"  ".join(f"{o}:hist {dist[o]['historical']*100:4.1f} fall {dist[o]['fallen']*100:4.1f}" for o in dist))
if MODE=="foresight":
    def val(st): return st["rome"]+st["divinity"]+0.5*st["alexandria"]+0.3*st["treasury"]+0.3*st["fleet"]-st["octavian"]-max(0,st["rivals"]-50)
    _,_,hl=play(lambda n,o,s,i:H(o)[0] if H(o) else o[0]); nh=len(hl); res=[]
    for k in range(nh):
        w=0
        for t in range(N):
            eps=[0.15,0.35,0.6][t%3]
            def pick(n,opts,st,i,k=k):
                if n<k: return H(opts)[0] if H(opts) else opts[0]
                cand=[x for x in opts if not (n==k and x.get("historical"))] or opts
                if rng.random()<eps: return rng.choice(cand)
                sc=[]
                for x in cand:
                    s2,end,_=E.choose(i,st,x)
                    sc.append(((1e9 if end=="queen_of_kings" else -1e9) if end else val(s2)+rng.gauss(0,8),x))
                return max(sc,key=lambda z:z[0])[1]
            if play(pick)[0]=="queen_of_kings": w+=1
        res.append(w)
    print("wins by deviation point:",res)
    last=max([k for k,w in enumerate(res) if w>0],default=-1); print(f"LATEST: decision {last+1} of {nh} ({(last+1)/nh*100:.0f}%)")
