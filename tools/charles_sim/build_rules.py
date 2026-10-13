import json, os
DT=int(os.environ.get("DT","10")); PT=int(os.environ.get("PT","75")); MT=int(os.environ.get("MT","40")); CL=int(os.environ.get("CL","45")); CH=int(os.environ.get("CH","60")); PG=int(os.environ.get("PG","50"))
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
    s={"id":id,"title":title,"variants":[{"if":only,"options":opts}]}
    s.update(kw);return s
def B(id,title,path,opts,**kw):
    return S(id,title,opts,only=[["path","==",path]],branch=True,**kw)
def A(**k): return {"add":k}
def back(**k): return {"add":k,"set":{"path":"main"}}

scenes=[
# ---------- Era 1: The Favourite (1625-1629)
S("K01","The Favourite (1625)",[
  O("keep","Keep Buckingham and back his war with Spain",{"treasury":-5,"parliament":-10,"majesty":5},{"buck":True},hist=True),
  O("council","Share power with the Council",{"parliament":5,"majesty":-5,"distrust":-5}),
  O("dismiss","Dismiss Buckingham to win Parliament",{"parliament":15,"majesty":-10,"army":-5,"distrust":-5})]),
S("K02","The Forced Loan (1626-27)",[
  O("loan","Dissolve Parliament and raise a forced loan",{"treasury":15,"parliament":-15,"distrust":5},hist=True),
  O("grant","Give Parliament what it asks for a grant of taxes",{"treasury":10,"parliament":10,"majesty":-10},{"buck":False}),
  O("peace","Make peace and cut the war",{"treasury":5,"parliament":5,"majesty":-10}),
  O("re","Lead the expedition to Ré yourself",{"army":5,"treasury":-5},{"path":"re"})]),
B("KB1","The citadel of Ré (1627)","re",[
  O("storm","Storm the citadel",cond=[C([["army",">=",40],["treasury",">=",35]],back(majesty=15,army=5,parliament=5),back(army=-20,treasury=-15,majesty=-15))]),
  O("withdraw","Withdraw to England",{"majesty":-10},{"path":"main"})]),
S("K03","The Petition of Right (1628)",[
  O("ignore","Grant it, then keep collecting customs regardless",{"treasury":10,"parliament":5,"distrust":15},{"lied":True},hist=True),
  O("keep","Grant it and keep to it",{"parliament":15,"treasury":-10,"majesty":-5,"distrust":-10}),
  O("refuse","Refuse it",{"parliament":-20,"majesty":5})],after=["felton"]),
S("K04","The Three Resolutions (1629)",[
  O("dissolve","Dissolve Parliament and rule alone",{"parliament":-15,"majesty":5},{"personal":True},hist=True),
  O("recall","Call a new Parliament",{"parliament":5,"treasury":5,"majesty":-5}),
  O("accept","Accept its resolutions",{"parliament":15,"majesty":-15,"church":-10})],drift_after=True),
# ---------- Era 2: The Personal Rule (1629-1640)
S("K05","Thorough (1633)",[
  O("wentworth","Send Wentworth to rule Ireland with a free hand",{"treasury":10,"ireland":20,"army":5},hist=True),
  O("gentle","Rule Ireland gently through its own lords",{"ireland":-10,"treasury":-5}),
  O("leave","Leave Ireland alone",{"ireland":5})]),
S("K06","Laud (1633)",[
  O("laud","Make Laud archbishop and enforce ceremony",{"church":15,"scotland":10,"parliament":-5},{"laud":True},hist=True),
  O("moderate","Choose a moderate archbishop",{"church":-5,"parliament":5}),
  O("puritans","Leave the Puritans in peace",{"church":-15,"majesty":-5,"parliament":10})]),
S("K07","Ship Money (1635)",[
  O("extend","Extend Ship Money to the whole kingdom",{"treasury":10,"parliament":-5,"army":5},{"shipmoney":True},hist=True),
  O("ports","Keep it to the ports",{"treasury":8,"parliament":-3}),
  O("callparl","Call Parliament for a proper grant",cond=[C([["parliament",">=",50]],A(treasury=15,parliament=-5,distrust=-5),A(parliament=-10,majesty=-5,distrust=-5))])],after=["hampden"]),
S("K08","The Prayer Book (1637)",[
  O("impose","Impose the new Prayer Book on Scotland",{"scotland":30,"church":10},hist=True),
  O("ownbook","Let the Scots write their own",{"scotland":-10,"church":-5,"majesty":-5}),
  O("drop","Drop it",{"scotland":-5,"majesty":-5})],after=["stgiles"]),
S("K09","The Covenant (1638-39)",[
  O("march","March north against the Covenanters",set={"bw":True},hist=True),
  O("assembly","Grant a free General Assembly",{"scotland":-15,"church":-10,"majesty":-5}),
  O("concede","Concede everything",{"scotland":-30,"church":-15,"majesty":-15}),
  O("irisharmy","Bring Wentworth's Irish army",{"ireland":15,"distrust":10},{"path":"irisharmy"})],after=["bishopswar"]),
B("KB2","The Irish army lands (1640)","irisharmy",[
  O("fight","Fight the Covenanters",cond=[C([["army",">=",45],["treasury",">=",30]],back(scotland=-40,parliament=-15,ireland=10,majesty=10),{"end":"beaten_by_scots"})]),
  O("threat","Hold it as a threat",back(ireland=10,parliament=-15,scotland=5)["add"],{"path":"main"})]),
S("K10","The Short Parliament (1640)",[
  O("money","Demand money first, then dissolve",{"parliament":-10,"distrust":5},hist=True),
  O("grievances","Hear grievances first",cond=[C([["distrust",">=",30]],A(parliament=5,treasury=5,distrust=-5,church=-10,scotland=-5),A(parliament=10,treasury=10,distrust=-10,church=-10,scotland=-5))]),
  O("scotspeace","Make peace with the Scots instead",{"scotland":-20,"majesty":-10,"treasury":5,"distrust":-5,"parliament":5,"church":-5})],drift_after=True),
# ---------- Era 3: The Breaking (1640-1642)
S("K11","Strafford (1641)",[
  O("sign","Sign his death warrant",{"parliament":15,"distrust":15,"army":-5,"majesty":-10},{"lied":True},hist=True),
  O("refuse","Refuse, and defy Parliament",{"parliament":-20,"majesty":5,"distrust":-10}),
  O("free","Free him from the Tower by force",set={"path":"armyplot"})],after=["strafford_beat"]),
B("KB3","The Army Plot (1641)","armyplot",[
  O("go","Storm the Tower",cond=[C([["army",">=",45]],{"add":{"majesty":10,"parliament":-25,"distrust":20,"army":5},"set":{"path":"main","lied":True}},{"add":{"parliament":-30,"distrust":25,"majesty":-15},"set":{"path":"main","lied":True}})]),
  O("calloff","Call it off",{"distrust":10,"parliament":-5},{"path":"main"})]),
S("K12","The Irish Rising (1641)",[
  O("command","Insist that command of any army stays with the king",{"parliament":-10,"majesty":5},hist=True),
  O("parlcmd","Let Parliament name the commanders",{"parliament":10,"majesty":-15,"army":-10,"distrust":-5}),
  O("irishlords","Negotiate with the Irish lords",{"ireland":-20,"church":10,"parliament":-15,"distrust":5})],
  scene_cond=[{"if":[["ireland",">=",60]],"then":{"add":{"parliament":-10}}}]),
S("K13","The Five Members (1642)",[
  O("arrest","Go to the Commons yourself, with soldiers",{"parliament":-25,"majesty":-10,"distrust":10},{"lied":True},hist=True),
  O("impeach","Impeach them through the courts",{"parliament":-5,"distrust":-5}),
  O("concede","Drop it and offer concessions",{"parliament":10,"majesty":-10,"distrust":-5})],after=["birds"]),
S("K14","Nottingham (1642)",[
  O("standard","Raise the royal standard",{"army":20,"majesty":5},{"war":True},hist=True),
  O("nineteen","Accept Parliament's Nineteen Propositions",set={"path":"nineteen"}),
  O("settle","Settle with Parliament",cond=[C([["parliament",">=",PG],["distrust","<=",20],["church",">=",35],["church","<=",65]],{"set":{"path":"peace","war":False,"personal":False}},{"set":{"path":"nineteen"}})])],drift_after=True),
B("KB4","The king in council (1642)","nineteen",[
  O("agree","Agree to abolish the bishops",end="crowned_figurehead"),
  O("tear","Tear up the deal and raise the standard",{"army":10,"majesty":-10},{"war":True,"path":"main"})]),
# ---- Arc: The Peace (1642-1645)
B("KA1","The Militia (1642)","peace",[
  O("share","Share command of the militia",{"parliament":5,"army":-5,"distrust":-5}),
  O("give","Give Parliament the militia",{"parliament":15,"majesty":-15,"army":-15}),
  O("keepm","Keep the militia",{"parliament":-20,"majesty":5},cond=[C([["parliament","<",40]],{"add":{"army":15},"set":{"war":True,"path":"main"}})])]),
B("KA2","Root and Branch (1643)","peace",[
  O("reduced","Offer bishops bound by councils of clergy",{"church":-10,"scotland":-10,"parliament":10}),
  O("abolish","Abolish the bishops",{"church":-30,"scotland":-20,"majesty":-15}),
  O("keepb","Keep the bishops as they are",{"church":10,"parliament":-15,"scotland":10})]),
B("KA3","Reconquering Ireland (1643)","peace",[
  O("lead","Lead the army to Ireland yourself",{"ireland":-20,"army":10,"majesty":15,"treasury":-15}),
  O("adventurers","Let Parliament conquer it for land",{"ireland":25,"parliament":10}),
  O("toleration","Offer the Irish Catholics toleration",{"ireland":-30,"church":10,"parliament":-15,"distrust":5})]),
B("KA4","The Prince's education (1644)","peace",[
  O("protestant","Raise the Prince of Wales under Parliament's tutors",{"parliament":10,"distrust":-10,"majesty":-5}),
  O("queenkeeps","Leave him with the queen",{"parliament":-10,"church":5}),
  O("sendqueen","Send the queen to France",{"parliament":15,"majesty":-5,"distrust":-5})]),
# ---------- Era 4: Civil War (1642-1646)
S("K15","Edgehill (1642)",[
  O("oxford","Advance slowly and make Oxford your capital",{"army":5},hist=True),
  O("london","March hard on London",set={"path":"turnham"}),
  O("terms","Offer terms",cond=[C([["distrust","<=",25],["parliament",">=",45]],{"add":{"majesty":-10},"set":{"path":"settled","war":False,"personal":False}},A(majesty=-10,distrust=5))])]),
B("KB5","Turnham Green (1642)","turnham",[
  O("attack","Attack the trained bands",cond=[C([["army",">=",50],["majesty",">=",45]],{"add":{"parliament":-10,"majesty":10},"set":{"path":"london"}},{"end":"broken_turnham"})]),
  O("turnback","Turn back to Oxford",{"majesty":-5},{"path":"main"})]),
# ---- Arc: London Regained (1642-1645)
B("KL1","The City (1642)","london",[
  O("trials","Try Parliament's leaders for treason",{"parliament":-20,"majesty":10,"distrust":5}),
  O("pardon","Proclaim a general pardon",{"parliament":15,"distrust":-10}),
  O("exile","Let them flee abroad",{"parliament":-5})]),
B("KL2","The Scots cross the Tweed (1644)","london",[
  O("fight","Meet them in battle",cond=[C([["army",">=",50]],A(scotland=-30,majesty=10,army=-10),A(army=-25,scotland=10,majesty=-10))]),
  O("buyoff","Buy them off with a Presbyterian church",{"church":-20,"scotland":-30,"majesty":-10}),
  O("talk","Negotiate a truce",{"scotland":-10,"treasury":-10})]),
B("KL3","A new Parliament (1645)","london",[
  O("free","Call free elections",{"parliament":20,"majesty":-5,"distrust":-5},{"war":False,"personal":False}),
  O("packed","Pack it with your supporters",{"parliament":-10,"distrust":15,"majesty":5},{"lied":True,"war":False,"personal":False}),
  O("none","Rule without Parliament",end="absolute_king")]),
S("K16","The Cessation (1643)",[
  O("truce","Make a truce in Ireland and bring Irish troops",{"ireland":-10,"army":10,"parliament":-10,"distrust":5},hist=True),
  O("english","Fight on with English troops only",{"army":-5}),
  O("courtscots","Court the Scots before Parliament does",cond=[C([["scotland","<=",40]],A(scotland=-20,majesty=-5),A(majesty=-5))]),
  O("glamorgan","Promise the Irish Catholics toleration for an army",set={"path":"irish"})],after=["solemnleague"]),
B("KI1","The Glamorgan treaty (1645)","irish",[
  O("sign","Sign it in secret",{"ireland":-30,"distrust":15,"church":10},{"irishdeal":True,"lied":True}),
  O("refuse","Refuse their terms",{"majesty":-5},{"path":"main"})]),
B("KI2","Chester (1645)","irish",[
  O("land","Land the Irish army",cond=[C([["army",">=",35]],back(army=30,parliament=-15,church=5),back(army=-10,distrust=10))]),
  O("hold","Keep them in Ireland",{"ireland":-5},{"path":"main"})]),
S("K17","Marston Moor (1644)",[
  O("fight","Order Rupert to relieve York and fight",set={"mm":True},hist=True),
  O("avoid","Order him to save York and avoid battle",{"army":-5,"treasury":-5}),
  O("abandon","Abandon the North",{"majesty":-10,"army":5})],after=["marston"]),
S("K18","Naseby (1645)",[
  O("battle","Give battle to the New Model Army",set={"nb":True},hist=True),
  O("retreat","Retreat west to join your other army",{"army":-10,"treasury":-5}),
  O("hold","Hold Oxford and wait",{"army":-15,"majesty":-5})],after=["naseby","cabinet"]),
{"id":"K19","title":"Surrender (1646)","variants":[
  {"if":[["path","==","main"],["warwon","==",True]],"options":[
    O("pardonwin","Pardon your enemies and settle",{"parliament":35,"distrust":-15},{"path":"settled","war":False,"personal":False}),
    O("crush","Crush Parliament for ever",end="absolute_king")]},
  {"if":MAIN,"options":[
    O("scots","Slip out of Oxford and give yourself up to the Scots",set={"withscots":True},hist=True),
    O("parl","Surrender to Parliament",{"parliament":5}),
    O("france","Escape to the queen in France",set={"path":"exile"})]}],"drift_after":True},
S("K19B","Newcastle (1646)",[
  O("refusecov","Refuse to take the Covenant",{"scotland":5},hist=True),
  O("takecov","Take the Covenant",{"church":-25,"scotland":-30,"majesty":-5,"distrust":-10},{"path":"covenant"})],only=[["path","==","main"],["withscots","==",True]]),
# ---- Arc: The Covenanted King (1646-1648)
B("KC1","King in Edinburgh (1647)","covenant",[
  O("kirk","Rule with the strict Kirk party",{"church":-15,"scotland":-10,"majesty":-10,"distrust":-20}),
  O("engagers","Ally with Hamilton's moderates",{"scotland":5,"army":15})]),
B("KC2","Preston (1648)","covenant",[
  O("invade","Invade England with the Scots army",cond=[C([["army",">=",45],["majesty",">=",35]],A(majesty=20,parliament=10),{"end":"king_in_north"})]),
  O("stay","Stay king in Scotland",end="king_in_north")]),
B("KC3","London (1648)","covenant",[
  O("trial3","Offer Presbyterian church government for three years",{"church":15,"parliament":40,"distrust":-15},{"path":"settled","war":False,"personal":False}),
  O("imposekirk","Impose the Kirk on England",{"church":-30,"scotland":-10},{"path":"settled","war":False,"personal":False})]),
# ---- Arc: The King Over the Water (1646-1658)
B("KE1","Saint-Germain (1646)","exile",[
  O("french","Seek a French army",{"treasury":10,"distrust":10}),
  O("wait1","Wait and write to your supporters",{"majesty":-5}),
  O("ormond","Go to Ireland to join Ormond",{"ireland":-15,"army":15,"church":5})]),
B("KE2","The Fronde (1648)","exile",[
  O("mazarin","Side with Cardinal Mazarin",{"majesty":5,"treasury":10}),
  O("orange","Go to your son-in-law in Holland",{"army":10}),
  O("frondeurs","Side with the rebels against the French crown",{"majesty":-10,"distrust":10})]),
B("KE3","The long exile (1649-1658)","exile",[
  O("invade","Invade with Dutch and Irish help",cond=[C([["army",">=",45],["majesty",">=",45]],{"end":"king_returns"},{"end":"over_water"})]),
  O("waitfall","Wait for the Commonwealth to fall",cond=[C([["distrust","<=",35]],{"end":"king_returns"},{"end":"over_water"})])]),
# ---------- Era 5: The Captive King (1646-1649)
S("K20","The Heads of Proposals (1647)",[
  O("play","Play the Army, Parliament and the Scots against each other",{"distrust":15,"parliament":-10},{"lied":True},hist=True),
  O("acceptheads","Accept the Army's terms",cond=[C([["distrust","<=",45]],{"add":{"majesty":-5,"distrust":-15,"parliament":35},"set":{"path":"settled","war":False,"personal":False}},A(distrust=5,majesty=-5))]),
  O("holdout","Hold out for full restoration",{"majesty":5,"parliament":-15})]),
S("K21","The Engagement (1647-48)",[
  O("engage","Sign a secret treaty with the Scots",{"distrust":20,"scotland":-10},{"engaged":True,"lied":True},hist=True),
  O("newport","Negotiate honestly at Newport",cond=[C([["distrust","<=",45]],{"add":{"distrust":-10,"parliament":25},"set":{"path":"settled","war":False,"personal":False}},A(parliament=5,distrust=-5))]),
  O("escape","Escape from Carisbrooke",set={"path":"carisbrooke"})],after=["secondwar"]),
B("KB6","The window at Carisbrooke (1648)","carisbrooke",[
  O("window","Squeeze through the window bars",{"majesty":-5},{"path":"main"}),
  O("bribe","Bribe the guards",cond=[C([["treasury",">=",30]],{"end":"over_water"},{"add":{"distrust":5},"set":{"path":"main"}})])],after=["pride"]),
S("K22","The Trial (1649)",[
  O("noplea","Refuse to plead and deny the court",end="axe",hist=True),
  O("plead","Plead, and offer terms",set={"path":"plea"})]),
B("KB7","The plea (1649)","plea",[
  O("abdicate","Abdicate for your youngest son",cond=[C([["distrust","<=",50]],{"end":"abdication"},{"end":"axe"})]),
  O("defend","Defend your reign",cond=[C([["distrust","<=",25],["parliament",">=",40]],{"end":"crowned_figurehead"},{"end":"axe"})])]),
]
# pride beat should fire on main path after K21 too: attach to K21 as well (event checks path)
for s in scenes:
    if s["id"]=="K21": s["after"]=["secondwar","pride"]
    if s["id"]=="KB6": s["after"]=["pride"]

events={
 "felton":{"branches":[{"if":[["buck","==",True]],"beat":"KT1","then":{"add":{"parliament":10},"set":{"buck":False}}},{"then":{}}]},
 "hampden":{"branches":[{"if":[["shipmoney","==",True]],"beat":"KT2","then":{"add":{"parliament":-5}}},{"then":{}}]},
 "stgiles":{"branches":[{"if":[["scotland",">=",50]],"beat":"KT3","then":{}},{"then":{}}]},
 "bishopswar":{"branches":[
   {"if":[["bw","==",True]],"score":{"terms":[{"var":"army","mult":1},{"var":"treasury","mult":0.5},{"var":"scotland","mult":-1}],"at_least":35},
    "then":{"add":{"scotland":-30,"majesty":10,"army":-5},"set":{"bw":False}}},
   {"if":[["bw","==",True]],"then":{"add":{"army":-10,"treasury":-15,"majesty":-10,"scotland":-10},"set":{"bw":False}}},{"then":{}}]},
 "strafford_beat":{"branches":[{"if":[["path","==","main"],["parliament",">=",0]],"then":{}}]},
 "birds":{"branches":[{"if":[["distrust",">=",0],["parliament","<",40]],"beat":"KT5","then":{}},{"then":{}}]},
 "solemnleague":{"branches":[{"if":[["scotland",">=",40],["path","in",["main","irish"]]],"then":{"set":{"scotsparl":True}}},{"then":{}}]},
 "marston":{"branches":[
   {"if":[["mm","==",True]],"score":{"terms":[{"var":"army","mult":1},{"var":"majesty","mult":0.5},{"if":[["scotsparl","==",True]],"add":-20}],"at_least":95},
    "then":{"add":{"majesty":10,"army":-5},"set":{"mm":False}}},
   {"if":[["mm","==",True]],"then":{"add":{"army":-20,"majesty":-10},"set":{"mm":False}}},{"then":{}}]},
 "naseby":{"branches":[
   {"if":[["nb","==",True]],"score":{"terms":[{"var":"army","mult":1},{"var":"majesty","mult":0.5},{"var":"treasury","mult":0.25},{"if":[["scotsparl","==",True]],"add":-25},{"if":[["irishdeal","==",True]],"add":10}],"at_least":105},
    "then":{"add":{"majesty":15,"army":-10},"set":{"nb":False,"warwon":True}}},
   {"if":[["nb","==",True]],"then":{"add":{"army":-35,"majesty":-20},"set":{"nb":False,"lostnaseby":True}}},{"then":{}}]},
 "cabinet":{"branches":[{"if":[["lostnaseby","==",True],["distrust",">=",30]],"beat":"KT6","then":{"add":{"distrust":10,"parliament":-10}}},{"then":{}}]},
 "secondwar":{"branches":[
   {"if":[["engaged","==",True]],"score":{"terms":[{"var":"army","mult":1},{"var":"majesty","mult":0.5},{"var":"scotland","mult":-0.5}],"at_least":60},
    "then":{"set":{"path":"settled","engaged":False,"war":False,"personal":False}}},
   {"if":[["engaged","==",True]],"then":{"add":{"distrust":10},"set":{"engaged":False}}},{"then":{}}]},
 "pride":{"branches":[{"if":[["path","==","main"]],"beat":"KT7","then":{"add":{"parliament":-30}}},{"then":{}}]},
}
# strafford beat: only if signed; detect via flag
for s in scenes:
    if s["id"]=="K11":
        for o in s["variants"][0]["options"]:
            if o["id"]=="sign": o["set"]={"straffordsigned":True}
events["strafford_beat"]={"branches":[{"if":[["straffordsigned","==",True]],"beat":"KT4","then":{}},{"then":{}}]}
events["birds"]={"branches":[{"if":[["parliament","<",35]],"beat":"KT5","then":{}},{"then":{}}]}

drift=[
 {"if":[["lied","==",False]],"add":{"distrust":-10}},
 {"set":{"lied":False}},
 {"if":[["personal","==",True]],"add":{"treasury":-10}},
 {"if":[["shipmoney","==",True]],"add":{"treasury":5,"parliament":-5}},
 {"if":[["church",">=",65]],"add":{"scotland":5}},
 {"if":[["church",">=",75],["laud","==",True],["scotland",">=",60],["war","!=",True]],"add":{"scotland":15}},
 {"if":[["war","==",True],["treasury","<",30]],"add":{"army":-15}},
 {"if":[["war","==",True]],"add":{"treasury":-10}},
]
failures=[
 {"if":[["treasury","<=",0]],"end":"bankrupt"},
 {"if":[["parliament","<=",0],["path","in",["peace","london","settled"]]],"end":"set_aside"},
 {"if":[["parliament","<=",0],["path","==","main"],["personal","!=",True],["war","!=",True]],"end":"set_aside"},
 {"if":[["church",">=",90]],"end":"no_popery"},
 {"if":[["church","<=",10]],"end":"saints_rule"},
 {"if":[["army","<=",0],["war","==",True]],"end":"army_melts"},
 {"if":[["scotland",">=",100]],"end":"scots_gates"},
 {"if":[["ireland",">=",100]],"end":"ireland_ablaze"},
]
finale={"terms":[{"var":"parliament","mult":1},{"var":"majesty","mult":0.5},{"var":"distrust","mult":-1.5},
  {"if":[["church",">=",35],["church","<=",65]],"add":20},
  {"if":[["scotland","<=",50],["ireland","<=",60]],"add":15},
  {"var":"scotland","over":50,"mult":-1},{"var":"ireland","over":60,"mult":-1}],
 "outcomes":[{"if":[["distrust","<=",DT],["church",">=",CL],["church","<=",CH],["scotland","<=",55],["ireland","<=",60],["parliament",">=",PT],["majesty",">=",MT]],"end":"long_live"},{"end":"crowned_figurehead"}]}
endings={"axe":"historical","long_live":"outperformed","crowned_figurehead":"fallen_short",
 "bankrupt":"fallen","set_aside":"fallen","no_popery":"fallen","saints_rule":"fallen","army_melts":"fallen",
 "scots_gates":"fallen","ireland_ablaze":"fallen","beaten_by_scots":"fallen","broken_turnham":"fallen",
 "over_water":"alternate","abdication":"alternate","absolute_king":"alternate","king_returns":"alternate",
 "king_in_north":"alternate"}
rules={"version":2,"ruler":"charles-i","meter_range":[0,100],
 "meters":{"treasury":40,"parliament":55,"church":55,"army":35,"majesty":55,"scotland":20,"ireland":30,"distrust":10},
 "hidden":["scotland","ireland","distrust"],
 "flags":{"path":"main","buck":False,"personal":False,"laud":False,"shipmoney":False,"bw":False,"war":False,
   "straffordsigned":False,"scotsparl":False,"irishdeal":False,"mm":False,"nb":False,"warwon":False,"lostnaseby":False,
   "withscots":False,"engaged":False,"lied":False},
 "scenes":scenes,"events":events,"drift":drift,"failures":failures,"finale":finale,"endings":endings}
json.dump(rules,open("rules_v2.json","w"),indent=1)
print(len(scenes),"scenes;",sum(1 for s in scenes if not s.get("branch")),"main,",sum(1 for s in scenes if s.get("branch")),"branch")
