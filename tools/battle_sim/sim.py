import random,sys,os
from collections import Counter
from battle import *
from hist import H
rng=random.Random(int(os.environ.get("SEED",1)))
RANK={"gold":5,"silver":4,"bronze":3,"stalemate":2,"siege_lifted":1,"army_breaks":0,"trapped":0,"death":0,"gaul_rises":0}
EARLY={"siege_lifted","army_breaks","trapped","death","gaul_rises"}
def rnd_phase(ph): return (rng.choice(COH),rng.choice(CAV),rng.choice(CMD),rng.choice(MOVES[ph]))
def rnd_strat(): return {"phases":{ph:rnd_phase(ph) for ph in range(1,6)},"scenes":{k:rng.choice(v) for k,v in SCENES.items()}}
def casual():
    """Careless but not reckless: men spread roughly evenly, random moves, commander and scene choices."""
    st=rnd_strat()
    for ph in range(1,6):
        c=[2,2,2,2,2]
        for _ in range(2):
            i,j=rng.sample(range(5),2)
            if c[i]>0: c[i]-=1;c[j]+=1
        _,cv,cm,mv=st["phases"][ph]; st["phases"][ph]=(tuple(c),cv,cm,mv)
    return st
def score(o,s): return RANK[o]*1000+(s["coh"] if s else 0)+(s["morale"] if s else 0)
def ev(plan,st):
    o,u,s=play(plan,st); return score(o,s),o,u
AVG={ph:{k:sum(P[p][ph][k] for p in PLANS)/4 for k in SECT} for ph in range(1,6)}
def thoughtful(plan_guess=None,reveal=3,scout=False):
    """A sensible player: men in proportion to expected pressure (average over plans, or the plan if known), some reserve,
    builds early, forages if short, commander where the threat is greatest."""
    st={"phases":{},"scenes":{"riders":"letgo","mandubii":rng.choice(SCENES["mandubii"]),"crisis":"sendlab","surrender":rng.choice(SCENES["surrender"])}}
    for ph in range(1,6):
        exp=P[plan_guess][ph] if (plan_guess and ph>=reveal) else AVG[ph]
        tot=sum(exp.values())+1e-9; raw=[exp[k]/tot*8 for k in SECT]
        al=[int(round(x)) for x in raw]; 
        while sum(al)>8: al[al.index(max(al))]-=1
        while sum(al)<8: al[raw.index(max(raw))]+=1
        coh=tuple(al)+(2,)
        cav=(2,2,1) if ph<5 else (1,1,3)
        cmd=max(SECT,key=lambda k:exp[k])
        mv={1:("scout" if scout else "build"),2:("forage" if plan_guess=="hunger" and ph>=reveal else "build"),3:"german",4:"shiftres",5:"cavround"}[ph]
        st["phases"][ph]=(coh,cav,cmd,mv)
    return st
def climb(fn,iters=2500,restarts=6,init=None):
    best=None;bs=-1
    for r in range(restarts):
        cur=init() if init else rnd_strat(); cs=fn(cur)
        for it in range(iters):
            new={"phases":dict(cur["phases"]),"scenes":dict(cur["scenes"])}
            if rng.random()<0.15:
                k=rng.choice(list(SCENES)); new["scenes"][k]=rng.choice(SCENES[k])
            else:
                ph=rng.randint(1,5); c,cv,cm,mv=new["phases"][ph]; w=rng.randint(0,3)
                if w==0:
                    c=list(c); i,j=rng.sample(range(5),2)
                    if c[i]>0: c[i]-=1;c[j]+=1
                    c=tuple(c)
                elif w==1: cv=rng.choice(CAV)
                elif w==2: cm=rng.choice(CMD)
                else: mv=rng.choice(MOVES[ph])
                new["phases"][ph]=(c,cv,cm,mv)
            ns=fn(new)
            if ns>=cs: cur,cs=new,ns
        if cs>bs: best,bs=cur,cs
    return best,bs
def main():
    MODE=sys.argv[1]
    if MODE=="random":
        N=int(sys.argv[2])
        for label,gen in [("random play",lambda p:rnd_strat()),("careless (men spread evenly, random everything else)",lambda p:casual()),("thoughtful, never reads the plan",lambda p:thoughtful(None)),
                          ("thoughtful, reads the plan from the attacks (from phase 4)",lambda p:thoughtful(p,4)),("thoughtful, scouts in phase 1 (knows the plan from phase 2)",lambda p:thoughtful(p,2,True))]:
            C=Counter(); U=Counter(); byp={p:Counter() for p in PLANS}
            for i in range(N):
                p=PLANS[i%4]; o,u,s=play(p,gen(p)); C[o]+=1; byp[p][o]+=1
                for x in u: U[x]+=1
            print(f"== {label}, {N:,} battles")
            print("   outcomes:",{k:f"{v/N*100:.1f}%" for k,v in C.most_common()})
            print("   early end:",f"{sum(v for k,v in C.items() if k in EARLY)/N*100:.1f}%","  any medal:",f"{sum(C[k] for k in ('gold','silver','bronze'))/N*100:.1f}%")
            print("   by plan (gold/any medal):",{p:f"{c['gold']/sum(c.values())*100:.1f}/{sum(c[k] for k in ('gold','silver','bronze'))/sum(c.values())*100:.0f}%" for p,c in byp.items()})
            print("   unlockables:",{k:f"{v/N*100:.2f}%" for k,v in U.most_common()})

    if MODE=="dominance":
        best={}
        for p in PLANS:
            st,sc=climb(lambda x,p=p:ev(p,x)[0]); best[p]=st
        print("Best strategy found for each plan, tested against every plan (rows: strategy built for; cols: actual plan)")
        print(" "*12+"".join(f"{q:>12}" for q in PLANS))
        for p in PLANS: print(f"{p:>12}"+"".join(f"{play(q,best[p])[0]:>12}" for q in PLANS))
        rob,rs=climb(lambda x:sum(ev(q,x)[0] for q in PLANS),iters=3000,restarts=8)
        print("\nMost robust single strategy (best average over all four plans):",{q:play(q,rob)[0] for q in PLANS})
        print("Historical Caesar plan:",{q:play(q,H)[0] for q in PLANS})
    if MODE=="unlocks":
        for target in ["throws_down_arms","red_cloak","iron_ring","hunter_hunted","clemency","eagle_free","gaul_unbound"]:
            found=None
            for p in PLANS:
                st,sc=climb(lambda x,p=p,t=target:(1 if t in play(p,x)[1] else 0)*10000+ev(p,x)[0]*(0 if t=="gaul_unbound" else 1),iters=1500,restarts=3)
                o,u,s=play(p,st)
                if target in u: found=(p,o); break
            print(f"  {target:18}", "reachable" if found else "NOT FOUND", found or "")

    if MODE=="sweep":
        N=int(sys.argv[2])
        gens=[("casual",lambda p:casual()),("never reads",lambda p:thoughtful(None)),("reads at ph4",lambda p:thoughtful(p,4)),("scouts",lambda p:thoughtful(p,2,True))]
        out=[]
        for name,g in gens:
            C=Counter(play(PLANS[i%4],g(PLANS[i%4]))[0] for i in range(N))
            out.append(f"{name}: early {sum(v for k,v in C.items() if k in EARLY)/N*100:.0f}% medal {sum(C[k] for k in ('gold','silver','bronze'))/N*100:.0f}% gold {C['gold']/N*100:.0f}%")
        print(" | ".join(out))
    if MODE=="robust":
        rob,rs=climb(lambda x:sum(ev(q,x)[0] for q in PLANS),iters=3000,restarts=6)
        for ph in range(1,6): print(ph,rob["phases"][ph])
        print(rob["scenes"])
        for q in PLANS:
            print("--",q); play(q,rob,trace=True)


if __name__ == "__main__":
    main()
