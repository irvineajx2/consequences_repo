"""Golden fixtures for rulers too large for exhaustive coverage search.
Plays many sampled runs (random, history-leaning, history-avoiding), tags every rule branch each run
exercises, greedily keeps runs until every reachable tag is covered, then adds the historical path and
a spread of extra runs. Expected results always come from the reference engine.
Usage: python make_fixtures_sampled.py RULES OUT [SAMPLES]"""
import sys, json, random
from engine import Engine
RULES, OUT = sys.argv[1], sys.argv[2]; SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 200000
E = Engine(RULES)

def play(pick):
    st = E.start(); choices, log, tags = [], [], set()
    for i, sc in enumerate(E.scenes):
        sid = sc["id"]
        mode, opts = E.options(i, st)
        vlist = sc.get("variants", [{"options": sc.get("options")}])
        vi = next(k for k, v in enumerate(vlist) if E.test(st, v.get("if"))); tags.add(f"{sid}:v{vi}")
        if mode == "skip":
            st2, end, s, early = E.resolve(i, st); st = st2
            if end: return finish(choices, log, tags, st, end, s, early)
            continue
        o = pick(sc, opts); choices.append(o["id"]); tags.add(f"{sid}:o:{o['id']}")
        for k, c in enumerate(o.get("cond", [])):
            tags.add(f"{sid}:{o['id']}:c{k}:{'then' if E.test(st, c.get('if')) else 'else'}")
        s2, end, beats = E.choose_with_beats(i, st, o)
        log.append({"scene": sid, "option": o["id"], "historical": o["historical"], "auto": mode == "auto",
                    "branch": bool(sc.get("branch")), "beats": beats})
        for b in beats: tags.add("beat:" + b)
        if end: return finish(choices, log, tags, s2, end, None, False)
        if sc.get("drift_after") and not E.failure(s2):
            x = dict(s2)
            for k, r in enumerate(E.d["drift"]):
                if E.test(x, r.get("if")): tags.add(f"drift{k}"); x = E.apply(x, r["then"])
        st, end, s, early = E.resolve(i, s2)
        if end: return finish(choices, log, tags, st, end, s, early)

def finish(choices, log, tags, st, end, s, early):
    fb = E.finale_beats(st) if s is not None else []
    tags.add("end:" + end + (":early" if early else "")); [tags.add("fbeat:" + b) for b in fb]
    exp = {"ending": end, "score": s, "early_finale": early, "final_state": st, "decisions": log, "finale_beats": fb,
           "historical_matches": sum(1 for d in log if d["historical"] and not d["auto"]),
           "branch_decisions": sum(1 for d in log if d["branch"])}
    return choices, exp, tags

def picker(mode, rng):
    def pick(sc, opts):
        hist = [o for o in opts if o["historical"]]; other = [o for o in opts if not o["historical"]] or opts
        if mode == "hist": return hist[0] if hist else rng.choice(opts)
        if isinstance(mode, float): return hist[0] if hist and rng.random() < mode else rng.choice(opts)
        if mode == "avoid": return rng.choice(other)
        return rng.choice(opts)
    return pick

rng = random.Random(1588)
runs = []
for n in range(SAMPLES):
    mode = ["rand", 0.35, 0.6, 0.85, 0.95, "avoid"][n % 6]
    runs.append(play(picker(mode, rng)))
alltags = set().union(*(r[2] for r in runs))
cases, covered = [], set()
hist = play(picker("hist", rng)); cases.append(("historical_path", hist)); covered |= hist[2]
while covered != alltags:
    best = max(runs, key=lambda r: len(r[2] - covered))
    cases.append((f"covers_{len(cases):03d}", best)); covered |= best[2]
extra = rng.sample(runs, 150)
cases += [(f"sampled_{k:03d}", r) for k, r in enumerate(extra)]
json.dump({"generated_from": f"{RULES.split('/')[-1]} version {E.d['version']}",
           "note": "choices lists the option id picked at each scene shown to the player; skipped scenes have no entry",
           "cases": [{"name": n, "choices": r[0], "expected": r[1]} for n, r in cases]}, open(OUT, "w"), indent=1)
from collections import Counter
ends = Counter(r[1]["ending"] for _, r in cases)
print(f"tags covered: {len(covered)}  cases: {len(cases)}  endings covered: {len(ends)} of {len(E.d['endings'])}")
missing = set(E.d["endings"]) - set(ends)
print("endings never reached in sampling:", missing or "none")
