# Task 16 report: Cleopatra

## Engine features added

**None.** All 1,552 Cleopatra fixtures pass on both the Python reference engine and the TypeScript
engine with no engine changes (ending, final meters, final path, final patron and beats), and every
earlier ruler's fixtures pass unchanged. The design tool's engine is byte-identical to Charles's.
Every feature on the checklist was already supported; the new ones now have unit tests:

- several `cond` entries on one option, in order, an earlier one with no `else` (Q22 `treat`);
- two finale outcomes with different `if` checklists giving the same ending (`queen_of_kings`);
- several events after one scene, each firing its own beat, one also changing meters.

As for Charles, scenes whose variants all have conditions end with an explicit `{"skip": true}` in the
converted rules (the tool skips when nothing matches; the repo engines treat that as an error).

**Presentation, outside the engines:**

- **Variant images:** a scene variant may carry its own `image`, shown instead of the scene's
  (QO1-QO7). Registered and listed by `npm run images` like any other image.
- **Variant narration** keys off the variant that matched (as built in Task 13); Cleopatra's
  `variant_narration` entries are placed on their variants by image (QO1-QO7), so Q22's two
  narrations (Actium won, Octavian's road) land on the right variants.
- **Cross-ruler achievements:** a new condition type, `endingsReached`: one of each group's endings,
  from several rulers, in any runs and any order.
- The import steps are now shared (`tools/ruler_import.py`); Charles's converted files are unchanged.

## "Beware the Ides": the Caesar endings chosen (for AJ to confirm)

Rule used: the run reaches 44 BC and Caesar is alive, and not overthrown, at its end.

| Caesar ending | Where it happens | Included |
| --- | --- | --- |
| `pater_patriae` | After the Ides scene (finale): "You survive the Ides" | Yes |
| `uneasy_crown` | After the Ides scene (finale): "You survive, but Rome does not settle" | Yes |
| `second_sulla` | Rome, 44 BC: he lays down the dictatorship and retires | Yes |
| `ides`, `daggers_dark` | Assassinated | No |
| `king_rome` | February 44 BC: takes the crown and "the Senate rises against" him | No (borderline) |
| `lord_nile` | The Nile, 47 BC: never returns to Rome | No: ends before 44 BC |
| `republic_endures` | 49-50 BC: peace with Pompey | No: ends before 44 BC |
| Other failures | Before or regardless of 44 BC | No |

"A Love Older Than Rome" uses Caesar's `lord_nile`. Caesar's text has no ending titles, so it shows
as "Lord Nile" (made from its id), not "Lord of the Nile": worth adding titles to his text.

## Simulator (`tools/simulate.py`, repo engine; 1,000,000 runs each policy)

| Measure | Repo engine | Expected |
| --- | --- | --- |
| Historical ending (`asp`), history-leaning | 11.01% | about 11% |
| Outperform ending (`queen_of_kings`) | 0.038% (383 runs) | about 0.03-0.05% |
| Routes to `queen_of_kings` | both: victory at Actium (finale outcome 1) 179, Octavian's road (outcome 2) 204 | two, both used |
| Latest decision a copier can deviate at and still outperform | decision 17 of 22 | 17 of 22 |
| Main decisions shifting the ending mix by 8% or more | 21 of 22 (only Q09, 5.4%, below) | 21 of 22 |

The simulator now also reports outperform routes (which finale outcome produced it) and decision
influence (the largest total-variation gap in the ending-category mix between a decision's options).

## Other choices

- **Unlocking:** after any Charles ending (each ruler opens after the one before).
- **XP tier:** 1.25, as Caesar.
- **Gold bands** (provisional, the Task 13 rule): Rare `asp`, `eastern_empire`; Legendary
  `queen_of_kings`; Common `annexed`, `exiled_forever`, `priests_turn`, `paraded_chains`, `nile_pact`,
  `two_worlds`, `client_queen`; Uncommon the rest. Total 913 gold.
- **Rarity** (`npm run rarity -- cleopatra`): `queen_of_kings` Epic (0.035%); no Legendary ending.
- **Meters:** placeholder medals; the 5-piece sheet is planned as `meters/cleopatra/<meter>.png`
  (treasury, alexandria, divinity, fleet, rome), registered as `cleopatra_<meter>`, like Charles's.
- **Images:** all 73 missing (placeholders); `npm run images` lists them.
- **Badges:** Cleopatra's three per-ruler badges and the two cross-ruler ones are still to come
  (placeholder badge).
