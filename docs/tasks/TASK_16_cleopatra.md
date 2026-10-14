# Task 16: Cleopatra, the fourth ruler

Read `CLAUDE.md` first, then Task 13 (Charles I): Cleopatra follows the same pattern. Tasks 13, 14 and 15 must be merged (Task 15 provides the achievement system used for the cross-ruler achievements).

Cleopatra is tier 2, Caesar's companion: 22 main scenes, 7 variant scenes on **Octavian's road**, 3 arcs (the Nile Pact, the Warning, the Red Sea), 4 single-scene branches, 7 story beats, 17 endings, 5 eras, 5 visible meters and 2 hidden ones. Her design is in the Expansion Plan doc, tabs "Cleopatra" and "Cleopatra image prompts". The rules have been through the simulator (v2) and are final for this task: **do not rebalance them.** If anything looks wrong, stop and ask.

## Provided

Unzip `task-16-cleopatra.zip` into the repo root:

| Path | What it is |
| --- | --- |
| `content/cleopatra/rules.json` | Rules v2, in the rules contract format |
| `content/cleopatra/text.en.json` | All player-facing text, draft 1, keyed by scene and option ids |
| `content/cleopatra/meta.json` | Eras and the era variant, image ids (including variant scene images), variant narration mapping, meters, tier, cross-ruler achievements |
| `content/cleopatra/fixtures.json` | 1,552 golden fixtures from the reference engine, covering all 17 endings at least three times each |
| `tools/cleopatra_sim/` | The reference engine, rules generator and simulator these rules were balanced on |

Move the content to wherever Caesar's and Charles's live, and convert text and metadata to the repo's formats. **Change names and shapes freely; never change meaning.**

## 1. Engine compatibility (first)

Run every fixture through the Python reference engine and the TypeScript engine. Each fixture gives the option id chosen at every shown scene; the engine must reproduce `ending`, `finalMeters`, `finalPath`, `finalPatron` and `beats`.

Features to check, beyond what Charles needed:

- **Scene variants that carry their own image.** Scenes Q17–Q22 have several variants; the alternative ones have an `image` field (`QO1`–`QO7`). The scene image shown must be the variant's image when it has one, otherwise the scene's own id.
- **Variant narration chosen by variant**, not only by a flag: `meta.json` `variantText` maps each variant image to a narration key (`octavian` or `warwon`) in the text. Generalise Task 13's variant narration so it keys off the variant that matched.
- **Several `cond` entries on one option, run in order,** where an earlier entry has no `else` (scene Q22, option `treat`).
- **Finale outcomes with different `if` checklists** and no score threshold: two separate routes can produce `queen_of_kings`.
- **Several events after one scene,** each able to fire its own beat (for example Q04, Q20, Q21).
- **An event branch that both fires a beat and changes meters** (the Alexandrian War, `alexwar`).

Add anything missing to **both** engines in the smallest way that fits the contract, with unit tests. Elizabeth's, Caesar's and Charles's fixtures must still pass unchanged. If the engines still disagree on any fixture, stop and report it rather than editing the rules.

## 2. Content and data

- **Text:** convert and lint as for Charles. Options that always end the run have no consequence text (including Q22 `treat`, which ends either way). Branch and arc scenes have no chronicle notes and count as "Uncharted paths".
- **Era card variant:** a player on Octavian's road (`patron` is `octavian` when era 4 begins) sees "Octavian's Friend" instead of "Antony", reusing image `QO1` until it has its own art.
- **Scene eras:** in `meta.json`. The Pothinus branch belongs to era 1; the Nile Pact and the Warning to era 2.
- **Tier:** 2, with the same XP tier as Caesar.
- **Unlocking:** follow the rule that unlocks Caesar and Charles. Don't invent a new one.

## 3. Meters

- **Visible:** Treasury, Alexandria, Divinity, Fleet, Rome. **Hidden:** Octavian, Rivals.
- **Failures:** Treasury, Alexandria, Divinity or Rome at 0; Rivals or Octavian at 100. Fleet has no failure; it feeds the battle checks.
- **Danger glow** below 20 for Treasury, Alexandria, Divinity and Rome.
- **Icons:** not made yet. Use placeholders, wired so the 5-piece sheet drops in through the meter pipeline with the Task 14 meter scale.

## 4. Images

Register the ids in `meta.json` under ruler `cleopatra` through the Task 12 pipeline. The art isn't made yet; the app must run with every image missing, and `npm run images` lists what's missing.

| Images | Ids |
| --- | --- |
| Main scenes | `Q01`–`Q22` |
| Octavian's road (variant scenes) | `QO1`–`QO7` |
| Single-scene branches | `QB1`–`QB4` |
| Arcs | `QN1`–`QN3`, `QW1`–`QW3`, `QE1`–`QE3` |
| Story beats | `QT1`–`QT7` |
| Endings | `QX01`–`QX17` (order in `meta.json`) |
| Prologue, eras, ruler card | `QP1`, `QERA1`–`QERA5`, `QR1` |

## 5. Cross-ruler secret achievements

Add two hidden achievements with Task 15's achievement system. Both need endings from **two rulers**, reached in any runs and in any order:

- **A Love Older Than Rome:** Caesar's ending titled "Lord of the Nile" and Cleopatra's `nile_pact`.
- **Beware the Ides:** any Caesar ending in which Caesar survives the Ides of March, and Cleopatra's `two_worlds`. Work out the qualifying Caesar endings from Caesar's rules (endings reached only on paths where Caesar is not assassinated in 44 BC), and **list them in your report** for AJ to confirm.

They are hidden ("???") until earned, follow the profile's no-spoiler rules, and are checked on load so existing progress counts. If Task 15's conditions can't yet reference another ruler's endings, add that as a condition type rather than a special case. Badge art comes later; use the placeholder badge.

## 6. Simulator

Make the repo's simulator run Cleopatra and report the same measures as for Charles, plus the **decision influence** measure from `tools/cleopatra_sim/simulate.py` (for each main decision, the largest difference in the mix of ending categories between its options). Expected, with history-leaning play (55% historical):

| Measure | Expected (reference engine) |
| --- | --- |
| Historical ending (`asp`) | about 11% |
| Outperform ending (`queen_of_kings`) | about 0.03–0.05% |
| Routes to `queen_of_kings` | two, both used (Octavian's road; victory at Actium) |
| Latest decision a copier can deviate at and still outperform | decision 17 of 22 |
| Main decisions shifting the ending mix by 8% or more | 21 of 22 |

Small differences from sampling are fine; large ones mean the engines differ.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- All 1,552 Cleopatra fixtures pass on both engines; every earlier ruler's fixtures still pass.
- Cleopatra is selectable and playable from the prologue to an ending, with placeholders for missing art.
- The historical path (always the historical option) plays all 22 decisions and ends at `asp`.
- Choosing Octavian at Tarsus shows the "Octavian's Friend" era card, the variant images `QO1`–`QO5` and their narration for scenes 17–21, and `QO7` at scene 22. Winning at Actium shows `QO6` and its narration.
- Both cross-ruler achievements exist, stay hidden until earned, and are awarded when both endings are reached.
- Committed on branch `task-16-cleopatra`, with a short report: engine features added, the Caesar endings chosen for "Beware the Ides", and the simulator numbers.
