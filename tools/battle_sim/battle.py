"""Alesia battle model v1: data + deterministic engine.
Cohort sliders in 10% steps across inner/plain/rea/north/reserve; cavalry in 20% steps across plain/patrol/reserve."""
import itertools
SECT=["inner","plain","rea","north"]
TERRAIN={"inner":1.0,"plain":1.0,"rea":0.8,"north":1.3}
# enemy pressure per plan, phase (1-5), sector (cohort-equivalents)
P={
 "historical":{1:dict(inner=15,plain=4,rea=0,north=0),2:dict(inner=14,plain=16,rea=4,north=4),3:dict(inner=10,plain=30,rea=6,north=6),
               4:dict(inner=24,plain=34,rea=6,north=6),5:dict(inner=26,plain=10,rea=44,north=8)},
 "northern":  {1:dict(inner=15,plain=4,rea=0,north=0),2:dict(inner=14,plain=4,rea=4,north=24),3:dict(inner=10,plain=14,rea=10,north=28),
               4:dict(inner=14,plain=10,rea=14,north=32),5:dict(inner=18,plain=10,rea=18,north=40)},
 "hunger":    {1:dict(inner=15,plain=0,rea=0,north=0),2:dict(inner=10,plain=6,rea=0,north=0),3:dict(inner=8,plain=14,rea=4,north=4),
               4:dict(inner=14,plain=16,rea=10,north=10),5:dict(inner=32,plain=26,rea=30,north=20)},
 "breakout":  {1:dict(inner=15,plain=0,rea=0,north=0),2:dict(inner=44,plain=16,rea=0,north=0),3:dict(inner=10,plain=26,rea=4,north=4),
               4:dict(inner=20,plain=26,rea=6,north=6),5:dict(inner=12,plain=30,rea=30,north=10)},
}
PLANS=list(P)
import os
PF=float(os.environ.get("PF",1.6)); BASE=float(os.environ.get("BASE",5)); GC=int(os.environ.get("GC",75)); W0I=float(os.environ.get("W0I",1.2)); W0O=float(os.environ.get("W0O",0.8)); DM=int(os.environ.get("DM",25)); MB=int(os.environ.get("MB",8)); CB=float(os.environ.get("CB",1.15)); BW=float(os.environ.get("BW",0.2)); GM=int(os.environ.get("GM",45)); GRAIN0=int(os.environ.get("G0",80)); UPKEEP=int(os.environ.get("UP",10))
MOVES={1:["build","forage","scout","harass"],2:["build","forage","scout","forests"],3:["hold","german","sortie","feint"],
       4:["hold","light","counter","shiftres"],5:["hold","labienus","leadres","cavround"]}
SCENES={"riders":["chase","letgo","terms"],"mandubii":["through","keepout","labour"],"crisis":["sendlab","yourself","abandon"],"surrender":["triumph","spare","execute"]}
CMD=["inner","plain","rea","north","camp"]
def allocs(n,k):
    for c in itertools.combinations(range(n+k-1),k-1):
        prev=-1;out=[]
        for x in c+(n+k-1,): out.append(x-prev-1);prev=x
        yield tuple(out)
COH=list(allocs(10,5)); CAV=list(allocs(5,3))
def band(r):
    return "breach" if r<0.6 else "strained" if r<0.9 else "held" if r<1.5 else "easy"
def play(plan,strat,trace=False):
    """strat: {'phases':{1..5: (coh, cav, cmd, move)}, 'scenes':{name:choice}}"""
    s=dict(coh=100.0,cav=20.0,grain=GRAIN0,morale=60,allies=50,relief=100,hunger=40,
           works=dict(inner=W0I,plain=W0O,rea=W0O,north=W0O),breaches=0,everbreach=False,
           escaped=False,hunter=False,clues=0,cmdrea5=False)
    log=[]; sc=strat["scenes"]
    for ph in range(1,6):
        if ph==2:
            ch=sc["riders"]
            if ch=="chase": s["relief"]-=10; s["morale"]-=5; s["cav"]-=4
            elif ch=="terms": s["allies"]+=15; s["relief"]-=3; s["grain"]-=5
        if ph==4:
            ch=sc["mandubii"]
            if ch=="through": s["allies"]+=10; s["mandthrough"]=True
            elif ch=="keepout": s["morale"]-=5
            else: s["works"]={k:v+0.1 for k,v in s["works"].items()}; s["grain"]-=15; s["allies"]-=10
        coh,cav,cmd,move=strat["phases"][ph]
        if ph==5:
            ch=sc["crisis"]
        unit=s["coh"]/10; cu=s["cav"]/5
        men=dict(zip(SECT+["reserve"],[c*unit for c in coh])); cavd=dict(zip(["plain","patrol","reserve"],[c*cu for c in cav]))
        # moves before battle
        if move=="build": s["works"]={k:(v+BW if k!="inner" else v+BW/2) for k,v in s["works"].items()}; s["grain"]-=5
        if move=="forests": s["works"]={k:v+0.15 for k,v in s["works"].items()}; s["grain"]-=4
        if move=="forage": s["grain"]+=25
        if move=="scout": s["clues"]+=1
        if move=="harass": s["hunger"]+=10; s["morale"]+=2
        press={k:v*PF for k,v in P[plan][ph].items()}
        rel=s["relief"]/100
        for k in ("plain","rea","north"): press[k]*=rel
        press["inner"]*=(1-(s["hunger"]-40)/150)
        if ph==4 and s.get("mandthrough"): press["inner"]*=1.15
        if s.get("feinted") and ph==4: press["plain"]*=0.8
        if move=="light": press["plain"]*=0.85
        if move=="feint": s["feinted"]=True
        if s["escaped"]: press["inner"]*=0.3
        # reserve use
        # the reserve goes where the commander is (the player aims it); Labienus's veterans fight a little harder
        if move in ("shiftres","labienus","leadres") and cmd in SECT:
            men[cmd]+=men["reserve"]*(1.2 if move=="labienus" else 1.0); men["reserve"]=0
        if ph==5 and sc["crisis"] in ("sendlab","yourself"):
            crisis=max(SECT,key=lambda k:press[k]-men[k]*s["works"][k]*TERRAIN[k])   # the scene reveals where the main blow falls
            if sc["crisis"]=="sendlab": men[crisis]+=men["reserve"]*0.5*1.2; men["reserve"]*=0.5
            else: cmd=crisis
        if ph==5 and sc["crisis"]=="abandon":
            press["north"]+=press["rea"]*0.5; press["plain"]+=press["rea"]*0.3; press["rea"]=0; s["morale"]-=10
        mf=0.7+s["morale"]/200
        res={}
        for k in SECT:
            d=(men[k]+BASE)*s["works"][k]*TERRAIN[k]*mf
            if k=="plain": d+=cavd["plain"]*(2.0 if move=="german" else 1.2)
            if cmd==k: d*=CB
            p=press[k]
            res[k]="none" if p<=0.5 else band(d/p)
        # consequences
        b=[k for k in SECT if res[k]=="breach"]
        if ph==5 and cmd!="camp" and res.get(cmd)=="breach" and s["morale"]<DM:
            return fin("death",s,strat,log,trace)
        if "inner" in b and any(k!="inner" for k in b): return fin("trapped",s,strat,log,trace)
        for k in SECT:
            if res[k]=="breach":
                s["coh"]-=8; s["morale"]-=MB if cmd!=k else MB//2; s["allies"]-=5; s["everbreach"]=True; s["breaches"]+=1
                if k=="inner" and plan=="breakout" and ph==2: s["escaped"]=True
            elif res[k]=="strained": s["coh"]-=3; s["morale"]-=5 if cmd!=k else 2
            elif res[k]=="held": s["morale"]+=2
        # move outcomes after battle
        if move=="sortie":
            if res["plain"]=="easy" and cavd["plain"]>=12: s["relief"]-=15; s["hunter"]=True; s["morale"]+=5
            else: s["coh"]-=8; s["morale"]-=10
        if move=="german" and res["plain"] in("held","easy"): s["relief"]-=5; s["morale"]+=5
        if move=="counter" and res["plain"]=="easy": s["relief"]-=10
        if move=="harass": pass
        # upkeep
        s["grain"]-=UPKEEP+(6 if s.get("mandthrough") else 0)
        if plan=="hunger" and cavd["patrol"]<12: s["grain"]-=14
        s["hunger"]+=12
        s["morale"]=min(100,s["morale"])
        log.append((ph,res))
        if trace: print(ph,res,{k:round(s[k],1) if isinstance(s[k],float) else s[k] for k in("coh","grain","morale","allies","relief")})
        if s["morale"]<=0: return fin("army_breaks",s,strat,log,trace)
        if s["grain"]<=0: return fin("siege_lifted",s,strat,log,trace)
        if s["allies"]<=0: return fin("gaul_rises",s,strat,log,trace)
        if ph==5:
            final=res; finalmove=move; cavres=cavd["reserve"]
            if b: return fin("stalemate",s,strat,log,trace)
            destroyed = s["relief"]<=40 or (finalmove=="cavround" and cavres>=12 and all(final[k] in("held","easy","none") for k in("plain","rea","north")))
            s["destroyed"]=destroyed; s["cmd5"]=cmd
            if s["coh"]<60 or s["morale"]<25: return fin("bronze",s,strat,log,trace)
            if destroyed and (s["coh"]<GC or s["morale"]<GM): destroyed=False
            if s["escaped"]: return fin("gold" if destroyed else "silver",s,strat,log,trace)
            return fin("gold" if destroyed else "silver",s,strat,log,trace)
def fin(outcome,s,strat,log,trace):
    sc=strat["scenes"]; un=[]
    win=outcome in("gold","silver","bronze")
    if win:
        if outcome=="gold" and sc["riders"]=="letgo" and sc["mandubii"]=="keepout" and sc["crisis"] in("sendlab","yourself") and sc["surrender"]=="triumph" and not s["escaped"]: un.append("throws_down_arms")
        if s.get("cmd5")=="rea" or (sc["crisis"]=="yourself"): un.append("red_cloak")
        if not s["everbreach"]: un.append("iron_ring")
        if s["hunter"]: un.append("hunter_hunted")
        if sc["mandubii"]=="through" and sc["surrender"]=="spare": un.append("clemency")
        if s["escaped"] and s.get("destroyed"): un.append("eagle_free")
    if outcome=="trapped" and len(log)>=3: un.append("gaul_unbound")
    return outcome,un,s
