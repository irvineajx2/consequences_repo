import json,sys
from engine import Engine
R=json.load(open(sys.argv[1])); E=Engine(R)
choices=sys.argv[2].split(",") if len(sys.argv)>2 else None
st=E.start(); it=iter(choices) if choices else None
M=list(R["meters"])
print("start      ", " ".join(f"{m[:4]}{st[m]:4}" for m in M))
for i in range(len(E.scenes)):
    v=E.view(i,st)
    if v:
        opts=v["options"]
        if it: oid=next(it); o=[x for x in opts if x["id"]==oid][0]
        else: o=[x for x in opts if x.get("historical")][0]
        st,end,beats=E.choose(i,st,o)
        tag=f"{E.scenes[i]['id']}:{o['id']}"
        if end: print(tag,"->",end); break
    else: tag=None
    st,end=E.resolve(i,st)
    if tag: print(f"{tag:22}", " ".join(f"{m[:4]}{st[m]:4}" for m in M), "path",st["path"], "beats",beats)
    if end: print("->",end); break
