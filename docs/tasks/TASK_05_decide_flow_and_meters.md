# Task 5: Read-then-decide panel, and meters

Read `CLAUDE.md` first. Task 4 must be merged.

## Part A: Read-then-decide panel

The parchment panel never covers more than the bottom 35% of the screen (existing rule; keep it).
Decision scenes now have two phases inside that panel.

**Read phase** (when a decision scene appears):
- Caption, then the full narration (scrolls if it doesn't fit), then a single **Decide** button.

**Decide phase** (after tapping Decide):
- The caption is hidden to save space. The narration stays above the option buttons in a smaller
  area that scrolls. It opens **scrolled to the end**, because narration will be written to finish
  on the question being put to the queen; the player can scroll up to reread.
- The option buttons sit below it, always fully visible; they never scroll.
- The panel's height does not change between phases, so the image does not jump.

**Fitting on small screens** (the Decide phase is the tight one):
- If the buttons plus at least two lines of narration don't fit in 35%, reduce button height step
  by step down to 44 points (never below; that's the minimum comfortable tap target).
- If it still doesn't fit (small phones with three options), allow the panel to grow to at most 40%
  of the screen in the Decide phase only. Read phase stays within 35%.
- Put this sizing in a pure function, `decidePanelLayout(screenHeight, optionCount, ...)`, and unit-
  test it for a large phone (844 pt), a small phone (667 pt), and 2 and 3 options.

**Other views keep one phase:** auto scenes, consequences and beats show their text with a
Continue button, as now. Add the button label "Decide" to the UI strings in `text.en.json`.

## Part B: Meters

### Data
Add `src/data/rulers/elizabeth-i/ui.json` (presentation only, no rules):

```json
{
  "meters": [
    { "id": "tr",    "visible": true,  "style": "fill",    "warnBelow": 15 },
    { "id": "rel",   "visible": true,  "style": "balance", "warnBelow": 25, "warnAbove": 75 },
    { "id": "auth",  "visible": true,  "style": "fill",    "warnBelow": 15 },
    { "id": "navy",  "visible": true,  "style": "fill" },
    { "id": "succ",  "visible": true,  "style": "fill",    "warnBelow": 15 },
    { "id": "spain", "visible": false }
  ]
}
```

Meter names go in `text.en.json` under `meters` (Treasury, Religion, Authority, Navy, Succession).
A test checks every meter in `rules.json` appears in `ui.json` and vice versa.

### Display
- A compact row of the five visible meters at the top of the screen, inside the safe area, on a
  subtle dark translucent strip so it reads over any image. Hidden meters are never shown.
- **No numbers anywhere.** Values are shown only visually.
- `fill` style: the icon drawn twice, dim and bright, with the bright copy clipped from the bottom
  to the meter's value, so the icon "fills up".
- `balance` style (Religion): a small horizontal track with a centre tick and a marker for the
  current value; Catholic at the left, Protestant at the right.
- **Warning:** when a meter is past a `warn` threshold, its icon pulses gently in a warning colour.
- Icons: placeholders from `@expo/vector-icons` (already part of Expo), chosen to suit each meter.
  Put the icon choice and colours in the skin, so illustrated icons can replace them later without
  touching components.
- Each meter has an accessible label (its name and a word such as "low", "steady" or "strong"),
  never a number.

### Change animation
- Every session view carries the state to display:
  - scene view: the state when the scene begins;
  - consequence and beat views: the state right after the choice, **before** drift;
  - the next scene view: the resolved state, which includes era drift.
- When the displayed state changes between views, each changed meter animates from old to new value
  (about 600 ms, using `react-native-reanimated`, already in the template) and shows chevrons for
  the direction: one for a change of 5 or less, two for 10 or less, three for more. Chevrons fade
  after the animation.
- Drift therefore animates when the next scene appears, separately from the choice's own effect.
  (Era cards that explain drift come in a later task.)
- Put the display maths in pure functions (value to fill fraction, change to chevron count, warn
  check) with unit tests.

### Session test
On the historical path: the consequence view after scene 6 shows Treasury before drift, and the
scene 7 view shows it 10 higher (the era 1 drift). Compare against the golden fixture states.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- On a phone: Read phase, then Decide phase with narration scrolled to the end and fully visible
  buttons; no image jump between phases. Checked on a large and a small screen size.
- Meters animate with chevrons after each choice; drift animates on arrival at scenes 7, 11 and 15;
  Spanish Hostility never appears; no numbers are shown.
- Committed on branch `task-05-decide-and-meters`.

## Out of scope

Era transition cards, the end-of-run chronicle, saving, audio, illustrated meter icons.
