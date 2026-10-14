"""Shared steps for importing a ruler from the design tool's output (content/<ruler>: rules.json,
text.en.json, meta.json, fixtures.json) into the repo's formats. Shapes and names change; meaning
never does. Used by tools/import_charles.py and tools/import_cleopatra.py.
"""
import json
import os
import re


def load(src, name):
    with open(os.path.join(src, name), encoding="utf-8") as f:
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


def convert_rules(rules, meta, ruler_key):
    """rules.json: the ruler id as a profile key; drift add/set under "then"; options state
    "historical"; variant lists end with an explicit skip (the tool skips when nothing matches);
    scenes gain their image and a title/year split from "Title (year)"; endings and beats become
    maps carrying their image. A variant's own `image` (an alternative scene image) is kept."""
    images = meta["images"]
    scenes = []
    for scene in rules["scenes"]:
        s = dict(scene)
        m = re.fullmatch(r"(.*?)\s*\(([^()]*\d[^()]*)\)", scene["title"])
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
        "ruler": ruler_key,
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
    """ui.json: meters in display order with their danger thresholds (a gauge as a balance meter),
    and eras by their first scene, with any era-card variants."""
    m = meta["meters"]
    gauges = m.get("gauge", {})
    meters = []
    for mid in m["visible"]:
        entry = {"id": mid, "visible": True, "style": "balance" if mid in gauges else "fill"}
        if mid in gauges:
            g = gauges[mid]
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


def _matching_variant(scene, entry):
    """The index of the rules variant a variantText entry names: by its image, or by its condition."""
    variants = scene["variants"]
    if "variantImage" in entry:
        matching = [i for i, v in enumerate(variants) if v.get("image") == entry["variantImage"]]
    else:
        matching = [i for i, v in enumerate(variants) if all(c in v.get("if", []) for c in entry["if"])]
    assert len(matching) == 1, f"{scene['id']}: {matching}"
    return matching[0]


def convert_text(text, rules, meta):
    """text.en.json: each variant narration moves under the variant it belongs to (found by the
    variant's image, or its condition); a gauge's two ends become the meter's left/right labels; a
    short name (the first word of the name) is added."""
    out = {k: v for k, v in text.items() if k != "_note"}
    out["ruler"] = {**text["ruler"], "short_name": text["ruler"]["name"].split(" ")[0]}
    gauges = meta["meters"].get("gauge", {})
    meters = {}
    for mid, mt in text["meters"].items():
        g = gauges.get(mid)
        side = lambda s: s[0].upper() + s[1:]
        meters[mid] = {**mt, **({"left": side(g["lowEnd"]), "right": side(g["highEnd"])} if g else {})}
    out["meters"] = meters
    scenes = {}
    scene_by_id = {s["id"]: s for s in rules["scenes"]}
    for sid, st in text["scenes"].items():
        st = dict(st)
        entries = meta.get("variantText", {}).get(sid)
        if entries:
            named = st.pop("variant_narration", {})
            variants = {}
            for entry in entries if isinstance(entries, list) else [entries]:
                key = entry["narrationKey"]
                narration = named[key] if key in named else st.pop(key)
                variants[str(_matching_variant(scene_by_id[sid], entry))] = {"narration": narration}
            st["variants"] = variants
        scenes[sid] = st
    out["scenes"] = scenes
    return out
