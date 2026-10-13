"""Golden fixtures from given choice lists (e.g. a design tool's fixtures): replays each list through the
reference engine and writes the full expected results in the golden_paths.json format.
Usage: python expand_fixtures.py RULES CHOICES_JSON OUT
CHOICES_JSON is {"fixtures": [{"name": ..., "choices": [...]}, ...]} (other fields are ignored)."""
import sys, json
from engine import Engine
RULES, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
E = Engine(RULES)

def play(choices):
    st = E.start(); it = iter(choices); log = []
    for i, sc in enumerate(E.scenes):
        mode, opts = E.options(i, st)
        if mode != "skip":
            oid = next(it); o = next(x for x in opts if x["id"] == oid)
            st, end, beats = E.choose_with_beats(i, st, o)
            log.append({"scene": sc["id"], "option": oid, "historical": o["historical"], "auto": mode == "auto",
                        "branch": bool(sc.get("branch")), "beats": beats})
            if end: return finish(log, st, end, None, False)
        st, end, s, early = E.resolve(i, st)
        if end: return finish(log, st, end, s, early)
    raise ValueError("run did not end")

def finish(log, st, end, s, early):
    return {"ending": end, "score": s, "early_finale": early, "final_state": st, "decisions": log,
            "finale_beats": E.finale_beats(st) if s is not None else [],
            "historical_matches": sum(1 for d in log if d["historical"] and not d["auto"]),
            "branch_decisions": sum(1 for d in log if d["branch"])}

src = json.load(open(SRC, encoding="utf-8"))["fixtures"]
cases = [{"name": f"{k:04d}_{f['name']}", "choices": f["choices"], "expected": play(f["choices"])} for k, f in enumerate(src)]
json.dump({"generated_from": f"{RULES.replace(chr(92), '/').split('/')[-1]} version {E.d['version']}",
           "note": "choices lists the option id picked at each scene shown to the player; skipped scenes have no entry",
           "cases": cases}, open(OUT, "w", encoding="utf-8", newline="\n"), indent=1)
print(f"{len(cases)} cases written to {OUT}")
