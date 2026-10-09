# Task 8: Illustrated meters

Read `CLAUDE.md` first. Task 7 must be merged.

## Goal

Replace the placeholder meter icons and the dark strip with AJ's illustrated icons, floating
directly over the scene art. Fill meters drain from full colour down to a greyed copy; Religion is a
church that slides along a track between papal keys (Catholic) and an open Bible (Protestant).

## Provided

Unzip `meters-tudor.zip` into the repo root. It adds `assets/ui/skins/tudor/meters/`:
- **Fill icons** `treasury`, `authority`, `navy`, `succession`, each with `_empty` (greyed, drained
  state), `_shadow` and `_glow` (red danger glow) versions, at @1x, @2x and @3x.
- **Religion pieces:** `religion_church` (the moving marker, with `_shadow` and `_glow`),
  `religion_keys` and `religion_bible` (track ends, with `_shadow`).
- `meters.json`: each icon's display height in points, aspect ratio, and `effectPadPt` (how much
  larger the shadow and glow images are on each side).
- `_preview.png`: how the row should look over real scenes. Do not bundle it.

Icons are tight-cropped, so a fill level maps directly to the image height.

## 1. Skin

Add a `meters` section to the skin, mapping meter ids to images, so another skin can swap the art:

```json
"meters": {
  "tr":   { "full": "treasury",   "empty": "treasury_empty" },
  "auth": { "full": "authority",  "empty": "authority_empty" },
  "navy": { "full": "navy",       "empty": "navy_empty" },
  "succ": { "full": "succession", "empty": "succession_empty" },
  "rel":  { "marker": "religion_church", "left": "religion_keys", "right": "religion_bible" }
}
```

Each image also has its `_shadow` and `_glow` variants by naming convention. Add a test that every
image named here, and every variant, exists at all three densities. Remove the placeholder
`@expo/vector-icons` meter icons from the skin.

## 2. Layout (no strip, no frames)

- **Remove the dark strip.** The meters float directly over the scene image. Legibility comes from
  each icon's own dark outline plus its soft shadow image, placed under the icon and offset 2 pt
  down.
- **One centred row,** just below the top safe area, in meter order: Treasury, Religion, Authority,
  Navy, Succession. Fill icons are 40 pt tall at their natural aspect; the Religion gauge takes a
  130 pt wide slot; 9 pt gaps.
- On narrow screens the whole row scales down proportionally so it always fits with at least 12 pt
  margins. Put this in a pure function, `meterRowLayout(screenWidth)`, and test it at 320, 375, 390
  and 430 pt.
- The row stays on every view that showed meters before (scenes, consequences, beats, era cards),
  and stays hidden on the title, ruler select, ending and chronicle screens.

## 3. Fill meters

- Draw the `_empty` image, then the full-colour image clipped from the bottom: the visible height is
  `value / 100` of the icon's height, so the colour drains downward as the meter falls.
- Implement the clip with an `overflow: hidden` container anchored to the bottom, holding the
  full image aligned to the bottom. Animate the container height with Reanimated (about 600 ms,
  ease-out), keeping Task 5's change timing.

## 4. Religion gauge

- The keys sit at the left end, the Bible at the right end, vertically centred on the track; both
  with their shadows.
- **Track** between them, drawn in code: a 6 pt dark backing line (`#14100C`, about 90% opacity)
  with a 3 pt line on top. The line is gold in the safe band and crimson beyond the `warnBelow` and
  `warnAbove` values from `ui.json` (25 and 75).
- **The church marker** stands on the track, its base just below the line, horizontally at
  `value / 100` along it. It slides with the same animation timing as the fills.
- Catholic is the left (low values), Protestant the right (high values), matching the existing data.

## 5. Danger, change and tap feedback

- **Danger:** when a meter is past a warn threshold from `ui.json`, its `_glow` image appears behind
  it and pulses (opacity 0.35 to 1.0, about 1.2 s per cycle). For Religion, the church glows.
- **Change:** keep Task 5's chevrons, gold for up and crimson for down (one to three by size), and
  add a small bounce on the changed icon (scale 1 to 1.12 and back, about 250 ms).
- **Tap a meter:** a small parchment tooltip (skin panel colours and fonts) appears under it with
  its name and a state word, then fades after 2.5 s or on the next tap. Never show a number.
  Add the words to `text.en.json` under `meterStates`:
  - Fill meters: 0-15 "Critical", 16-35 "Low", 36-65 "Steady", 66-85 "Strong", 86-100 "Formidable".
  - Religion: below 25 "Dangerously Catholic", 25-44 "Leaning Catholic", 45-55 "Balanced",
    56-75 "Leaning Protestant", above 75 "Dangerously Protestant".
  Use the same words in each meter's accessibility label.
- Put the word lookup and the fill and marker maths in pure functions with tests at every boundary.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- On a phone, the row matches `_preview.png`: no strip, crisp icons, readable over a bright sky
  (era 3 card) and a dark interior (scene 10).
- After a choice, fills drain or refill smoothly, chevrons and the bounce play, and the church
  slides along the track. A meter in the warn zone pulses red.
- Tapping each meter shows its name and state word, with no numbers.
- Spanish Hostility never appears.
- Checked on a small and a large screen size.
- Committed on branch `task-08-illustrated-meters`.

## Out of scope

Audio, settings, analytics, builds, cosmetic purchases.
