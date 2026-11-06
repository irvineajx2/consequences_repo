// Battle mode data and run types. A battle's data file (content/battles/<id>/battle.json) supplies the
// sectors, pools and slider steps, the moves per phase, the scenes and when they occur, the hidden
// plans' pressure tables, the tuning values, result bands and outcomes. Pure TypeScript.

/** A sector's result after a phase: from the defence / pressure ratio, or "none" when not attacked. */
export type SectorResult = 'breach' | 'strained' | 'held' | 'easy' | 'none';

export type Medal = 'gold' | 'silver' | 'bronze';

export interface PoolData {
  /** The pool's size at the start of the battle. */
  readonly total: number;
  /** One slider step at the start; a pool always has total / step steps, whatever its size later. */
  readonly step: number;
  /** Where the pool's steps can go; the last is the reserve. */
  readonly bins: readonly string[];
}

export interface SceneData {
  /** Shown before this phase's orders. */
  readonly before?: number;
  /** Shown in this phase, after the player commits their orders. */
  readonly during?: number;
  /** "victory": shown after the battle is won. */
  readonly after?: string;
  readonly options: readonly string[];
}

export interface BattleData {
  readonly id: string;
  readonly version: number;
  /** The ruler (folder id) whose endings unlock this battle. */
  readonly ruler: string;
  readonly unlock: string;
  /** Rewards scale: XP per phase as a ruler run of this tier. */
  readonly tier: number;
  /** Map positions: the fighting sectors (those with a terrain value) and the camp. */
  readonly sectors: readonly string[];
  readonly terrain: Readonly<Record<string, number>>;
  readonly pools: Readonly<Record<string, PoolData>>;
  readonly commanderPositions: readonly string[];
  readonly phases: Readonly<Record<string, { readonly moves: readonly string[]; readonly mapLighting: string }>>;
  readonly scenes: Readonly<Record<string, SceneData>>;
  readonly plans: readonly string[];
  /** Enemy pressure by plan, then phase, then sector, in cohort-equivalents (before pressureScale). */
  readonly pressure: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, number>>>>>>;
  readonly tuning: {
    readonly pressureScale: number;
    readonly wallBase: number;
    readonly commanderBonus: number;
    readonly [key: string]: number | Readonly<Record<string, number>>;
  };
  /** Upper bounds (exclusive) of the defence / pressure ratio for each band; above `held` is "easy". */
  readonly bands: { readonly breach: number; readonly strained: number; readonly held: number };
  readonly outcomes: { readonly early: readonly string[]; readonly final: readonly string[] };
  readonly unlockables: readonly string[];
  readonly economy: { readonly goldFirstMedal: Readonly<Record<Medal, number>> };
  readonly images: {
    readonly card: string;
    readonly maps: Readonly<Record<string, string>>;
    readonly scenes: Readonly<Record<string, string>>;
    readonly endings: Readonly<Record<string, string>>;
    readonly unlockables: Readonly<Record<string, string>>;
    readonly modeBanner: string;
    readonly sectorPositions: string;
  };
}

/** One phase's orders: slider steps per pool (in the pool's bin order), commander position and move. */
export interface Orders {
  readonly cohorts: readonly number[];
  readonly cavalry: readonly number[];
  readonly commander: string;
  readonly move: string;
}

/** A full strategy, as the fixtures give it. */
export interface Strategy {
  readonly phases: Readonly<Record<string, Orders>>;
  readonly scenes: Readonly<Record<string, string>>;
}

/**
 * Scratch values for resolving one phase: who stands where and how hard the enemy pushes. Built by
 * the runtime, changed in order by the battle's module, and never stored.
 */
export interface PhaseContext {
  readonly phase: number;
  readonly finalPhase: boolean;
  readonly plan: string;
  readonly move: string;
  /** Scene choices made so far (a scene shown during this phase included). */
  readonly scenes: Readonly<Record<string, string>>;
  /** The commander's position (a scene may move it). */
  commander: string;
  /** Cohorts per cohort bin (sectors and reserve). */
  men: Record<string, number>;
  /** Cavalry per cavalry bin. */
  cavalry: Record<string, number>;
  /** Enemy pressure per fighting sector. */
  pressure: Record<string, number>;
}

/** What a resolved phase leaves behind: what happened, and the state after it. */
export interface PhaseRecord<S> {
  readonly phase: number;
  readonly orders: Orders;
  /** Where the commander stood when the fighting began (after any scene). */
  readonly commander: string;
  readonly results: Readonly<Record<string, SectorResult>>;
  readonly stateBefore: S;
  readonly stateAfter: S;
}

export interface BattleEnd {
  readonly outcome: string;
  /** Ended before the last phase's outcome (death, trapped, a resource running out). */
  readonly early: boolean;
  /** Unlockable endings earned, sorted. */
  readonly unlocks: readonly string[];
}

/**
 * A battle's own rules: move and scene effects, and what the runtime cannot read from data. Built
 * from the battle's data (for its tuning values). Each hook
 * runs at its point in the phase (see `resolvePhase`). State is immutable: hooks return new state.
 * Hooks may change the phase context, which is scratch.
 */
export interface BattleModule<S> {
  initialState(): S;
  /** A pool's current size (cohorts lost to fighting shrink it). */
  poolSize(state: S, pool: string): number;
  /** A resource value for display: grain, morale, allies, cohorts and so on. */
  resource(state: S, id: string): number;
  /** A sector's fortification for display. */
  works(state: S, sector: string): number;
  /** A scene chosen before a phase's orders. */
  applySceneBefore(state: S, sceneId: string, choice: string): S;
  /** The move's immediate effects, before the fighting. */
  applyMoveBefore(state: S, ctx: PhaseContext): S;
  /** Scales the enemy pressure (already scaled by the data's pressureScale). */
  adjustPressure(state: S, ctx: PhaseContext): S;
  /** Commits the reserve where the commander stands, if the move does. */
  useReserve(state: S, ctx: PhaseContext): S;
  /** A scene shown during this phase, after the orders. */
  applySceneDuring(state: S, sceneId: string, choice: string, ctx: PhaseContext): S;
  /** A sector's defence before the commander's bonus. */
  defence(state: S, sector: string, ctx: PhaseContext): number;
  /** Endings checked straight after the fighting (before its consequences). */
  earlyEndingAfterFighting(state: S, ctx: PhaseContext, results: Readonly<Record<string, SectorResult>>): string | null;
  /** Losses and morale from each sector's result. */
  applyConsequences(state: S, ctx: PhaseContext, results: Readonly<Record<string, SectorResult>>): S;
  /** The move's effects that depend on how the fighting went. */
  applyMoveAfter(state: S, ctx: PhaseContext, results: Readonly<Record<string, SectorResult>>): S;
  /** Grain, hunger and the end of the phase. */
  applyUpkeep(state: S, ctx: PhaseContext): S;
  /** Endings checked at the end of every phase. */
  earlyEndingAfterUpkeep(state: S): string | null;
  /** The last phase's outcome (gold, silver, bronze or stalemate), and the state as it records it. */
  finalOutcome(state: S, ctx: PhaseContext, results: Readonly<Record<string, SectorResult>>): { outcome: string; state: S };
  /** Unlockable endings earned, given the outcome and every scene choice. */
  unlocks(outcome: string, state: S, scenes: Readonly<Record<string, string>>, phasesCompleted: number): string[];
}
