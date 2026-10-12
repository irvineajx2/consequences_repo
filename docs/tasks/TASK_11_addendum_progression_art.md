# Task 11 addendum: progression art

Apply after (or as part of) Task 11. Assets are in `assets/ui/skins/tudor/progression/`, at @1x, @2x
and @3x, with sizes and layout data in `progression_ui.json`. Wire them through the skin (a
`progression` section) so a cosmetic skin can replace them later.

- **Coin** (`coin`, 22 pt tall): replaces the code-drawn gold disc everywhere gold is shown.
- **Level medallion** (`medallion`, 48 pt): the level number is drawn in code, centred at
  `medallion_text.centreX/centreY` (fractions of the image size) and kept inside
  `interiorRadiusFraction`; Cinzel, parchment colour from the skin, shrinking for three-digit levels.
- **XP bar** (`bar_left`, `bar_mid`, `bar_right`, 18 pt tall): three-slice. Draw the caps at their
  natural width and stretch the middle between them, rounding positions to whole pixels with a
  1-pixel overlap so no seam shows. Draw the fill in code as a rounded rectangle (radius half its
  height) inside `bar.fillInsetPt`, in the skin's gold, animated as Task 11 describes.
- **Rarity gems** (`gem_common`, `gem_uncommon`, `gem_rare`, `gem_legendary`, 18 pt): shown beside
  the band name on ending cards and in the rewards panel.
- **Laurel** (`laurel`, 140 pt): frames the new level number in the level-up moment, scaling in with
  a short ease-out.
- A test checks every file named in `progression_ui.json` exists at all three densities.
- Do not bundle `_preview.png`.
