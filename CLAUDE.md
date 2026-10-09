# CLAUDE.md

## Project

**Consequences** is a mobile historical decision game built with Expo (React Native, TypeScript).
The player rules as a historical figure through a fixed sequence of scenes, making decisions that
move hidden and visible state. The goal is to match the ruler's historical outcome or beat it. The
first ruler is Elizabeth I (1558-1588, ending with the Spanish Armada).

Read this file fully before starting any task. Task prompts live in `docs/tasks/`.

## Non-negotiable design rules

1. **Fully deterministic.** No randomness anywhere in game logic. Never use `Math.random`, dice or chance.
2. **The rules files are the single source of truth.** Each ruler's balance lives in
   `src/data/rulers/<ruler>/rules.json`. Never hard-code effects, thresholds or conditions in
   TypeScript. The engine interprets the data; it knows nothing about any particular ruler.
3. **Never edit `rules.json` or test fixtures to make a test pass.** If the engine disagrees with a
   fixture, the engine is wrong. Fixtures are generated from the Python reference engine.
4. **No per-decision history lesson.** The player is never told what the real ruler did after a
   choice. They discover it across runs. At the end of a run, decisions that matched the ruler are
   highlighted. The engine must record every decision and whether it was the historical one.
5. **Ruler-agnostic core.** Nothing in `src/core` may mention a ruler, an event (Armada, Ides) or any
   specific meter name. Meter and flag names come from the data. The finale is called "finale".
6. **Monetisation (later tasks, not now):** rulers are mostly free; a few may be exclusives. The
   main paid layer is cosmetic customisation, added later. Do not add store, ads or purchase code
   until a task asks.

## Repository layout

```
app/                                   # Expo Router screens (later tasks)
src/
  core/                                # pure TypeScript rules engine
  data/rulers/<ruler>/rules.json       # rules - source of truth (elizabeth-i, julius-caesar)
  data/rulers/<ruler>/text.en.json     # all player-facing text for that ruler
  data/rulers/<ruler>/ui.json          # presentation: meters, eras, prologue, ruler card
  data/strings.en.json                 # shared UI strings
  ui/                                  # components (later tasks)
assets/rulers/<ruler>/images/          # scene, beat, ending and card images
tests/
  core/                                # Jest tests for src/core
  fixtures/<ruler>/golden_paths.json   # generated - never hand-edit
docs/tasks/                            # task prompts
tools/engine.py                        # Python reference engine (the spec in executable form)
tools/make_fixtures.py                 # exhaustive fixture generator (small rulers: Elizabeth)
tools/make_fixtures_sampled.py         # coverage-sampled fixture generator (large rulers: Caesar)
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
clamped), then sets. An effect inside a `cond` branch or an event branch may instead be
`{"end": endingId}`, which ends the run at that point.

**Scored tests.** `{"terms": [...], "at_least": N}` uses the same term rules as the finale score.
An event branch may carry `"score"`; the branch matches only if its `if` holds and the score is at
least `at_least`.

**Scene options.** A scene has either `options` or `variants`. With `variants`, the first variant
whose `if` matches is used: `skip: true` means the scene is not shown and changes nothing;
`auto: true` means the single option plays automatically with no player choice.

**Choosing an option** (all option and scene conditions read the state as it was when the
scene began, the "pre" state):
1. If the option has `end`, the run ends immediately with that ending. No other effects or checks.
2. Sum the option's `add` with the `then.add` of every `scene_cond` whose `if` matches pre.
   Apply those adds in one pass (one clamp per meter), then the option's `set`.
3. For each entry in the option's `cond`, in order: if its `if` matches pre, take `then`,
   otherwise `else` (if present). A branch with `end` ends the run immediately; otherwise apply it to
   the current state.
4. For each event id in the scene's `after`, in order: take the first branch whose `if` (and
   `score`, if present) matches the current state. A branch with `end` ends the run immediately
   (its `beat`, if any, still plays); otherwise apply its `then`.

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

**Branch scenes.** A scene with `"branch": true` is a detour off the main story. It has no
historical option; its decisions count as "uncharted paths" in the chronicle, never towards matches.

**Story beats.** Beats are presentation only and never change state. Each beat id in `beats` maps
to an image. After a decision, its beats are, in order: the option's own `beats`, then the `beat`
of each event branch that fired (only branches that have one). An option with `end` has no beats.
When the run ends through the finale (early or not), `finale.beats` play in order before the
ending. An entry is a beat id, or `{"beat": id, "if": clauses}`, which plays only if the clauses hold
for the final state. `early_finale` may be absent or null. Failure and alternate endings have no finale beats.

**Run history.** Record every shown scene (choice or auto, never skipped):
`{scene, option, historical, auto, beats}`. Historical matches = decisions where `historical` is
true and `auto` is false.

## Testing

- `npm test` runs Jest (preset `jest-expo`). `npx tsc --noEmit` must also pass.
- `tests/fixtures/golden_paths.json` cases replay `choices` (one option id per shown scene,
  including auto scenes) and assert ending, score (tolerance 1e-9), early flag, final state,
  decision log (including beats), finale beats and match count.
- After any edit to `rules.json`, regenerate fixtures with `python tools/make_fixtures.py` from the
  repo root and review the diff before committing.
- Run the tests yourself after every change and fix failures before reporting a task done.

## Working conventions

- One task per branch; commit when the task's acceptance criteria pass.
- Small, single-purpose modules named for what they do. No global mutable state in `src/core`.
- Use `npx expo install` for Expo-compatible packages. Ask before adding any package not named in
  a task.
