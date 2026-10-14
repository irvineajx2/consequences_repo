"""Reference engine v2 (Consequences rules contract), with exact path-counting for simulation."""
import json
class Engine:
    def __init__(self, d):
        self.d=d; self.scenes=d["scenes"]; self.lo,self.hi=d.get("meter_range",[0,100])
        self.meters=set(d["meters"])
    def start(self):
        st=dict(self.d["meters"]); st.update(self.d["flags"]); return st
    def val(self,st,v): return st.get(v, False)
    def test(self,st,cond):
        if not cond: return True
        for v,op,x in cond:
            a=self.val(st,v)
            if op=="==" and not a==x: return False
            if op=="!=" and not a!=x: return False
            if op=="<" and not a<x: return False
            if op=="<=" and not a<=x: return False
            if op==">" and not a>x: return False
            if op==">=" and not a>=x: return False
            if op=="in" and a not in x: return False
        return True
    def apply(self,st,eff):
        st=dict(st)
        for k,v in eff.get("add",{}).items(): st[k]=max(self.lo,min(self.hi,st[k]+v))
        for k,v in eff.get("set",{}).items(): st[k]=v
        return st
    def score(self,st,terms):
        s=0.0
        for t in terms:
            if "if" in t and "var" not in t: s+= t["add"] if self.test(st,t["if"]) else 0
            elif "over" in t: s+=max(0,st[t["var"]]-t["over"])*t["mult"]
            else: s+=st[t["var"]]*t["mult"]
        return s
    def view(self,i,st):
        sc=self.scenes[i]
        if "variants" in sc:
            for v in sc["variants"]:
                if self.test(st,v.get("if")):
                    if v.get("skip"): return None
                    return v
            return None
        return sc
    def branch_matches(self,st,b):
        if not self.test(st,b.get("if")): return False
        if "score" in b and self.score(st,b["score"]["terms"])<b["score"]["at_least"]: return False
        return True
    def choose(self,i,pre,opt):
        beats=[]
        if "end" in opt: return pre,opt["end"],beats
        add=dict(opt.get("add",{}))
        for c in self.scenes[i].get("scene_cond",[]):
            if self.test(pre,c.get("if")):
                for k,v in c["then"].get("add",{}).items(): add[k]=add.get(k,0)+v
        st=self.apply(pre,{"add":add,"set":opt.get("set",{})})
        for c in opt.get("cond",[]):
            br=c["then"] if self.test(pre,c.get("if")) else c.get("else")
            if br:
                if "end" in br: return st,br["end"],beats
                st=self.apply(st,br)
        for ev in self.scenes[i].get("after",[]):
            for b in self.d["events"][ev]["branches"]:
                if self.branch_matches(st,b):
                    if "beat" in b: beats.append(b["beat"])
                    if "end" in b: return st,b["end"],beats
                    st=self.apply(st,b.get("then",{})); break
        return st,None,beats
    def failure(self,st):
        for f in self.d["failures"]:
            if self.test(st,f["if"]): return f["end"]
    def finale(self,st):
        sc=self.score(st,self.d["finale"]["terms"])
        for o in self.d["finale"]["outcomes"]:
            if "below" in o and not sc<o["below"]: continue
            if "at_least" in o and not sc>=o["at_least"]: continue
            if not self.test(st,o.get("if")): continue
            return o["end"]
    def resolve(self,i,st):
        """returns (state, ending or None)"""
        f=self.failure(st)
        if f: return st,f
        if self.scenes[i].get("drift_after"):
            for r in self.d["drift"]:
                if self.test(st,r.get("if")): st=self.apply(st,r)
            f=self.failure(st)
            if f: return st,f
        if i==len(self.scenes)-1: return st,self.finale(st)
        return st,None
    def play(self,choices):
        """choices: list of option ids for shown scenes. returns ending, log, state"""
        st=self.start(); log=[]; it=iter(choices)
        for i in range(len(self.scenes)):
            v=self.view(i,st)
            if v is not None:
                opts=v["options"]
                oid=next(it); opt=[o for o in opts if o["id"]==oid][0]
                log.append((self.scenes[i]["id"],oid,opt.get("historical",False),self.scenes[i].get("branch",False)))
                st,end,_=self.choose(i,st,opt)
                if end: return end,log,st
            st,end=self.resolve(i,st)
            if end: return end,log,st
