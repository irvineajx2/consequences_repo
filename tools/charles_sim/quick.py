import json,sys,random
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); rng=random.Random(5); N=int(sys.argv[2])
def lean(opts):
    h=[o for o in opts if o.get("historical")]
    if h and rng.random()<0.55: return h[0]
    rest=[o for o in opts if not o.get("historical")] if h else opts
    return rng.choice(rest)
c={"axe":0,"long_live":0}
for _ in range(N):
    st=E.start()
    for i in range(len(E.scenes)):
        v=E.view(i,st); end=None
        if v:
            st,end,_=E.choose(i,st,lean(v["options"]))
        if not end: st,end=E.resolve(i,st)
        if end: c[end]=c.get(end,0)+1; break
print(f"axe {c['axe']/N*100:.2f}%  long_live {c['long_live']/N*100:.3f}%")
