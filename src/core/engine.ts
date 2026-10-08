import { matches } from './conditions';
import type { Option, Rules } from './rules';
import { applyEffect, type GameState, meterOf, startState } from './state';

export type SceneMode = 'choice' | 'auto' | 'skip';

export interface SceneView {
  readonly mode: SceneMode;
  readonly options: readonly Option[];
}

export interface ChooseResult {
  readonly state: GameState;
  /** Set when the option ends the run on the spot. */
  readonly ending: string | null;
}

export interface Outcome {
  readonly ending: string;
  /** Finale score, or null when the run ended some other way. */
  readonly score: number | null;
  readonly early: boolean;
}

export interface ResolveResult {
  readonly state: GameState;
  readonly outcome: Outcome | null;
}

export function start(rules: Rules): GameState {
  return startState(rules);
}

function sceneAt(rules: Rules, index: number) {
  const scene = rules.scenes[index];
  if (!scene) throw new Error(`No scene at index ${index}`);
  return scene;
}

/** Which options the scene offers given the state at its start. */
export function getScene(rules: Rules, index: number, state: GameState): SceneView {
  const scene = sceneAt(rules, index);
  const variants = scene.variants ?? [{ options: scene.options }];
  for (const v of variants) {
    if (!matches(state, v.if)) continue;
    if (v.skip) return { mode: 'skip', options: [] };
    return { mode: v.auto ? 'auto' : 'choice', options: v.options ?? [] };
  }
  throw new Error(`Scene "${scene.id}" has no variant matching the current state`);
}

/** Applies one option. All option and scene conditions read `pre`; events read the current state. */
export function choose(rules: Rules, index: number, pre: GameState, optionId: string): ChooseResult {
  const scene = sceneAt(rules, index);
  const option = getScene(rules, index, pre).options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Scene "${scene.id}" has no available option "${optionId}"`);
  if (option.end !== undefined) return { state: pre, ending: option.end };

  const add: Record<string, number> = { ...option.add };
  for (const c of scene.scene_cond ?? []) {
    if (!matches(pre, c.if)) continue;
    for (const [name, delta] of Object.entries(c.then.add ?? {})) add[name] = (add[name] ?? 0) + delta;
  }
  let state = applyEffect(pre, { add, set: option.set }, rules.meter_range);

  for (const c of option.cond ?? []) {
    const branch = matches(pre, c.if) ? c.then : c.else;
    if (branch) state = applyEffect(state, branch, rules.meter_range);
  }

  for (const eventId of scene.after ?? []) {
    const branch = rules.events[eventId].branches.find((b) => matches(state, b.if));
    if (branch) state = applyEffect(state, branch.then, rules.meter_range);
  }
  return { state, ending: null };
}

function failure(rules: Rules, state: GameState): string | null {
  return rules.failures.find((f) => matches(state, f.if))?.end ?? null;
}

export function finaleScore(rules: Rules, state: GameState): number {
  let score = 0;
  for (const term of rules.finale.terms) {
    if ('var' in term) {
      const value = meterOf(state, term.var);
      score += (term.over !== undefined ? Math.max(0, value - term.over) : value) * term.mult;
    } else if (matches(state, term.if)) {
      score += term.add;
    }
  }
  return score;
}

export function finale(rules: Rules, state: GameState, early: boolean): Outcome {
  const score = finaleScore(rules, state);
  for (const o of rules.finale.outcomes) {
    if (o.below !== undefined && !(score < o.below)) continue;
    if (o.at_least !== undefined && !(score >= o.at_least)) continue;
    if (!matches(state, o.if)) continue;
    return { ending: o.end, score, early };
  }
  throw new Error(`No finale outcome matches score ${score}`);
}

/** Runs after every scene, including skipped ones: failures, drift, failures, finale. */
export function resolve(rules: Rules, index: number, state: GameState): ResolveResult {
  const scene = sceneAt(rules, index);
  const ended = (s: GameState, ending: string): ResolveResult => ({
    state: s,
    outcome: { ending, score: null, early: false },
  });

  const failed = failure(rules, state);
  if (failed) return ended(state, failed);

  if (scene.drift_after) {
    for (const rule of rules.drift) {
      if (matches(state, rule.if)) state = applyEffect(state, rule.then, rules.meter_range);
    }
    const failedAfterDrift = failure(rules, state);
    if (failedAfterDrift) return ended(state, failedAfterDrift);
  }

  if (index === rules.scenes.length - 1) return { state, outcome: finale(rules, state, false) };

  const until = rules.scenes.findIndex((s) => s.id === rules.early_finale.until_scene);
  if (index <= until && matches(state, rules.early_finale.if)) {
    return { state, outcome: finale(rules, state, true) };
  }
  return { state, outcome: null };
}
