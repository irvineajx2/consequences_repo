"""Converts Charles I's design-tool output (task-13 content/charles-i) into the repo's ruler formats.

Shapes and names change; meaning never does:
  - rules: ruler id "charles_i" (profile key convention); drift rules move their add/set under
    "then"; options state "historical" explicitly; each scene gains its image and a title/year split
    from "Title (year)"; endings and beats become maps carrying their image; the "hidden" list moves
    to ui.json (meters with "visible": false).
  - ui.json: meters in display order (the Church gauge as a balance meter; Army's danger only in
    wartime via "warnIf"), eras by their first scene, with the era-card variants.
  - text.en.json: K19's victory narration becomes the narration of the variant it belongs to; the
    gauge's ends become the meter's left/right labels; a short name is added.
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


def convert_ui(rules, meta):
    """ui.json: meters in display order with their danger thresholds, and eras by first scene."""
    m = meta["meters"]
    meters = []
    for mid in m["visible"]:
        entry = {"id": mid, "visible": True, "style": "balance" if mid in m["gauge"] else "fill"}
        if mid in m["gauge"]:
            g = m["gauge"][mid]
            entry.update({"warnBelow": g["dangerBelow"], "warnAbove": g["dangerAbove"]})
        elif m["danger"].get(mid):
            d = m["danger"][mid]
            entry["warnBelow"] = d["below"]
            if "onlyIf" in d:
                entry["warnIf"] = d["onlyIf"]
        meters.append(entry)
    meters += [{"id": mid, "visible": False} for mid in m["hidden"]]
    # Eras are contiguous in scene order, so each starts at its first scene.
    era_of = meta["eras"]["sceneEra"]
    order = [s["id"] for s in rules["scenes"]]
    eras = []
    for era in meta["eras"]["order"]:
        scenes = [sid for sid in order if era_of[sid] == era]
        first, last = order.index(scenes[0]), order.index(scenes[-1])
        assert scenes == order[first:last + 1], f"{era} is not contiguous"
        entry = {"id": era, "startsAt": scenes[0], "image": meta["eras"]["images"][era]}
        variants = [{"id": v["textKey"], "if": v["if"], "image": v["image"]}
                    for v in meta["eras"]["variants"] if v["era"] == era]
        if variants:
            entry["variants"] = variants
        eras.append(entry)
    return {
        "meters": meters,
        "prologue": {"image": meta["images"]["prologue"]},
        "eras": eras,
        "rulerCard": {"image": meta["images"]["rulerCard"]},
    }


def convert_text(text, rules, meta):
    """text.en.json: the variant narration moves under the variant whose condition it names; the
    gauge's two ends become the meter's left/right labels."""
    out = {k: v for k, v in text.items() if k != "_note"}
    out["ruler"] = {**text["ruler"], "short_name": text["ruler"]["name"].split(" ")[0]}
    meters = {}
    for mid, mt in text["meters"].items():
        g = meta["meters"]["gauge"].get(mid)
        side = lambda s: s[0].upper() + s[1:]
        meters[mid] = {**mt, **({"left": side(g["lowEnd"]), "right": side(g["highEnd"])} if g else {})}
    out["meters"] = meters
    scenes = {}
    scene_by_id = {s["id"]: s for s in rules["scenes"]}
    for sid, st in text["scenes"].items():
        st = dict(st)
        vt = meta["variantText"].get(sid)
        if vt:
            narration = st.pop(vt["narrationKey"])
            matching = [i for i, v in enumerate(scene_by_id[sid]["variants"])
                        if all(c in v.get("if", []) for c in vt["if"])]
            assert len(matching) == 1, f"{sid}: {matching}"
            st["variants"] = {str(matching[0]): {"narration": narration}}
        scenes[sid] = st
    out["scenes"] = scenes
    return out


def main():
    rules, meta, fixtures = load("rules.json"), load("meta.json"), load("fixtures.json")
    assert set(rules["hidden"]) == set(meta["meters"]["hidden"])
    write(os.path.join(OUT_RULES, "rules.json"), convert_rules(rules, meta))
    write(os.path.join(OUT_RULES, "ui.json"), convert_ui(rules, meta))
    write(os.path.join(OUT_RULES, "text.en.json"), convert_text(load("text.en.json"), rules, meta))
    write(os.path.join(OUT_FIXTURES, "reference_fixtures.json"), fixtures)
    print(f"rules: {len(rules['scenes'])} scenes; fixtures: {len(fixtures['fixtures'])}")


if __name__ == "__main__":
    main()
