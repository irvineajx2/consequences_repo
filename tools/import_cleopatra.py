"""Converts Cleopatra's design-tool output (task-16 content/cleopatra) into the repo's ruler formats,
with the shared steps in tools/ruler_import.py. Shapes and names change; meaning never does.
Cleopatra's own: scenes Q17-Q22 have variants with their own image (QO1-QO7, Octavian's road and the
Actium victory) and narration (looked up by the variant's image); the era 4 card has a variant for
Octavian's road; the "hidden" meter list moves to ui.json.

Usage (from the repo root): python tools/import_cleopatra.py <path to task-16-cleopatra/content/cleopatra>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ruler_import import convert_rules, convert_text, convert_ui, load, write  # noqa: E402

SRC = sys.argv[1]


def main():
    rules, meta, fixtures = load(SRC, "rules.json"), load(SRC, "meta.json"), load(SRC, "fixtures.json")
    assert set(rules["hidden"]) == set(meta["meters"]["hidden"])
    # Every variant image named in meta.json is on the scene it says.
    for image, sid in meta["images"]["sceneVariants"].items():
        scene = next(s for s in rules["scenes"] if s["id"] == sid)
        assert any(v.get("image") == image for v in scene["variants"]), (image, sid)
    out = os.path.join("src", "data", "rulers", "cleopatra")
    write(os.path.join(out, "rules.json"), convert_rules(rules, meta, "cleopatra"))
    write(os.path.join(out, "ui.json"), convert_ui(rules, meta))
    write(os.path.join(out, "text.en.json"), convert_text(load(SRC, "text.en.json"), rules, meta))
    write(os.path.join("tests", "fixtures", "cleopatra", "reference_fixtures.json"), fixtures)
    print(f"rules: {len(rules['scenes'])} scenes; fixtures: {len(fixtures['fixtures'])}")


if __name__ == "__main__":
    main()
