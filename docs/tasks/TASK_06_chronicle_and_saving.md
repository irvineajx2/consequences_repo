# Task 6: End-of-run chronicle, discovery, and saving

Read `CLAUDE.md` first. Task 5 must be merged.

## Goal

Give players a reason to replay. At the end of each run they see which of their decisions matched
Elizabeth's. Across runs, a permanent Chronicle gradually reveals her real choices, and an endings
gallery records every ending reached. Runs survive the app being closed.

**Discovery rule (central to the game):** the game never reveals Elizabeth's choice for a scene
until the player has made that same choice in some run. Unmatched decisions are shown without
saying what she did instead.

## Packages

Install with `npx expo install`: `@react-native-async-storage/async-storage`. Nothing else.

## 1. Text

Add a `chronicle` section to `text.en.json`, keyed by scene id: `{ "note": "[Historical note to be
written]" }`, a short note on what Elizabeth actually did and what followed. Extend the
completeness test so every scene has a chronicle note. Add UI strings for the new screens
("Chronicle", "Undiscovered", "Newly discovered", "As Elizabeth chose", "Endings", "Continue reign",
"New reign").

## 2. Profile and saves (pure TypeScript, `src/game/profile.ts` and `src/game/save.ts`)

**Profile** (persists forever):
- `discovered`: scene ids where the player has made the historical choice in any run (auto
  decisions never count).
- `endings`: ending id → `{ firstReached, timesReached, bestScore? }`.
- `runsCompleted`.
- `applyRunResult(profile, result)` → new profile, plus the list of scenes **newly** discovered in
  this run. Pure and idempotent for the same run.

**Run save** (one in-progress run):
- Save the run as `{ rulesVersion, choices: string[] }`: the option ids chosen so far. The engine
  is deterministic, so replaying the choices rebuilds the exact state. Save after every choice.
- **Resume** replays the choices and opens at the next unanswered scene (not mid-consequence or
  mid-beat).
- If the save's `rulesVersion` differs from `rules.json`'s `version`, or replay fails (for example an
  option id no longer exists after an update), discard the save quietly and tell the player their
  unfinished reign could not be restored. Never crash on a bad save.
- When a run ends, apply it to the profile and delete the run save.

**Storage:** a small storage module wrapping AsyncStorage with versioned keys
(`consequences.profile.v1`, `consequences.run.elizabeth_i.v1`). Keep the rest of the code
storage-agnostic so tests can use an in-memory fake.

## 3. Screens

**Ending view** (existing): add a **Chronicle** button next to Play again.

**End-of-run chronicle** (after an ending):
- Header: the ending's title and category (Historical, Outperformed, Fallen short, Fallen,
  Alternate), and "N of M decisions matched Elizabeth" (non-auto decisions only).
- One row per decision, in order: scene caption and the player's choice.
  - Matched: highlighted in gold with "As Elizabeth chose", and its chronicle note expandable.
    If this run discovered it for the first time, mark it "Newly discovered".
  - Not matched: plain, showing only the player's choice. Never reveal the historical option.
- Buttons: New reign, Back to title.

**Title screen:** "Continue reign" (only when a run save exists), "New reign" (asks for
confirmation if it would discard a run in progress), "Chronicle", "Endings".

**Chronicle screen** (from the title): every decision scene in order. Discovered scenes show
Elizabeth's choice and its note; undiscovered ones show the scene title and "Undiscovered". A
counter at the top: "X of Y discovered", counting scenes where a historical choice exists.

**Endings screen:** a grid of all 13 endings, grouped by category. Unlocked: image, title, times
reached, best score where there is one. Locked: a darkened placeholder, the category, and "???".

All new screens use the skin (panel, buttons, colours, fonts) from Task 4.

## 4. Tests

- `applyRunResult`: the historical golden path discovers all 17 scenes and unlocks `gloriana`;
  applying it twice changes nothing but `timesReached` and `runsCompleted`; auto decisions (the
  undetected Babington plot) never discover a scene; an alternate ending still records the
  decisions made before it.
- Save and resume: for several golden cases, save after each prefix of `choices`, resume, and check
  the resumed state matches a direct replay of that prefix.
- A save with a different `rulesVersion` or an unknown option id is discarded without throwing.
- Profile and run saves round-trip through the in-memory storage fake.
- The chronicle view model never includes the historical option for an unmatched decision.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- On a phone: play part of a run, close the app fully, reopen, and "Continue reign" resumes at the
  same scene with the same meters.
- Finish the historical run: the chronicle shows 17 of 17 matched, all newly discovered; the
  Chronicle screen shows 17 of 17; Gloriana is unlocked in Endings.
- Finish a run that diverges at several scenes: those rows are plain, and the Chronicle screen still
  shows them as Undiscovered unless matched in an earlier run.
- Committed on branch `task-06-chronicle-and-saving`.

## Out of scope

Era cards, audio, settings, cloud sync, monetisation, analytics.
