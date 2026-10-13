import json,sys,random
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); rng=random.Random(11); T=int(sys.argv[2]) if len(sys.argv)>2 else 1500
def val(st):
    c=st["church"]; return st["parliament"]+st["majesty"]*0.5-2*st["distrust"]-max(0,c-62)*2-max(0,38-c)*2+0.3*st["army"]+0.3*st["treasury"]-0.5*max(0,st["scotland"]-50)-0.5*max(0,st["ireland"]-60)
def play(k,hist,eps):
    st=E.start(); n=0
    for i in range(len(E.scenes)):
        v=E.view(i,st)
        if v:
            opts=v["options"]
            if n<k: o=[x for x in opts if x.get("historical")][0]
            else:
                cand=[x for x in opts if not (n==k and x.get("historical"))] or opts
                if rng.random()<eps: o=rng.choice(cand)
                else:
                    sc=[]
                    for x in cand:
                        s2,end,_=E.choose(i,st,x)
                        if end: s=1e9 if end=="long_live" else -1e9
                        else: s=val(s2)+rng.gauss(0,8)
                        sc.append((s,x))
                    o=max(sc,key=lambda z:z[0])[1]
            n+=1; st,end,_=E.choose(i,st,o)
            if end: return end
        if i==len(E.scenes)-1 and not E.failure(st): BEST.append((E.score(st,R["finale"]["terms"]),st["distrust"],st["path"]))
        st,end=E.resolve(i,st)
        if end: return end
_,log,_=E.play([ [o for o in (E.view(i,E.start()) or {"options":[{"id":"x"}]})["options"]][0]["id"] for i in range(0)]) if False else (None,None,None)
nh=23; res=[]; BEST=[]
for k in range(nh):
    w=sum(1 for t in range(T) if play(k,None,[0.15,0.35,0.6][t%3])=="long_live")
    res.append(w); b=max(BEST,default=None); print(f"deviate at decision {k+1:2}: {w:4} wins / {T}   best finale {b}"); BEST.clear()
last=max([k for k,w in enumerate(res) if w>0],default=-1)
print(f"LATEST: decision {last+1} of {nh} ({(last+1)/nh*100:.0f}%)")
