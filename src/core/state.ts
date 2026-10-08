import type { Effect, FlagValue, Rules } from './rules';

export interface GameState {
  readonly meters: Readonly<Record<string, number>>;
  readonly flags: Readonly<Record<string, FlagValue>>;
}

export type StateValue = number | FlagValue;

function makeState(
  meters: Readonly<Record<string, number>>,
  flags: Readonly<Record<string, FlagValue>>,
): GameState {
  return Object.freeze({ meters: Object.freeze({ ...meters }), flags: Object.freeze({ ...flags }) });
}

export function startState(rules: Rules): GameState {
  return makeState(rules.meters, rules.flags);
}

/** Reads a meter or flag by name. */
export function valueOf(state: GameState, name: string): StateValue {
  if (Object.prototype.hasOwnProperty.call(state.meters, name)) return state.meters[name];
  if (Object.prototype.hasOwnProperty.call(state.flags, name)) return state.flags[name];
  throw new Error(`Unknown state variable "${name}"`);
}

export function meterOf(state: GameState, name: string): number {
  if (!Object.prototype.hasOwnProperty.call(state.meters, name)) {
    throw new Error(`Unknown meter "${name}"`);
  }
  return state.meters[name];
}

/** Applies adds (each clamped to the range) and then sets. Returns a new state. */
export function applyEffect(
  state: GameState,
  effect: Effect,
  range: readonly [number, number],
): GameState {
  const [lo, hi] = range;
  const meters: Record<string, number> = { ...state.meters };
  for (const [name, delta] of Object.entries(effect.add ?? {})) {
    meters[name] = Math.max(lo, Math.min(hi, meterOf(state, name) + delta));
  }
  const flags: Record<string, FlagValue> = { ...state.flags };
  for (const [name, value] of Object.entries(effect.set ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(flags, name)) throw new Error(`Unknown flag "${name}"`);
    flags[name] = value;
  }
  return makeState(meters, flags);
}

/** Meters and flags as one flat record. */
export function flatten(state: GameState): Readonly<Record<string, StateValue>> {
  return { ...state.meters, ...state.flags };
}
