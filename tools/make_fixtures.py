"""Generates golden_paths.json: replay cases with expected results from the reference engine.
Cases are selected so every variant, option, conditional branch, event branch, drift rule
and ending is exercised at least once. Results always come from engine.py itself."""
import json, random, sys
from functools import lru_cache
from engine import Engine
sys.setrecursionlimit(10000)
E = Engine("src/data/rulers/elizabeth-i/rules.json")
key = lambda st: tuple(sorted(st.items()))

def step_tags(i, pre, opt):
    sc = E.scenes[i]; sid = sc["id"]; t = set()
    for k, v in enumerate(sc.get("variants", [{"options": sc.get("options")}])):
        if E.test(pre, v.get("if")): t.add(f"{sid}:variant{k}"); break
    t.add(f"{sid}:opt:{opt['id']}")
    for c in sc.get("scene_cond", []):
        t.add(f"{sid}:scene_cond:{E.test(pre, c.get('if'))}")
    for k, c in enumerate(opt.get("cond", [])):
        t.add(f"{sid}:{opt['id']}:cond{k}:{'then' if E.test(pre, c.get('if')) else 'else'}")
    if "end" in opt: return t
    # state just before events (mirror of engine.choose without 'after')
    after = sc.pop("after", None)
    mid, _ = E.choose(i, pre, opt)
    if after is not None: sc["after"] = after
    for ev in after or []:
        for k, b in enumerate(E.d["events"][ev]["branches"]):
            if E.test(mid, b.get("if")): t.add(f"event:{ev}:branch{k}"); break
    return t

def transitions(i, st):
    """Yield (opt or None for skip, tags, next_state or None, terminal tuple or None)."""
    mode, opts = E.options(i, st)
    if mode == "skip":
        yield None, {f"{E.scenes[i]['id']}:skip"}, st, None; return
    for o in opts:
        t = step_tags(i, st, o)
        s2, end = E.choose(i, st, o)
        if end:
            yield o, t | {f"end:{end}"}, None, (s2, end, None, False); continue
        if E.scenes[i].get("drift_after") and not E.failure(s2):
            for k, r in enumerate(E.d["drift"]):
                if E.test(s2, r.get("if")): t.add(f"drift{k}")
        s3, end, sc, early = E.resolve(i, s2)
        if end:
            yield o, t | {f"end:{end}" + (":early" if early else "")}, None, (s3, end, sc, early)
        else:
            yield o, t, s3, None

@lru_cache(None)
def reach(i, k):
    st = dict(k); out = set()
    for o, t, nxt, term in transitions(i, st):
        out |= t
        if nxt is not None: out |= reach(i + 1, key(nxt))
    return frozenset(out)

ALL = reach(0, key(E.start()))
print("distinct tags:", len(ALL))

def build(target, covered):
    """Walk from start toward `target`, preferring branches that reach more uncovered tags."""
    st, i, choices, got = E.start(), 0, [], set()
    while True:
        best = None
        for o, t, nxt, term in transitions(i, st):
            sub = t | (reach(i + 1, key(nxt)) if nxt is not None else set())
            has = target in got or target in sub
            gain = len((sub) - covered - got)
            score = (has, gain)
            if best is None or score > best[0]: best = (score, o, t, nxt, term)
        _, o, t, nxt, term = best
        got |= t
        if o is not None: choices.append(o["id"])
        if term: return choices, term, got
        st, i = nxt, i + 1

def decision_log(choices):
    """Replays choices and returns the per-decision record the game must keep."""
    st, log, k = E.start(), [], 0
    for i in range(len(E.scenes)):
        mode, opts = E.options(i, st)
        if mode == "skip":
            st, end, *_ = E.resolve(i, st)
            if end: break
            continue
        o = next(x for x in opts if x["id"] == choices[k]); k += 1
        s2, end, beats = E.choose_with_beats(i, st, o)
        log.append({"scene": E.scenes[i]["id"], "option": o["id"],
                    "historical": o["historical"], "auto": mode == "auto", "beats": beats})
        if end: break
        st, end, *_ = E.resolve(i, s2)
        if end: break
    assert k == len(choices)
    return log

def case(name, choices, term):
    st, end, sc, early = term
    log = decision_log(choices)
    return {"name": name, "choices": choices,
            "expected": {"ending": end, "score": sc, "early_finale": early, "final_state": st,
                         "decisions": log,
                         "finale_beats": E.finale_beats() if sc is not None else [],
                         "historical_matches": sum(1 for d in log if d["historical"] and not d["auto"])}}

def follow(fn):
    st, i, choices = E.start(), 0, []
    while True:
        tr = list(transitions(i, st))
        if tr[0][0] is None: o, t, nxt, term = tr[0]
        else: o, t, nxt, term = fn(tr)
        if o is not None: choices.append(o["id"])
        if term: return choices, term
        st, i = nxt, i + 1

cases = [case("historical_path", *follow(lambda tr: next(x for x in tr if x[0]["historical"])))]
covered = set()
for target in sorted(ALL):
    if target in covered: continue
    ch, term, got = build(target, covered)
    covered |= got
    cases.append(case(f"covers_{target}", ch, term))
random.seed(1588)
for r in range(200):
    def pick(tr):
        keep = [x for x in tr if not (x[0] and "end" in x[0])]
        return random.choice(keep if keep and random.random() < 0.95 else tr)
    cases.append(case(f"random_{r:03d}", *follow(pick)))
assert covered == set(ALL)
json.dump({"generated_from": "rules.json version 6",
           "note": "choices lists the option id picked at each scene shown to the player, including auto scenes; skipped scenes have no entry",
           "cases": cases}, open("tests/fixtures/golden_paths.json", "w"), indent=1)
print("coverage cases:", len(cases) - 201, " total cases:", len(cases))
from collections import Counter
print(Counter(c["expected"]["ending"] + (" early" if c["expected"]["early_finale"] else "") for c in cases))
