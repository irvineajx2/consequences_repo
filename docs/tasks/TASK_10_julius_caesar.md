# Task 10: Julius Caesar, the second ruler

Read `CLAUDE.md` first; its rules contract now covers engine v2 (conditional endings, scored event
branches, branch scenes, conditional finale beats). Tasks 7 and 8 must be merged.

## Goal

Make Consequences genuinely multi-ruler and add Julius Caesar as a fully playable second ruler, with
all his rules, text and presentation data, ready to show his images as they are dropped in.
Elizabeth's game must not change in any way.

## Provided (unzip `task10-caesar.zip` into the repo root)

- `CLAUDE.md` (updated)
- `src/data/rulers/julius-caesar/rules.json` (version 4), `text.en.json`, `ui.json`,
  `image_manifest.json` (every image id Caesar uses, by scene, beat, ending and card)
- `tests/fixtures/julius-caesar/golden_paths.json`: 170 cases covering every option, every
  conditional branch, every beat and all 17 endings
- `tools/engine.py` (reference engine v2), `tools/make_fixtures.py` (Elizabeth, new output path),
  `tools/make_fixtures_sampled.py` (Caesar)

## 1. Engine v2 (src/core)

Port the reference engine's additions, exactly as the rules contract describes:
- A `cond` branch may contain `end`; the run ends there.
- Event branches may contain `end` and a `score` test (`terms` plus `at_least`).
- `finale.beats` entries may be objects with an `if`.
- `early_finale` may be absent or null.
- Scenes may carry `"branch": true`; the engine treats them like any scene, but the run history
  records the flag on each decision.

Run history gains `branch` on each decision, and the outcome gains `branchDecisions` (count).
Historical matches are unchanged: historical, not auto. Branch decisions never count.

**Fixtures:** move Elizabeth's fixtures to `tests/fixtures/elizabeth-i/golden_paths.json`. Golden
tests run for every ruler found under `tests/fixtures/`, asserting everything they assert today plus
`branch` on each decision and `branch_decisions`. Elizabeth's 218 cases must still pass unchanged
(the reference engine already proves this). Caesar's 170 cases must pass.

## 2. Multi-ruler data

- **Ruler registry** (`src/data/rulers/index.ts`): add `julius-caesar` with its rules, text, ui and
  image registry. Each ruler has its own image folder, `assets/rulers/julius-caesar/images/`.
- **Image registry per ruler:** `npm run images` builds a registry for every ruler folder. The typo
  test checks each ruler's image ids against that ruler's rules and `ui.json`. Missing images show
  the placeholder.
- **Shared strings:** move the UI strings and the meter state words out of Elizabeth's text file into
  `src/data/strings.en.json`, used by every ruler. Each ruler's text file keeps only its own text.
- **Option labels:** a scene's text may include `options` overrides; the button shows the text label
  when present, otherwise the rules label.
- **Text completeness test, per ruler:** every scene and non-ending option has text; every
  non-branch scene has a chronicle note; branch scenes must not have one.

## 3. Meters per ruler

- The meter row reads its meters from the current ruler's `ui.json`. Caesar shows Fortune, Legions,
  People, Senate and Glory; Rivalry and Resentment are hidden.
- The skin's meter art is keyed by ruler, then meter id. Caesar's illustrated icons do not exist
  yet: until they do, draw a **placeholder medal** in code (a gold disc with the meter's initial,
  filling and draining like the real icons) and make the art test report missing ruler art as a
  warning, not a failure. When the icons arrive they are added like Elizabeth's.

## 4. Profiles, saves and unlocking

- **Per-ruler profile.** Discovered choices, endings, uncharted paths and runs completed are stored
  per ruler. Migrate the existing profile (version 1, Elizabeth only) to version 2 without losing
  anything; test the migration.
- **One run save per ruler.** The title screen's "Continue reign" resumes the most recently played
  save; the ruler-select card shows "Continue" for any ruler with a save.
- **Unlocking:** Caesar unlocks once the player has reached any Elizabeth ending. Locked, his card
  shows his portrait darkened with "Complete a reign as Elizabeth I to unlock". Add a hidden debug
  toggle (long-press the version number on the title screen) that unlocks every ruler, for testing.
- Replace the "Coming soon" card logic so it appears after the last real ruler.

## 5. Chronicle and endings for branches

- **End-of-run chronicle:** branch decisions appear in order, marked "Uncharted path", never
  highlighted as matches, and the match count ("N of M decisions matched") excludes them.
- **Chronicle screen:** one tab per unlocked ruler. Under each ruler's decisions, an "Uncharted paths"
  section: "X of 8 found", listing the titles of branch scenes the player has visited.
- **Endings screen:** one tab per unlocked ruler.

## 6. Caesar's presentation

Everything already built works for Caesar from his data: the prologue, four era cards with drift
on the cards, the read-then-decide panel, beats (including the conditional Theatre of Pompey beat),
endings, chronicle and ruler card. Era 2 drift animates on the era 2 card as for Elizabeth.

## 7. Images

Image ids are in `image_manifest.json`: scenes `C01`-`C22`, branch scenes `CB1`-`CB8`, beats
`CT1`-`CT6`, endings `CX01`-`CX17`, prologue `CP1`, era cards `CERA1`-`CERA4`, ruler card `CR1`
(59 in all). AJ will drop them into `assets/rulers/julius-caesar/images/`; `npm run images` picks
them up with no code changes.

## Tests (in addition to the above)

- Caesar's historical path ends in `ides` with score 17.5, 22 historical matches, 0 branch
  decisions, and the `theatre_of_pompey` finale beat.
- A Caesar run through a branch (any golden case with `branch_decisions` above 0) shows those
  decisions as uncharted in the chronicle view model and excludes them from the match count.
- A run that stays home and refuses Decimus has no Theatre of Pompey beat.
- Profiles for the two rulers are independent: finishing a Caesar run never changes Elizabeth's
  discoveries or endings.

## Acceptance criteria

- `npm test`, `npx tsc --noEmit` and `npx expo-doctor` pass, including all golden cases for both rulers.
- On a phone: a full Elizabeth run behaves exactly as before. After it, Caesar unlocks and can be
  played start to finish with placeholders, including at least one branch, and his chronicle and
  endings appear on their own tabs.
- Dropping a test image named `C01.webp` into Caesar's image folder and running `npm run images`
  shows it in scene 1.
- Committed on branch `task-10-julius-caesar`.

## Out of scope

XP, currency, rank, the shop and avatar; Caesar's illustrated meter icons; the playtest build.
