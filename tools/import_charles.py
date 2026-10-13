"""Converts Charles I's design-tool output (task-13 content/charles-i) into the repo's ruler formats.

Shapes and names change; meaning never does:
  - rules: ruler id "charles_i" (profile key convention); drift rules move their add/set under
    "then"; options state "historical" explicitly; each scene gains its image and a title/year split
    from "Title (year)"; endings and beats become maps carrying their image; the "hidden" list moves
    to ui.json (meters with "visible": false).
  - fixtures: copied as reference fixtures (choices -> ending, final meters, final path, beats).

Usage (from the repo root): python tools/import_charles.py <path to task-13-charles/content/charles-i>
"""
import json
import os
import re
import sys

SRC = sys.argv[1]
OUT_RULES = os.path.join("src", "data", "rulers", "charles-i")
OUT_FIXTURES = os.path.join("tests", "fixtures", "charles-i")


def load(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return json.load(f)


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def options_of(scene):
    if "options" in scene:
        yield from scene["options"]
    for v in scene.get("variants", []):
        yield from v.get("options", [])


def convert_rules(rules, meta):
    images = meta["images"]
    scenes = []
    for scene in rules["scenes"]:
        s = dict(scene)
        m = re.fullmatch(r"(.*?)\s*\((\d{4}(?:[–-]\d{2,4})?)\)", scene["title"])
        title, year = (m.group(1), m.group(2)) if m else (scene["title"], None)
        out = {"id": s.pop("id"), "title": title}
        s.pop("title")
        if year:
            out["year"] = year
        out["image"] = images["scenes"][out["id"]]
        out.update(s)
        for o in options_of(out):
            o.setdefault("historical", False)
        # The design tool skips a scene when no variant matches; the repo engines treat that as an
        # error, so the skip is made explicit as a final catch-all variant.
        if "variants" in out and all("if" in v for v in out["variants"]):
            out["variants"] = out["variants"] + [{"skip": True}]
        scenes.append(out)
    drift = []
    for rule in rules["drift"]:
        then = {k: rule[k] for k in ("add", "set") if k in rule}
        drift.append({**({"if": rule["if"]} if "if" in rule else {}), "then": then})
    beat_ids = sorted({b["beat"] for e in rules["events"].values() for b in e["branches"] if "beat" in b})
    return {
        "ruler": "charles_i",
        "version": rules["version"],
        "meter_range": rules["meter_range"],
        "meters": rules["meters"],
        "flags": rules["flags"],
        "failures": rules["failures"],
        "drift": drift,
        "events": rules["events"],
        "beats": {b: {"image": images["beats"][b]} for b in beat_ids},
        "early_finale": None,
        "finale": {**rules["finale"], "beats": []},
        "endings": {e: {"category": c, "image": images["endings"][e]} for e, c in rules["endings"].items()},
        "scenes": scenes,
    }


def main():
    rules, meta, fixtures = load("rules.json"), load("meta.json"), load("fixtures.json")
    assert set(rules["hidden"]) == set(meta["meters"]["hidden"])
    write(os.path.join(OUT_RULES, "rules.json"), convert_rules(rules, meta))
    write(os.path.join(OUT_FIXTURES, "reference_fixtures.json"), fixtures)
    print(f"rules: {len(rules['scenes'])} scenes; fixtures: {len(fixtures['fixtures'])}")


if __name__ == "__main__":
    main()
