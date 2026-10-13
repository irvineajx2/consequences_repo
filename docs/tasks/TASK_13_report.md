# Task 13 report: Charles I

## Engine features added

None were needed. Charles's 1,548 reference fixtures pass on both the Python reference engine
(`tools/engine.py`) and the TypeScript engine with no engine changes, and Elizabeth's and Caesar's
fixtures are unchanged. Every feature on the task's checklist was already supported; each now has a
unit test on a synthetic ruler (`tests/core/engineFeatures.test.ts`): string flags, `in`, failures
with several conditions, drift rules that set flags, finale outcomes decided by `if` alone, `cond`
branches whose `else` is an ending, runs of skipped scenes, and scored event branches.

## Differences, and how they were resolved (in the data's shape, never its meaning)

`tools/import_charles.py` converts the design tool's files to the repo's formats:

- **No matching variant.** The design tool's engine skips a scene when none of its variants match;
  every Charles scene relies on this. The repo engines treat it as a rules error (a useful check), so
  the converter ends each such variant list with an explicit `{"skip": true}`. Same meaning, no
  engine change. Without it, 1,496 of the 1,548 fixtures fail.
- **Drift rules** put `add`/`set` at the top level; the repo nests them under `then`.
- **Shapes:** ruler id `charles_i` (the profile-key convention); options state `historical: false`
  explicitly; scene titles "Title (1625)" split into `title` and `year`; scenes, beats and endings
  carry their image ids; the `hidden` meter list moves to `ui.json`.

No fixture changes. `tests/fixtures/charles-i/reference_fixtures.json` is the provided file (checked
field by field: ending, final meters, final path, beats); `golden_paths.json` expands the same 1,548
choice lists through the repo engine (`tools/expand_fixtures.py`) into the full golden format.

## New general features

- **Variant narration:** a scene variant's text may give its own `narration` (K19's victory
  narration when `warwon` is true).
- **Era-card variants:** an era in `ui.json` may list `variants` (`id`, `if`, `image`); the first that
  matches the state when the card appears is shown ("The Uneasy Peace", "The King Over the Water").
- **Conditional meter danger:** `warnIf` on a meter's display (Army's danger only while `war`).
- **Pending meter art:** the skin declares Charles's planned 7-piece sheet; placeholder medals draw
  until the files arrive (a test flags when they have).
- **Missing images:** `npm run images` lists each ruler's missing image ids (Charles: all 76).

## Simulator (`tools/simulate.py`, any ruler, on the repo engine)

| Measure | Repo engine | Reference |
| --- | --- | --- |
| Historical ending (`axe`), history-leaning | 7.78% | about 7.9% |
| Outperform ending (`long_live`) | 0.016% (161 of 1,000,000) | about 0.017-0.019% |
| Most common deviation in winning runs | K10 "grievances", 59.6% | about 56% |
| Latest decision a copier can deviate at and still outperform | decision 7 of 23 | decision 7 of 23 |

Run through an adapter, the reference's own `analyse.py` and `foresight.py` give byte-identical output
on both engines with the same seeds (axe 7.81%, long_live 0.016%, top deviation 54.1%; latest
decision 7). The differences above are sampling.

## For AJ to confirm

- **Gold bands are provisional.** Charles's design gave none and a test requires them. Rule used:
  historical ending rare, outperform ending legendary; others by their higher reach rate under
  uniform or history-leaning play: 5% or more common, 0.5% or more uncommon, 0.05% or more rare,
  rarer legendary. Total gold 1,230 at tier 1.5 (Caesar 1,214).
- **XP multiplier 1.5** is in `progression.json` as proposed.
- **Ending titles:** the text gives none, so they fall back to titles made from the ids ("Axe",
  "Long Live"), as Caesar's do.
- **Text lengths:** no written budgets exist in the repo. Against the longest text already shipping,
  draft 1 runs longer for the prologue (256 characters against 150), endings (199 against 171) and,
  by a few characters, a caption, a beat and a narration. Long text scrolls rather than breaking.
- **Meter descriptions** (`desc`) are kept in the text but not shown anywhere yet.
