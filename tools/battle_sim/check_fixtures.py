"""Replays every Alesia golden fixture through the reference model (battle.py) and checks it.

Run from the repo root: python tools/battle_sim/check_fixtures.py"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from battle import play  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "content", "battles", "alesia", "fixtures.json")


def strategy(fx):
    st = fx["strategy"]
    phases = {int(ph): (tuple(p["cohorts"]), tuple(p["cavalry"]), p["commander"], p["move"]) for ph, p in st["phases"].items()}
    return {"phases": phases, "scenes": st["scenes"]}


def main():
    fixtures = json.load(open(FIXTURES, encoding="utf8"))["fixtures"]
    bad = []
    for fx in fixtures:
        outcome, unlocks, s = play(fx["plan"], strategy(fx))
        final = {k: s[k] for k in fx["final"]}
        if outcome != fx["outcome"] or sorted(unlocks) != sorted(fx["unlocks"]) or any(
            abs(final[k] - v) > 1e-9 if isinstance(v, (int, float)) and not isinstance(v, bool) else final[k] != v for k, v in fx["final"].items()
        ):
            bad.append(fx["name"])
    print(f"{len(fixtures) - len(bad)} of {len(fixtures)} fixtures pass")
    if bad:
        print("failing:", " ".join(bad[:20]))
        sys.exit(1)


if __name__ == "__main__":
    main()
