# Task 3: Story beats

Read `CLAUDE.md` first; its rules contract now has a **Story beats** section. Task 2 must be
merged.

## Why

Some images are story moments rather than decisions: the papal bull (B1, B2), Throckmorton (T1),
Drake's return (D1), Mary's execution (M1) and the four Armada beats (A1-A4). Until now only some
were referenced in the rules, so adding their images would have failed the registry's typo check.
`rules.json` version 6 adds them as **beats**: presentation-only slides that never change state.

## 1. Replace the data and reference files

Replace these with the provided versions:
- `src/data/rulers/elizabeth-i/rules.json` (version 6)
- `tests/fixtures/golden_paths.json` (regenerated; every case now includes beats)
- `tools/engine.py`, `tools/make_fixtures.py`
- `CLAUDE.md`

Game results are unchanged: every ending, score and final state in the fixtures is identical to
version 5. The only additions are the `beats` on each decision and `finale_beats` on each case.

What changed in `rules.json`:
- A top-level `beats` map: beat id → `{ "image": "..." }`.
- Options may have a `beats` list (Drake's return, both Mary executions).
- Event branches may have a `beat` (replacing the old `image_by_branch`, which is removed).
- `finale.beats`: the four Armada beats, played before any finale ending.

## 2. Core

- Update the types and loader for the three additions above. The loader must reject a beat id that
  is not in the `beats` map.
- `choose` also returns the beats for that decision, in contract order: the option's own beats,
  then event branch beats in event order. An option with `end` returns no beats.
- Add each decision's beats to the run history, and expose the finale beats on finale endings.
- Golden tests: also assert each decision's `beats` and the case's `finale_beats`.
- Rules-load test: every beat has an image id, and every referenced beat exists.

## 3. Text

Add a `beats` section to `text.en.json`: beat id → `{ "caption": "...", "text": "[Beat text to be written]" }`,
with sensible captions (for example "Fotheringhay Castle, February 1587"; for
`mary_execution_1572` use a caption with no castle name). Extend the completeness test to cover beats.

## 4. Session and screens

- Add a `beat` view to the session: beat id, image id, caption and text.
- **Flow after a decision:** consequence view, then each of that decision's beats in order, then
  the next scene. If the run ends through the finale: the finale beats in order, then the ending
  view. Failure endings and alternate endings go to the ending view with no finale beats. Keep
  Task 2's behaviour for options with `end`.
- **Beat screen:** the beat's image full screen, with the caption and text in the bottom panel and
  a Continue button. It uses the same layout component as scenes.
- Session test: the historical path shows, in order, `papal_bull` after scene 8, `drake_return`
  after scene 12, `mary_execution_fotheringhay` after scene 15, then `armada_sighted`, `fireships`,
  `tilbury`, `storm`, then Gloriana.

## 5. Image registry

The registry test's list of known image ids now comes from scenes, endings and beats. Re-run
`npm run images` and confirm any existing D1, M1 or A1-A4 images are accepted.

## Acceptance criteria

- `npm test` (all 218 golden cases, now with beats) and `npx tsc --noEmit` pass.
- On a phone: the historical run shows the bull, Drake's return, Mary's execution and the four
  Armada beats in that order before Gloriana. Choosing "Keep the Catholic Mass" and "Negotiate
  concessions" shows the Rome-courts beat (B2) after scene 8 instead of the bull.
- Committed on branch `task-03-story-beats`.

## Out of scope

Meter display and animation (next task), era cards, the chronicle, saving.
