# Task 1: Project setup and core rules engine

Read `CLAUDE.md` first. This task builds `src/core` only: no screens, no components, no images.

## Goal

Port `tools/engine.py` to TypeScript so that every case in `golden_paths.json` produces exactly the
same result as the Python reference engine.

## Setup

1. Create a new Expo project named `consequences` with TypeScript and Expo Router, using the
   current default template. Remove the template's example screens (its reset script does this)
   and leave a minimal placeholder `app/index.tsx`.
2. Place the provided files:
   - `rules.json` → `src/data/rulers/elizabeth-i/rules.json`
   - `golden_paths.json` → `tests/fixtures/golden_paths.json`
   - `engine.py`, `make_fixtures.py` → `tools/`
   - this file → `docs/tasks/`
3. Add Jest: `npx expo install jest-expo jest @types/jest -- --save-dev`, set `"preset": "jest-expo"`
   in the Jest config and add `"test": "jest"` to `package.json` scripts.
4. Confirm `tsconfig.json` has `"strict": true` and allows JSON imports.

## Build in src/core

- **Types for the rules file** (meters, flags, failures, drift, events, early_finale, finale,
  endings, scenes with options or variants). Condition values can be number, boolean, string or a
  list of strings.
- **A loader** that takes the parsed JSON and returns typed rules, throwing a clear error if a
  referenced ending or event id does not exist.
- **`GameState`**: readonly meters (number) and flags (boolean or string) by name; operations
  return new objects.
- **Condition evaluation** with all seven operators.
- **The rules engine**, with an API along these lines (names may differ, behaviour may not):
  - `start(rules): GameState`
  - `getScene(rules, index, state)` → mode (`choice`, `auto` or `skip`) plus the options
  - `choose(rules, index, pre, optionId)` → new state, or an ending
  - `resolve(rules, index, state)` → continue, or ending with score and early flag
  - `finaleScore(rules, state): number`
- **Run history**: readonly list of decisions `{scene, option, historical, auto}` with a
  `historicalMatches` count. A run is (state, history, scene index); advancing returns a new run.
- **`replay(rules, choices)`**: plays a list of option ids and returns the final outcome. Used by
  tests and later by debugging tools.

Follow the rules contract in CLAUDE.md precisely, especially: conditions read the pre-scene state;
scene_cond adds merge with the option's adds before clamping; events read the current state; drift
rules apply in order; skipped scenes still resolve.

## Tests (Jest, in tests/core)

1. **Golden paths:** one test per case in `golden_paths.json` (218 cases, use `test.each`). Assert:
   ending id, early flag, finale score within 1e-9 (when not null), every meter and flag in
   `final_state`, the full decision log, and `historical_matches`.
2. **Historical path explicitly:** the `historical_path` case ends in `gloriana`, score 120,
   17 decisions, 17 historical matches.
3. **Rules file loads:** 17 scenes, 13 endings, every scene and ending has an image id, option ids
   are unique within each scene, every referenced ending and event id exists.
4. **Immutability:** choosing an option never changes the input state (deep-freeze it in the test).
5. **Clamp:** an add that would push a meter below 0 or above 100 clamps.
6. **Core purity:** no file in `src/core` imports `react`, `react-native` or any `expo*` package.

## Acceptance criteria

- `npm test` passes, including all 218 golden cases, and `npx tsc --noEmit` reports no errors.
- No Elizabeth-specific names (meters, flags, scenes, "Armada") appear in `src/core`.
- `rules.json` and `golden_paths.json` are unchanged from the provided versions.
- `npx expo start` still launches the placeholder app.
- Committed on branch `task-01-core-engine`.

## Out of scope

Screens, components, images, saving, audio, ads, purchases. Do not start them.

## If something does not match

Debug by replaying the failing case step by step against `tools/engine.py`. Do not change the data
or fixtures, and do not add special cases for particular scenes.
