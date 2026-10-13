import json,sys,random
from collections import Counter
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R); rng=random.Random(3)
SETTERS={("K15","terms"):"terms after Edgehill",("K19","pardonwin"):"won the war, pardoned",("K20","acceptheads"):"accepted the Army's terms",("K21","newport"):"Newport treaty",("K21","engage"):"won the second war",("KC3","trial3"):"Covenanted king",("KC3","imposekirk"):"Covenanted king"}
def play():
    st=E.start(); log=[]
    for i in range(len(E.scenes)):
        v=E.view(i,st)
        if v:
            o=rng.choice(v["options"]); log.append((E.scenes[i]["id"],o["id"]))
            before=st["path"]; st,end,_=E.choose(i,st,o)
            if end: return end,st,log
        st,end=E.resolve(i,st)
        if end: return end,st,log
C=Counter(); W=Counter(); N=220000
for _ in range(N):
    end,st,log=play()
    if st["path"]=="settled":
        src=[SETTERS[x] for x in log if x in SETTERS and True]
        s=src[-1] if src else "?"; C[(s,end)]+=1
for (s,e),c in sorted(C.items(),key=lambda z:-z[1]): print(f"{s:28} {e:20} {c/N*100:.3f}%")
