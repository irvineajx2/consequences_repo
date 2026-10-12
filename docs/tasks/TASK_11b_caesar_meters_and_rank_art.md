# Task 11b: Caesar meter art, rank medallions and level-up laurels

Read `CLAUDE.md` first. Tasks 10 and 11 (with its progression-art addendum) must be merged.

## Provided

Unzip `caesar-meters-ranks.zip` into the repo root. It adds:

- `assets/ui/skins/tudor/meters/julius-caesar/`: `fortune`, `legions`, `people`, `senate`,
  `glory`, each with `_empty`, `_shadow` and `_glow`, at @1x, @2x and @3x, plus `meters.json`
  (same format as Elizabeth's). All five are fill meters; there is no balance gauge for Caesar.
- `assets/ui/skins/tudor/progression/`: `medallion_blue`, `medallion_green`, `medallion_red`,
  `medallion_purple`, `medallion_gold`, `laurel` (replaces the old one), `laurel_major`, at three
  densities, plus `rank_ui.json`. `_preview_ranks.png` shows the intended look; do not bundle it.

If Task 10 put ruler meter art somewhere other than `meters/<ruler-id>/`, move the folder to match
the existing convention rather than changing the code.

## 1. Caesar's meters

Map Caesar's meter ids in the skin's per-ruler meter section to these images, exactly as Elizabeth's
fill meters are mapped. Remove any placeholder icons used for Caesar. Extend the existing asset test
so every image and variant named for every ruler exists at all three densities.

## 2. Rank medallions

- The level medallion's colour follows the player's **rank**, using `rank_ui.json` `ranks`
  (Novice blue, Scribe green, Chronicler red, Historian purple, Sage gold, Keeper of Ages gold).
  Look the rank up by title from `progression.json`, so renaming or adding ranks only touches data.
  A test fails if any rank in `progression.json` has no medallion.
- Each tier has its own `heightPt` (48 to 57): they share one scale, so higher ranks are physically
  larger. Lay the level plate out from the medallion's actual size; it must not shift the rank
  title or XP bar when the player ranks up on a small screen.
- Draw the level number at each tier's `text.centreX/centreY`, within `interiorRadiusFraction` of the
  image width, shrinking for three-digit levels. Use the skin's dark ink colour on the gold tier
  (`textColour: "dark"`, its centre is cream) and parchment on the others.
- The old single `medallion` art is no longer used; keep it in the repo only if something else
  references it.

## 3. Level-up laurels

- A normal level-up frames the new level's medallion with `laurel`.
- A level-up that reaches a **new rank** uses `laurel_major` instead, and the medallion shown is the
  new rank's colour. Hold it slightly longer (about 1.5x) and show the new rank title beneath it.
- If one run gains several levels, play each in turn; only the one that crosses a rank boundary uses
  the major laurel.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- A Caesar run shows the five illustrated meters with drain, danger glow and shadow, matching
  Elizabeth's behaviour.
- With a profile at levels 1, 5, 10, 15, 20 and 30, the title screen shows blue, green, red, purple,
  gold and gold medallions, with a readable number on each.
- Levelling from 4 to 5 plays the major laurel with the green medallion and "Scribe"; 5 to 6 plays the
  normal laurel.
- Committed on branch `task-11b-caesar-meters-and-ranks`.
