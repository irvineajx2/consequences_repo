// Types describing a ruler's rules file. Field names follow the JSON format.

export type FlagValue = boolean | string;

export type ConditionValue = number | boolean | string | readonly string[];

export type Operator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in';

/** `[var, op, value]`. */
export type Clause = readonly [string, Operator, ConditionValue];

/** All clauses must hold. A missing condition is always true. */
export type Condition = readonly Clause[];

export interface Effect {
  readonly add?: Readonly<Record<string, number>>;
  readonly set?: Readonly<Record<string, FlagValue>>;
}

export interface ConditionalEffect {
  readonly if?: Condition;
  readonly then: Effect;
  readonly else?: Effect;
}

export interface Option {
  readonly id: string;
  readonly label: string;
  readonly historical: boolean;
  readonly add?: Readonly<Record<string, number>>;
  readonly set?: Readonly<Record<string, FlagValue>>;
  readonly cond?: readonly ConditionalEffect[];
  /** When present, choosing this option ends the run immediately with this ending. */
  readonly end?: string;
}

export interface Variant {
  readonly if?: Condition;
  readonly skip?: boolean;
  readonly auto?: boolean;
  readonly options?: readonly Option[];
}

export interface SceneCondition {
  readonly if?: Condition;
  readonly then: Effect;
}

export interface Scene {
  readonly id: string;
  readonly title: string;
  readonly year: string;
  readonly image: string;
  readonly options?: readonly Option[];
  readonly variants?: readonly Variant[];
  readonly scene_cond?: readonly SceneCondition[];
  /** Event ids applied after the option, in order. */
  readonly after?: readonly string[];
  readonly drift_after?: boolean;
}

export interface Failure {
  readonly if: Condition;
  readonly end: string;
}

export interface DriftRule {
  readonly if?: Condition;
  readonly then: Effect;
}

export interface EventBranch {
  readonly if?: Condition;
  readonly then: Effect;
}

export interface GameEvent {
  readonly branches: readonly EventBranch[];
  readonly image_by_branch?: readonly (string | null)[];
}

export interface EarlyFinale {
  readonly if: Condition;
  readonly until_scene: string;
}

export type FinaleTerm =
  | { readonly var: string; readonly mult: number; readonly over?: number }
  | { readonly if: Condition; readonly add: number };

export interface FinaleOutcome {
  readonly below?: number;
  readonly at_least?: number;
  readonly if?: Condition;
  readonly end: string;
}

export interface Finale {
  readonly terms: readonly FinaleTerm[];
  readonly outcomes: readonly FinaleOutcome[];
}

export interface Ending {
  readonly title: string;
  readonly category: string;
  readonly image: string;
}

export interface Rules {
  readonly ruler: string;
  readonly version: number;
  readonly meters: Readonly<Record<string, number>>;
  readonly meter_range: readonly [number, number];
  readonly flags: Readonly<Record<string, FlagValue>>;
  readonly failures: readonly Failure[];
  readonly drift: readonly DriftRule[];
  readonly events: Readonly<Record<string, GameEvent>>;
  readonly early_finale: EarlyFinale;
  readonly finale: Finale;
  readonly endings: Readonly<Record<string, Ending>>;
  readonly scenes: readonly Scene[];
}
