"""Converts Charles I's design-tool output (task-13 content/charles-i) into the repo's ruler formats,
with the shared steps in tools/ruler_import.py. Shapes and names change; meaning never does. Charles's
own: the ruler id "charles_i"; the "hidden" meter list moves to ui.json (meters "visible": false); the
Church gauge is a balance meter and Army's danger shows only in wartime ("warnIf"); K19's victory
narration becomes the narration of the variant it belongs to.

Usage (from the repo root): python tools/import_charles.py <path to task-13-charles/content/charles-i>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ruler_import import convert_rules, convert_text, convert_ui, load, write  # noqa: E402

SRC = sys.argv[1]


def main():
    rules, meta, fixtures = load(SRC, "rules.json"), load(SRC, "meta.json"), load(SRC, "fixtures.json")
    assert set(rules["hidden"]) == set(meta["meters"]["hidden"])
    out = os.path.join("src", "data", "rulers", "charles-i")
    write(os.path.join(out, "rules.json"), convert_rules(rules, meta, "charles_i"))
    write(os.path.join(out, "ui.json"), convert_ui(rules, meta))
    write(os.path.join(out, "text.en.json"), convert_text(load(SRC, "text.en.json"), rules, meta))
    write(os.path.join("tests", "fixtures", "charles-i", "reference_fixtures.json"), fixtures)
    print(f"rules: {len(rules['scenes'])} scenes; fixtures: {len(fixtures['fixtures'])}")


if __name__ == "__main__":
    main()
