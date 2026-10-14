import json, os
P=lambda k,d: float(os.environ.get(k,d))
MAIN=[["path","==","main"]]
def O(id,label,add=None,set=None,cond=None,end=None,hist=False):
    o={"id":id,"label":label}
    if hist:o["historical"]=True
    if end:o["end"]=end;return o
    if add:o["add"]=add
    if set:o["set"]=set
    if cond:o["cond"]=cond
    return o
def C(if_,then,else_=None):
    c={"if":if_,"then":then}
    if else_ is not None:c["else"]=else_
    return c
def S(id,title,opts,only=MAIN,**kw):
    s={"id":id,"title":title,"variants":[{"if":only,"options":opts}]};s.update(kw);return s
def V(id,title,variants,**kw):
    s={"id":id,"title":title,"variants":variants};s.update(kw);return s
def B(id,title,path,opts,**kw): return S(id,title,opts,only=[["path","==",path]],branch=True,**kw)
def A(**k): return {"add":k}
def back(**k): return {"add":k,"set":{"path":"main"}}
ANT=[["path","==","main"],["patron","!=","octavian"]]; OCT=[["path","==","main"],["patron","==","octavian"]]
scenes=[
# ---------- Era 1: Daughter of the Nile (51-48)
S("Q01","Accession (51 BC)",[
 O("alone","Rule alone, dropping your brother's name",{"divinity":10,"rivals":15,"alexandria":-5},{"accession":"alone"},hist=True),
 O("share","Share the throne with Ptolemy XIII",{"rivals":-10,"divinity":-5,"alexandria":5},{"accession":"share"}),
 O("council","Rule through Pothinus's regency council",{"rivals":-5,"divinity":-10,"treasury":5},{"accession":"council"})]),
S("Q02","The low Nile (50 BC)",[
 O("alexgrain","Send all the grain to Alexandria",{"alexandria":10,"divinity":-10,"rivals":5},{"nile":"city"},hist=True),
 O("country","Share it with the villages of the Nile",{"divinity":10,"alexandria":-10,"treasury":-5},{"nile":"villages"}),
 O("sell","Sell the surplus abroad",{"treasury":15,"divinity":-10,"alexandria":-5},{"nile":"sold"})]),
S("Q03","Pompey's son (49 BC)",[
 O("ships","Give him ships and grain",{"rome":5,"fleet":-5,"treasury":-5},{"pompey":True},hist=True),
 O("refuse","Refuse him",{"rome":-10,"divinity":5},{"pompey":"refused"}),
 O("token","Send a token gift",{"treasury":-3})]),
S("Q04","Driven out (48 BC)",[
 O("syria","Raise an army in Syria",{"fleet":10,"treasury":-10,"rivals":10},hist=True),
 O("pothinus","Make peace with Pothinus",set={"path":"pothinus"}),
 O("appeal","Appeal to Rome for help",{"rome":5,"divinity":-5,"rivals":5})],drift_after=True,after=["pompeyhead","nileecho"]),
B("QB1","The regent's peace (48 BC)","pothinus",[
 O("coreign","Reign beside your brother under Pothinus",{"rivals":20,"divinity":-15},{"path":"main","incourt":True}),
 O("plot","Plot against Pothinus from inside the palace",cond=[C([["alexandria",">=",45]],{"add":{"rivals":-20,"alexandria":5},"set":{"path":"main","incourt":True}},{"end":"exiled_forever"})])]),
# ---------- Era 2: Caesar (48-44)
S("Q05","Caesar in Alexandria (48 BC)",[
 O("bedsack","Be smuggled into the palace to meet him",{"rome":15,"rivals":10},hist=True),
 O("pelusium","March on Alexandria with your army",set={"path":"pelusium"}),
 O("envoys","Send envoys and wait",{"rome":5,"rivals":5})]),
B("QB2","Pelusium (48 BC)","pelusium",[
 O("attack","Attack your brother's army",cond=[C([["fleet",">=",40]],back(rivals=-25,fleet=-10,rome=10),{"end":"exiled_forever"})]),
 O("withdraw","Withdraw and wait for Caesar",{"rome":-10},{"path":"main"})]),
S("Q06","The Alexandrian War (48-47 BC)",[
 O("siege","Stand with Caesar through the siege",set={"siege":True},hist=True),
 O("negotiate","Negotiate with your brother's side",{"rivals":-10,"rome":-15}),
 O("slip","Slip away to safety",{"rome":-20,"divinity":-5})],after=["alexwar"]),
S("Q07","Arsinoe captured (47 BC)",[
 O("parade","Let Caesar parade her in Rome",{"rome":5,"rivals":-10},{"arsinoe":"ephesus"},hist=True),
 O("execute","Have her executed",{"rivals":-25,"rome":-10,"divinity":-5},{"arsinoe":"dead"}),
 O("hostage","Keep her as a hostage in Alexandria",{"rivals":5,"alexandria":5},{"arsinoe":"home"})]),
S("Q08","The Nile cruise (47 BC)",[
 O("cruise","Show Caesar Egypt",{"divinity":10,"rome":5,"treasury":-5},hist=True),
 O("stay","Ask Caesar to stay with you",set={"path":"nilepact"}),
 O("sendback","Send him back to Rome quickly",{"rome":10,"divinity":-5})]),
B("QN1","Caesar's court (47 BC)","nilepact",[
 O("consort","Crown him your consort",{"divinity":5,"rome":-30,"alexandria":-10}),
 O("general","Keep him as Rome's general in Egypt",{"rome":-15,"fleet":15})]),
B("QN2","Enemy of the Republic (46 BC)","nilepact",[
 O("pay","Pay his legions from your treasury",{"treasury":-20,"fleet":15}),
 O("bribe","Buy friends in the Senate",{"treasury":-15,"rome":15}),
 O("home","Send him home to Rome",{"rome":10},{"path":"main"})]),
B("QN3","The fleet at Pharos (45 BC)","nilepact",[
 O("fight","Fight the Roman fleet",cond=[C([["fleet",">=",int(P("NPF",55))],["treasury",">=",20]],{"end":"nile_pact"},{"end":"annexed"})]),
 O("treat","Treat with the Senate's admiral",cond=[C([["rome",">=",int(P("NPR",40))]],{"end":"nile_pact"},{"end":"annexed"})])]),
S("Q09","Caesarion (47 BC)",[
 O("name","Name Caesar as the father",{"divinity":10,"rome":5,"octavian":20},{"caesarion":"named"},hist=True),
 O("unnamed","Leave the father unnamed",{"divinity":-5},{"caesarion":"unnamed"}),
 O("amun","Proclaim him a son of Amun",{"divinity":15,"rome":-10},{"caesarion":"amun"})]),
S("Q10","Rome (46 BC)",[
 O("villa","Live in Caesar's villa across the Tiber",{"rome":10,"alexandria":-10,"rivals":10,"treasury":-5},{"inrome":True},hist=True),
 O("alexandria","Stay in Alexandria",{"alexandria":10,"rome":-10,"divinity":5}),
 O("triumph","Visit only for his triumph",{"rome":5,"treasury":-5},{"inrome":True})],after=["triumphbeat"]),
S("Q11","The Ides of March (44 BC)",[
 O("flee","Flee Rome for Egypt",{"rome":-10},hist=True),
 O("warn","Warn Caesar of the plot",cond=[C([["inrome","==",True]],{"set":{"path":"warning"}},A(rome=-5))]),
 O("claim","Stay to press Caesarion's claim",{"rome":-20,"octavian":20,"alexandria":-5})],drift_after=True,after=["idesbeat","nileecho"]),
B("QW1","The morning of the Ides (44 BC)","warning",[
 O("guard","Beg him to keep his guard",cond=[C([["rome",">=",int(P("WR",55))]],{"add":{"rome":5},"set":{"caesaralive":True}},back(rome=-15))]),
 O("names","Name the conspirators to him",cond=[C([["rome",">=",int(P("WR",55))-10],["divinity",">=",50]],{"add":{"octavian":-10},"set":{"caesaralive":True}},back(rome=-20))])]),
B("QW2","Queen in Rome (44 BC)","warning",[
 O("quiet","Live quietly across the Tiber",{"rome":10,"divinity":-10}),
 O("beside","Appear beside him as queen",{"rome":-25,"divinity":10,"alexandria":5}),
 O("egypt","Return to Egypt as his ally",{"alexandria":10,"rome":5})]),
B("QW3","The succession (43 BC)","warning",[
 O("caesarion","Make Caesarion his heir",cond=[C([["rome",">=",int(P("WS",50))]],{"end":"two_worlds"},{"end":"murdered_in_rome"})]),
 O("split","Rome for Octavian, Egypt for Caesarion",cond=[C([["rome",">=",int(P("WS",50))-15]],{"end":"two_worlds"},{"end":"murdered_in_rome"})])]),
# ---------- Era 3: Between Romans (44-41)
S("Q12","Ptolemy XIV (44 BC)",[
 O("remove","Remove him; make Caesarion co-ruler",{"rivals":-20,"divinity":5},hist=True),
 O("keep","Keep him as your husband-king",{"rivals":10},{"brother":"kept"}),
 O("exile","Exile him",{"rivals":-5,"alexandria":-5},{"brother":"exiled"})]),
S("Q13","Liberators or triumvirs (43 BC)",[
 O("triumvirs","Promise your fleet to the triumvirs",{"fleet":-15,"rome":5},hist=True),
 O("cassius","Send help to Cassius",{"rome":-25,"octavian":20,"treasury":-15}),
 O("neutral","Stay neutral and plead famine",{"rome":-10,"treasury":5})],after=["stormbeat"]),
S("Q14","The famine (42 BC)",[
 O("granaries","Open the royal granaries",{"treasury":-10,"alexandria":10,"divinity":10},{"famine":"fed"},hist=True),
 O("alexonly","Feed only Alexandria",{"alexandria":10,"divinity":-10}),
 O("sellrome","Sell grain to Rome's armies",{"treasury":15,"divinity":-15,"rome":5},{"famine":"sold"})]),
S("Q15","Tarsus (41 BC)",[
 O("barge","Arrive on a golden barge as Aphrodite",{"rome":10,"divinity":5,"treasury":-10,"octavian":5},{"patron":"antony"},hist=True),
 O("humble","Go humbly and explain yourself",{"rome":5},{"patron":"antony"}),
 O("octavian","Refuse, and court Octavian instead",{"octavian":-25,"rome":-5},{"patron":"octavian"})],drift_after=True,after=["nileecho","heirecho"],
 scene_cond=[{"if":[["caesarion","==","named"]],"then":{"add":{"rome":10,"octavian":5}}},{"if":[["caesarion","==","amun"]],"then":{"add":{"divinity":5,"rome":-5}}}]),
# ---------- Era 4: Antony (41-32), varies with the Roman she backed
S("Q16","Arsinoe at Ephesus (41 BC)",[
 O("kill","Ask your Roman to have her killed",{"rivals":-25,"divinity":-5,"rome":-5},{"arsinoe":"dead"},hist=True),
 O("live","Let her live at Ephesus",{"rivals":10}),
 O("home","Bring her home as a hostage",{"alexandria":-5,"rivals":5},{"arsinoe":"home"})],only=[["path","==","main"],["arsinoe","!=","dead"]]),
V("Q17","Antony's winter (41 BC)",[
 {"if":OCT,"image":"QO1","options":[
  O("grain","Send Octavian grain for Rome",{"treasury":-15,"rome":15,"octavian":-15}),
  O("refuse","Refuse his demand",{"rome":-15,"octavian":15}),
  O("both","Send grain to Antony as well",{"treasury":-20,"octavian":10,"rome":5})]},
 {"if":ANT,"options":[
  O("keep","Keep Antony in Alexandria",{"rome":-10,"alexandria":10,"treasury":-10,"octavian":10},hist=True),
  O("send","Send him back to Rome",{"rome":10}),
  O("partner","Plan the East with him as an equal",{"fleet":10,"octavian":5})]}]),
V("Q18","The Parthian war (36 BC)",[
 {"if":OCT,"image":"QO2","options":[
  O("payoff","Pay Antony to leave you alone",{"treasury":-20,"rome":5}),
  O("borders","Guard your borders",{"fleet":10,"treasury":-10}),
  O("secret","Court Antony in secret",{"octavian":25,"rome":5})]},
 {"if":ANT,"options":[
  O("fund","Fund Antony but stay in Egypt",{"treasury":-10,"rome":5},hist=True),
  O("ride","Ride east with him",set={"path":"parthia"}),
  O("nofund","Refuse to pay for his war",{"rome":-15,"treasury":10})]}]),
B("QB3","The Parthian march (36 BC)","parthia",[
 O("front","Lead from the front",cond=[C([["fleet",">=",int(P("PF",45))],["rome",">=",int(P("PR",55))]],back(rome=15,divinity=10,octavian=10),back(fleet=-20,rome=-10))]),
 O("turn","Turn back at Armenia",{"rome":-10},{"path":"main"})]),
V("Q19","The Donations of Alexandria (34 BC)",[
 {"if":OCT,"image":"QO3","options":[
  O("hide","Hide Caesarion's father",{"octavian":-25,"divinity":-10}),
  O("proclaim","Proclaim him Caesar's son",{"octavian":30,"divinity":10}),
  O("hostage","Send him to Rome as a hostage",{"rome":15,"divinity":-15,"octavian":-15},{"caesarion":"hostage"})]},
 {"if":ANT,"options":[
  O("crown","Crown your children rulers of the East",{"divinity":15,"alexandria":10,"rome":-20,"octavian":20},hist=True),
  O("egyptonly","Crown only Caesarion, king of Egypt",{"divinity":5,"octavian":10}),
  O("refuse","Refuse the titles",{"rome":5,"divinity":-10})]}],drift_after=True,after=["famineecho"]),
# ---------- Era 5: Actium (32-30)
V("Q20","War is declared (32 BC)",[
 {"if":OCT,"image":"QO4","options":[
  O("sendfleet","Send your fleet to Octavian",{"fleet":-10,"rome":15,"octavian":-15}),
  O("neutral","Stay neutral",{"rome":-10}),
  O("switch","Change sides to Antony",{"octavian":30},{"patron":"antony"})]},
 {"if":ANT,"options":[
  O("sail","Sail with the fleet yourself",{"fleet":10,"rome":-10,"octavian":10},hist=True),
  O("stayhome","Stay in Alexandria and send the fleet",{"alexandria":10,"fleet":-5}),
  O("abandon","Make peace with Octavian, abandoning Antony",{"octavian":-10,"rome":5,"fleet":-10,"divinity":-10},{"patron":"octavian"})]}],after=["returns","brotherback"]),
V("Q21","Actium (31 BC)",[
 {"if":OCT,"image":"QO5","options":[
  O("handover","Hand Antony over to Octavian",{"octavian":-25,"divinity":-10,"alexandria":-10}),
  O("shelter","Give Antony shelter",{"octavian":30},{"patron":"antony","lostwar":True}),
  O("pass","Let him pass through Egypt",{"octavian":5})]},
 {"if":ANT,"options":[
  O("breakout","Break out with the treasure ships",{"fleet":-20,"treasury":5},{"lostwar":True},hist=True),
  O("fight","Fight to the end",set={"path":"actium"}),
  O("surrender","Surrender the fleet to Octavian",{"octavian":-10,"rome":-10,"fleet":-30},{"patron":"octavian","lostwar":True})]}],after=["antonybeat","cityturns"]),
B("QB4","Fight to the end (31 BC)","actium",[
 O("line","Hold the line with every ship",cond=[C([["fleet",">=",int(P("AF",45))],["treasury",">=",int(P("AT",30))],["octavian","<=",int(P("AO",70))]],{"set":{"warwon":True,"path":"main"}},{"end":"lost_at_sea"})]),
 O("fireships","Send fireships into his line",cond=[C([["fleet",">=",int(P("AF",45))-10],["divinity",">=",60],["octavian","<=",int(P("AO",70))]],{"set":{"warwon":True,"path":"main"}},{"end":"lost_at_sea"})])]),
V("Q22","The last summer (30 BC)",[
 {"if":[["path","==","main"],["warwon","==",True]],"image":"QO6","options":[
  O("east","Rule the East with Antony",end="eastern_empire"),
  O("peace","Crown Caesarion and make peace with Rome",{"octavian":-40,"rome":30,"divinity":5},{"path":"settled"})]},
 {"if":[["path","==","main"],["patron","==","octavian"],["lostwar","!=",True]],"image":"QO7","options":[
  O("ally","Stay Octavian's loyal ally",end="octavians_ally"),
  O("freedom","Ask freedom for Egypt and Caesarion",set={"path":"settled"})]},
 {"if":MAIN,"options":[
  O("asp","Choose your own death",end="asp",hist=True),
  O("redsea","Flee east by the Red Sea",set={"path":"redsea"}),
  O("treat","Treat with Octavian",cond=[C([["octavian","<=",int(P("TO",40))]],{"end":"client_queen"},None),C([["famine","==","fed"],["octavian","<=",int(P("TO",40))+20]],{"end":"client_queen"},{"end":"paraded_chains"})])]}]),
B("QE1","Hauling the fleet (30 BC)","redsea",[
 O("drag","Drag your ships across the isthmus",{"treasury":-20,"fleet":10}),
 O("buy","Buy ships at Berenice",{"treasury":-30})]),
B("QE2","The Nabataeans (30 BC)","redsea",[
 O("payoff","Pay off King Malichus",cond=[C([["treasury",">=",int(P("RT",20))]],A(treasury=-20),{"end":"paraded_chains"})]),
 O("fight","Fight your way through",cond=[C([["fleet",">=",int(P("RF",40))]],A(fleet=-15),{"end":"paraded_chains"})])]),
B("QE3","The Indian Ocean (30 BC)","redsea",[
 O("sail","Sail for India with Caesarion",end="queen_indies"),
 O("alone","Send Caesarion on alone, and face Octavian",end="asp")]),
]
events={
 "heirecho":{"branches":[{"if":[["arsinoe","==","dead"]],"then":{"add":{"divinity":-10,"rome":-5}}},{"if":[["arsinoe","==","home"]],"then":{"add":{"rivals":20}}},{"if":[["accession","==","alone"]],"then":{"add":{"divinity":5}}},{"if":[["caesarion","==","unnamed"]],"then":{"add":{"octavian":-10,"divinity":-5}}},{"then":{}}]},
 "famineecho":{"branches":[{"if":[["famine","==","fed"]],"then":{"add":{"alexandria":10,"divinity":10}}},{"if":[["famine","==","sold"]],"then":{"add":{"alexandria":-15,"divinity":-10}}},{"then":{"add":{"divinity":-10}}}]},
 "nileecho":{"branches":[{"if":[["nile","==","city"]],"then":{"add":{"alexandria":5}}},{"if":[["nile","==","villages"]],"then":{"add":{"divinity":5}}},{"if":[["nile","==","sold"]],"then":{"add":{"divinity":-5,"alexandria":-5}}},{"then":{}}]},
 "returns":{"branches":[{"if":[["arsinoe","in",["ephesus","free"]]],"beat":"QT7","then":{"add":{"octavian":15,"rivals":25}}},{"then":{}}]},
 "brotherback":{"branches":[{"if":[["brother","==","kept"]],"then":{"add":{"rivals":25,"alexandria":-10}}},{"if":[["brother","==","exiled"]],"then":{"add":{"octavian":15,"rome":-10}}},{"then":{}}]},
 "cityturns":{"branches":[{"if":[["famine","==","sold"],["lostwar","==",True]],"then":{"add":{"alexandria":-35}}},{"if":[["famine","==","fed"]],"then":{"add":{"alexandria":10}}},{"then":{}}]},
 "pompeyhead":{"branches":[{"if":[["pompey","==",True]],"beat":"QT1","then":{"add":{"rome":-10}}},{"if":[["pompey","==","refused"]],"beat":"QT1","then":{"add":{"rome":15}}},{"beat":"QT1","then":{}}]},
 "alexwar":{"branches":[
   {"if":[["siege","==",True]],"score":{"terms":[{"var":"fleet","mult":1},{"var":"rome","mult":0.5},{"var":"alexandria","mult":0.3},{"var":"rivals","mult":-0.5},{"if":[["accession","==","share"]],"add":10},{"if":[["accession","==","council"]],"add":-10}],"at_least":P("AW",41)},
    "beat":"QT2","then":{"add":{"rivals":-40,"rome":10},"set":{"siege":False}}},
   {"if":[["siege","==",True]],"beat":"QT2","then":{"add":{"rome":-15,"fleet":-15,"alexandria":-15,"rivals":-10},"set":{"siege":False}}},{"then":{}}]},
 "triumphbeat":{"branches":[{"if":[["arsinoe","==","ephesus"],["inrome","==",True]],"beat":"QT3","then":{}},{"then":{}}]},
 "idesbeat":{"branches":[{"if":[["path","==","main"]],"beat":"QT4","then":{}},{"then":{}}]},
 "stormbeat":{"branches":[{"if":[["path","==","main"]],"beat":"QT5","then":{}},{"then":{}}]},
 "antonybeat":{"branches":[{"if":[["lostwar","==",True],["path","==","main"]],"beat":"QT6","then":{}},{"then":{}}]},
}
for s in scenes:
    if s["id"]=="Q13": s["variants"][0]["options"][0].setdefault("set",{})["triumvirs"]=True
events["stormbeat"]={"branches":[{"if":[["triumvirs","==",True]],"beat":"QT5","then":{"add":{"fleet":-10}}},{"then":{}}]}
drift=[{"add":{"treasury":-5}},
 {"if":[["accession","==","alone"]],"add":{"divinity":5}},
 {"if":[["accession","==","share"]],"add":{"alexandria":5,"rivals":5}},
 {"if":[["accession","==","council"]],"add":{"treasury":5,"divinity":-5}},
 {"if":[["divinity",">=",50]],"add":{"treasury":15}},
 {"if":[["patron","==","antony"]],"add":{"octavian":int(P("DO",5))}},
 {"if":[["caesarion","==","named"]],"add":{"octavian":5}},
 {"if":[["rivals",">=",60]],"add":{"alexandria":-5}}]
failures=[{"if":[["treasury","<=",0]],"end":"empty_granaries"},
 {"if":[["alexandria","<=",0]],"end":"alexandrian_mob"},
 {"if":[["divinity","<=",0]],"end":"priests_turn"},
 {"if":[["rome","<=",0]],"end":"annexed"},
 {"if":[["rivals",">=",100]],"end":"arsinoe_throne"},
 {"if":[["octavian",">=",100]],"end":"paraded_chains"}]
finale={"terms":[{"var":"rome","mult":1}],"outcomes":[
 {"if":[["warwon","==",True],["caesarion","in",["named","amun"]],["rome",">=",int(P("FR",80))],["divinity",">=",int(P("FD",75))],["alexandria",">=",int(P("FA",50))],["treasury",">=",int(P("FT",35))],["octavian","<=",int(P("FO",30))],["rivals","<=",60],["caesarion","!=","hostage"]],"end":"queen_of_kings"},
 {"if":[["patron","==","octavian"],["caesarion","in",["unnamed","amun"]],["rome",">=",int(P("FR",80))],["divinity",">=",int(P("FD",75))],["alexandria",">=",int(P("FA",50))],["treasury",">=",int(P("FT",35))],["octavian","<=",int(P("FO",30))],["rivals","<=",60]],"end":"queen_of_kings"},
 {"end":"client_queen"}]}
endings={"asp":"historical","queen_of_kings":"outperformed","client_queen":"fallen_short",
 "empty_granaries":"fallen","alexandrian_mob":"fallen","priests_turn":"fallen","annexed":"fallen","arsinoe_throne":"fallen",
 "paraded_chains":"fallen","exiled_forever":"fallen","murdered_in_rome":"fallen","lost_at_sea":"fallen",
 "nile_pact":"alternate","two_worlds":"alternate","eastern_empire":"alternate","octavians_ally":"alternate","queen_indies":"alternate"}
R={"version":1,"ruler":"cleopatra","meter_range":[0,100],
 "meters":{"treasury":60,"alexandria":50,"divinity":45,"fleet":35,"rome":50,"octavian":0,"rivals":40},
 "hidden":["octavian","rivals"],
 "flags":{"path":"main","patron":"none","pompey":False,"incourt":False,"siege":False,"arsinoe":"free","caesarion":"none",
   "inrome":False,"caesaralive":False,"nile":"none","accession":"none","brother":"removed","famine":"none","triumvirs":False,"lostwar":False,"warwon":False},
 "scenes":scenes,"events":events,"drift":drift,"failures":failures,"finale":finale,"endings":endings}
json.dump(R,open(os.environ.get("OUT","rules.json"),"w"),indent=1)
print(len(scenes),"scenes")
