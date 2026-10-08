# CLAUDE.md

## Project

**Consequences** is a mobile historical decision game built with Expo (React Native, TypeScript).
The player rules as a historical figure through a fixed sequence of scenes, making decisions that
move hidden and visible state. The goal is to match the ruler's historical outcome or beat it. The
first ruler is Elizabeth I (1558-1588, ending with the Spanish Armada).

Read this file fully before starting any task. Task prompts live in `docs/tasks/`.

## Non-negotiable design rules

1. **Fully deterministic.** No randomness anywhere in game logic. Never use `Math.random`, dice or chance.
2. **The rules file is the single source of truth.** All balance lives in
   `src/data/rulers/elizabeth-i/rules.json`. Never hard-code effects, thresholds or conditions in
   TypeScript. The engine interprets the data; it does not know about Elizabeth.
3. **Never edit `rules.json` or test fixtures to make a test pass.** If the engine disagrees with a
   fixture, the engine is wrong. Fixtures are generated from the Python reference engine.
4. **No per-decision history lesson.** The player is never told what the real ruler did after a
   choice. They discover it across runs. At the end of a run, decisions that matched the ruler are
   highlighted. The engine must record every decision and whether it was the historical one.
5. **Ruler-agnostic core.** Nothing in `src/core` may mention Elizabeth, Armada, Spain or any
   specific meter name. Meter and flag names come from the data. The finale is called "finale".
6. **Monetisation (later tasks, not now):** rulers are mostly free; a few may be exclusives. The
   main paid layer is cosmetic customisation, added later. Do not add store, ads or purchase code
   until a task asks.

## Repository layout

```
app/                                   # Expo Router screens (later tasks)
src/
  core/                                # pure TypeScript rules engine
  data/rulers/elizabeth-i/rules.json   # rules - source of truth
  ui/                                  # components (later tasks)
assets/rulers/elizabeth-i/images/      # scene and ending images (later tasks)
tests/
  core/                                # Jest tests for src/core
  fixtures/golden_paths.json           # generated - never hand-edit
docs/tasks/                            # task prompts
tools/engine.py                        # Python reference engine (the spec in executable form)
tools/make_fixtures.py                 # regenerates golden_paths.json from rules.json
```

## Architecture

- **`src/core`** is pure TypeScript: no imports from `react`, `react-native` or any `expo*`
  package. It holds the rules data types, immutable `GameState`, the rules engine and run history.
  A test enforces the import ban.
- **UI** (later tasks) reads state from core and never contains game rules.
- **State is immutable.** Use `Readonly` types and return new objects from every operation. This
  gives save games and rewind for free; do not add mutation for convenience.
- **Rules and text ship in the JS bundle** (JSON imports), so balance fixes and text corrections
  can go out through EAS Update. Images are bundled assets.
- **TypeScript strict mode** throughout. No `any` in `src/core`.

## Rules contract (must match tools/engine.py exactly)

`tools/engine.py` is the executable specification. Where this summary and the Python differ,
the Python wins.

**State.** Meters are integers clamped to `meter_range` ([0, 100]) on every add. Flags are boolean
or string. Start values come from `meters` and `flags`.

**Conditions.** A condition is a list of `[var, op, value]` clauses; all must hold. Ops:
`==`, `!=`, `<`, `<=`, `>`, `>=`, `in` (value is a list). A missing `if` is always true.

**Effects.** `{"add": {meter: delta}, "set": {flag: value}}`. Adds are applied first (each
clamped), then sets.

**Scene options.** A scene has either `options` or `variants`. With `variants`, the first variant
whose `if` matches is used: `skip: true` means the scene is not shown and changes nothing;
`auto: true` means the single option plays automatically with no player choice.

**Choosing an option** (all option and scene conditions read the state as it was when the
scene began, the "pre" state):
1. If the option has `end`, the run ends immediately with that ending. No other effects or checks.
2. Sum the option's `add` with the `then.add` of every `scene_cond` whose `if` matches pre.
   Apply those adds in one pass (one clamp per meter), then the option's `set`.
3. For each entry in the option's `cond`, in order: if its `if` matches pre, apply `then`,
   otherwise apply `else` (if present). Each applies to the current state.
4. For each event id in the scene's `after`, in order: apply the `then` of the first branch whose
   `if` matches the current state.

**Resolving after a scene** (also run for skipped scenes):
1. Check `failures` in order against the current state; the first match ends the run.
2. If the scene has `drift_after`: apply each `drift` rule in order, each tested against the state
   as updated by the previous rules. Then check `failures` again.
3. If this was the last scene: resolve the finale.
4. Otherwise, if this scene is at or before `early_finale.until_scene` and `early_finale.if`
   matches: resolve the finale now, marked as early.

**Finale score.** Sum of `terms`: `{var, mult}` adds `state[var] * mult`; `{var, over, mult}` adds
`max(0, state[var] - over) * mult`; `{if, add}` adds `add` when the condition holds.
**Finale outcome:** the first entry in `outcomes` where every present test passes
(`below`: score < value; `at_least`: score >= value; `if`: condition holds).

**Run history.** Record every shown scene (choice or auto, never skipped):
`{scene, option, historical, auto}`. Historical matches = decisions where `historical` is true and
`auto` is false.

## Testing

- `npm test` runs Jest (preset `jest-expo`). `npx tsc --noEmit` must also pass.
- `tests/fixtures/golden_paths.json` cases replay `choices` (one option id per shown scene,
  including auto scenes) and assert ending, score (tolerance 1e-9), early flag, final state,
  decision log and match count.
- After any edit to `rules.json`, regenerate fixtures with `python tools/make_fixtures.py` from the
  repo root and review the diff before committing.
- Run the tests yourself after every change and fix failures before reporting a task done.

## Working conventions

- One task per branch; commit when the task's acceptance criteria pass.
- Small, single-purpose modules named for what they do. No global mutable state in `src/core`.
- Use `npx expo install` for Expo-compatible packages. Ask before adding any package not named in
  a task.
