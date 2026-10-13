# Task 13: Charles I, the third ruler

Read `CLAUDE.md` first, then Task 10 (Julius Caesar) to see how a second ruler was added: Charles follows the same pattern. Tasks 10, 11, 11b and 12 must be merged.

Charles is tier 3: 23 main-line scenes, 22 branch scenes (five multi-scene arcs and seven single-scene branches), 7 story beats, 17 endings, 5 eras, 5 visible meters (one a two-sided gauge) and 3 hidden ones. His full design is in the Expansion Plan doc, tab "Charles I". The rules have been through the simulator (v2) and are final for this task: **do not rebalance them.** If anything in them looks wrong, stop and ask.

## Provided

Unzip `task-13-charles.zip` into the repo root. It adds:

| Path | What it is |
| --- | --- |
| `content/charles-i/rules.json` | Rules v2, in the rules contract format |
| `content/charles-i/text.en.json` | All player-facing text, draft 1, keyed by rules scene and option ids |
| `content/charles-i/meta.json` | Eras and era variants, image ids, meter display config, tier, variant text |
| `content/charles-i/fixtures.json` | 1,548 golden fixtures from the reference engine, covering all 17 endings |
| `tools/charles_sim/` | The reference engine these rules were balanced on, plus the simulator scripts |
| `docs/tasks/TASK_13_charles_i.md` | This file |

Move the content files to wherever Caesar's live (for example `content/rulers/charles-i/`), and convert `text.en.json` and `meta.json` into the repo's existing formats. **Change names and shapes freely; never change meaning.**

## 1. Engine compatibility (do this first)

`tools/charles_sim/engine.py` is a reference engine rebuilt from the rules contract outside the repo. It is not guaranteed to match `tools/engine.py` exactly.

1. Run every fixture through the repo's Python reference engine, then through the TypeScript engine. Each fixture gives the option id chosen at every shown scene; the engine must reproduce `ending`, `finalMeters`, `finalPath` and `beats`.
2. List every difference. Charles uses some features Elizabeth and Caesar may not have needed; check each:
   - string flag values (`path` is a string: `"main"`, `"peace"`, `"exile"`, ...);
   - the `in` operator in conditions (`["path","in",["peace","london","settled"]]`);
   - failures with several conditions;
   - drift rules that `set` flags as well as `add` to meters (Distrust resets the `lied` flag each era);
   - finale outcomes decided by `if` conditions alone, with no score threshold;
   - `cond` branches whose `else` is an ending;
   - scene variants that `skip`, including a whole run of skipped main scenes while an arc is active;
   - event branches with a `score` test.
3. Where the repo engines lack a feature, add it to **both** engines in the smallest way that matches the contract, with unit tests. Where the repo engine does something differently by design, follow the repo and tell me which fixtures change and why.
4. **Elizabeth's and Caesar's fixtures must still pass unchanged.**

If the two engines disagree on any fixture after this, stop and report it rather than editing the rules.

## 2. Content and data

- **Rules:** load `rules.json` as Charles's rules. Run the existing rules linter; every scene must be reachable and every ending must be reachable (the fixtures prove they are).
- **Text:** convert to the repo format and run the content linter. Budgets are the same as Elizabeth's and Caesar's, and draft 1 already fits them. Points to note:
  - Options that end the run directly have no consequence text. So do `KE3` and `KB7`, where every outcome is an ending.
  - `options` in the text holds label overrides where the rules label is long.
  - Branch and arc scenes have no chronicle notes, and count as "Uncharted paths" in the chronicle, as for Caesar.
- **Variant narration:** scene `K19` has two variants. When `warwon` is true (the player won at Naseby), show `victory_narration` instead of `narration`. Add this as a general feature (variant-specific narration keyed by the variant's condition), not a Charles special case.
- **Era cards with variants:** players on the peace arc reach era 4 without a war, and players in exile reach era 5 without being captive. `meta.json` gives two era variants, chosen by the `path` flag when the era card is shown: "The Uneasy Peace" (era 4) and "The King Over the Water" (era 5). Until their own art exists, they reuse the `KA1` and `KE1` scene images.
- **Scene eras:** `meta.json` maps every scene to its era. The peace and London arcs belong to era 4; the Covenanted and exile arcs to era 5.
- **Tier:** Charles is tier 3, with a proposed XP multiplier of 1.5. Use the existing tier mechanism; if multipliers are set elsewhere, flag the number rather than inventing a new rule.
- **Unlocking:** follow whatever rule currently unlocks Caesar. Don't invent a new one.

## 3. Meters

- **Visible:** Treasury, Parliament, Church, Army, Majesty. **Hidden:** Scotland, Ireland, Distrust (never shown to the player).
- **Church is a two-sided gauge** like Elizabeth's Religion: the Puritan end at 0, the high-church end at 100. It fails at 10 or below and at 90 or above. Show danger below 20 and above 80.
- **Army** fails at 0 only while the war is on (`war` is true). Show its danger glow only then.
- **Majesty** has no failure; it feeds the battle checks.
- **Icons:** the meter art doesn't exist yet. Use placeholders, and wire the skin mapping so the real 7-piece sheet (chest, mace, lobster-tail helmet, crown; church marker, plain book, mitre) drops in later through the meter-icon pipeline.

## 4. Images

Image ids are in `meta.json`. Register them through the Task 12 pipeline, under ruler id `charles-i`. Most art doesn't exist yet: AJ is generating it now. The app must run with any image missing, using the existing placeholder behaviour, and `npm run images` must list what's missing.

| Images | Ids |
| --- | --- |
| Main scenes | `K01`–`K22`, `K19B` |
| Single-scene branches | `KB1`–`KB7` |
| Arcs | `KA1`–`KA4`, `KL1`–`KL3`, `KI1`–`KI2`, `KC1`–`KC3`, `KE1`–`KE3` |
| Story beats | `KT1`–`KT7` |
| Endings | `KX01`–`KX17` (the order is in `meta.json`) |
| Prologue, eras, ruler card | `KP1`, `KERA1`–`KERA5`, `KR1` |

## 5. Simulator

Make the repo's simulator run Charles and report the same measures as for Caesar. With history-leaning play (55% historical), it should land close to the reference results:

| Measure | Expected (reference engine) |
| --- | --- |
| Historical ending (`axe`) | about 7.9% |
| Outperform ending (`long_live`) | about 0.017–0.019% |
| Latest decision a copier can deviate at and still outperform | decision 7 of 23 |
| Most common deviation in winning runs | about 56% |

Small differences from sampling are fine. Large ones mean the engines differ: go back to step 1.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- All 1,548 Charles fixtures pass on both engines; Elizabeth's and Caesar's still pass.
- The rules and content linters pass for Charles.
- Charles is selectable and playable from the prologue to an ending, with placeholder art where images are missing.
- The historical path (always the option marked historical) plays all 23 main decisions, fires all seven beats (`KT1`–`KT7`) and ends at `axe`.
- Choosing to settle at Nottingham with the peace arc shows "The Uneasy Peace" era card; escaping to France shows "The King Over the Water".
- Winning at Naseby shows the victory narration for scene 19.
- The simulator report for Charles is within the tolerances above.
- Committed on branch `task-13-charles-i`, with a short report: engine features added, any fixture differences and their explanation, and the simulator numbers.
