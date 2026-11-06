// The battle runtime: a battle's phases, scenes and outcome, in the order tools/battle_sim/battle.py
// (the specification) runs them. Everything the data gives comes from the battle's data file; the
// battle's own move and scene effects come from its module. Pure TypeScript, immutable state.
import { menPerBin } from './sliders';
import type { BattleData, BattleEnd, BattleModule, Orders, PhaseContext, PhaseRecord, SectorResult } from './types';

/** A sector pressed this little or less is quiet ("none"): no fighting there. */
export const QUIET_PRESSURE = 0.5;

/** A battle in progress or finished. */
export interface BattleRun<S> {
  readonly battleId: string;
  /** The enemy's hidden plan, fixed at the start. */
  readonly plan: string;
  /** The phase whose orders come next (one past the last phase once all are played). */
  readonly phase: number;
  readonly state: S;
  /** Scene choices so far. */
  readonly scenes: Readonly<Record<string, string>>;
  /** Every phase fought, in order (one that ended the battle included). */
  readonly phases: readonly PhaseRecord<S>[];
  /** Phases played through to their end (as battle.py's log counts them). */
  readonly phasesCompleted: number;
  /** Orders committed and waiting for a scene shown during the phase. */
  readonly pendingOrders: Orders | null;
  /** The battle is won and waits for the scene shown after victory; holds the outcome. */
  readonly pendingVictory: string | null;
  readonly end: BattleEnd | null;
}

/** What the battle needs from the player next. */
export type BattleStep =
  | { readonly kind: 'scene'; readonly sceneId: string; readonly when: 'before' | 'during' | 'after' }
  | { readonly kind: 'orders'; readonly phase: number }
  | { readonly kind: 'finished'; readonly end: BattleEnd };

export interface Battle<S> {
  readonly data: BattleData;
  readonly module: BattleModule<S>;
}

export function phaseCount(data: BattleData): number {
  return Object.keys(data.phases).length;
}

/** The sectors that can be attacked (those with a terrain value), in data order. */
export function fightingSectors(data: BattleData): string[] {
  return data.sectors.filter((s) => data.terrain[s] !== undefined);
}

/** The phase's moves. */
export function movesFor(data: BattleData, phase: number): readonly string[] {
  return data.phases[String(phase)]?.moves ?? [];
}

/** Outcomes that are a victory: those with a medal. */
export function isVictory(data: BattleData, outcome: string): boolean {
  return Object.prototype.hasOwnProperty.call(data.economy.goldFirstMedal, outcome);
}

export function startBattle<S>({ data, module }: Battle<S>, plan: string): BattleRun<S> {
  if (!data.plans.includes(plan)) throw new Error(`Unknown plan "${plan}" for ${data.id}`);
  return {
    battleId: data.id,
    plan,
    phase: 1,
    state: module.initialState(),
    scenes: {},
    phases: [],
    phasesCompleted: 0,
    pendingOrders: null,
    pendingVictory: null,
    end: null,
  };
}

function sceneWhen(data: BattleData, phase: number, when: 'before' | 'during'): string | undefined {
  return Object.keys(data.scenes).find((id) => data.scenes[id][when] === phase);
}

function victoryScene(data: BattleData): string | undefined {
  return Object.keys(data.scenes).find((id) => data.scenes[id].after === 'victory');
}

export function nextStep<S>({ data }: Battle<S>, run: BattleRun<S>): BattleStep {
  if (run.end) return { kind: 'finished', end: run.end };
  if (run.pendingVictory !== null) return { kind: 'scene', sceneId: victoryScene(data) ?? '', when: 'after' };
  if (run.pendingOrders !== null) return { kind: 'scene', sceneId: sceneWhen(data, run.phase, 'during') ?? '', when: 'during' };
  const before = sceneWhen(data, run.phase, 'before');
  if (before !== undefined && run.scenes[before] === undefined) return { kind: 'scene', sceneId: before, when: 'before' };
  return { kind: 'orders', phase: run.phase };
}

/** Whether a set of orders is legal for this phase: steps that fill each pool, a position, a move. */
export function validOrders(data: BattleData, phase: number, orders: Orders): boolean {
  const pools: [string, readonly number[]][] = [
    ['cohorts', orders.cohorts],
    ['cavalry', orders.cavalry],
  ];
  const poolsOk = pools.every(([id, steps]) => {
    const pool = data.pools[id];
    return (
      pool !== undefined &&
      steps.length === pool.bins.length &&
      steps.every((n) => Number.isInteger(n) && n >= 0) &&
      steps.reduce((a, b) => a + b, 0) === pool.total / pool.step
    );
  });
  return poolsOk && data.commanderPositions.includes(orders.commander) && movesFor(data, phase).includes(orders.move);
}

function finish<S>(battle: Battle<S>, run: BattleRun<S>, outcome: string, early: boolean, state: S): BattleRun<S> {
  const unlocks = [...battle.module.unlocks(outcome, state, run.scenes, run.phasesCompleted)].sort();
  return { ...run, state, pendingOrders: null, pendingVictory: null, end: { outcome, early, unlocks } };
}

/** Chooses an option in the scene the battle is waiting on. */
export function chooseScene<S>(battle: Battle<S>, run: BattleRun<S>, choice: string): BattleRun<S> {
  const step = nextStep(battle, run);
  if (step.kind !== 'scene') throw new Error('No scene is waiting');
  const scene = battle.data.scenes[step.sceneId];
  if (!scene?.options.includes(choice)) throw new Error(`"${choice}" is not an option in ${step.sceneId}`);
  const chosen = { ...run, scenes: { ...run.scenes, [step.sceneId]: choice } };
  if (step.when === 'before') return { ...chosen, state: battle.module.applySceneBefore(run.state, step.sceneId, choice) };
  if (step.when === 'during') return resolvePhase(battle, { ...chosen, pendingOrders: null }, run.pendingOrders as Orders);
  return finish(battle, chosen, run.pendingVictory as string, false, run.state);
}

/**
 * Commits a phase's orders. If a scene is shown during this phase, the battle waits for it and the
 * phase resolves once it is chosen; otherwise the phase resolves now.
 */
export function commitOrders<S>(battle: Battle<S>, run: BattleRun<S>, orders: Orders): BattleRun<S> {
  const step = nextStep(battle, run);
  if (step.kind !== 'orders') throw new Error('The battle is not waiting for orders');
  if (!validOrders(battle.data, run.phase, orders)) throw new Error(`Invalid orders for phase ${run.phase}`);
  if (sceneWhen(battle.data, run.phase, 'during') !== undefined) return { ...run, pendingOrders: orders };
  return resolvePhase(battle, run, orders);
}

/**
 * One phase, in battle.py's order: the move's immediate effects; the enemy pressure; the reserve; a
 * scene shown during the phase; each sector's result; the endings checked straight after the
 * fighting; each sector's consequences; the move's after-effects; upkeep; the endings checked at the
 * end of a phase; and after the last phase, the outcome.
 */
function resolvePhase<S>(battle: Battle<S>, run: BattleRun<S>, orders: Orders): BattleRun<S> {
  const { data, module } = battle;
  const phase = run.phase;
  const sectors = fightingSectors(data);
  const ctx: PhaseContext = {
    phase,
    finalPhase: phase === phaseCount(data),
    plan: run.plan,
    move: orders.move,
    scenes: run.scenes,
    commander: orders.commander,
    men: menPerBin(data.pools.cohorts, module.poolSize(run.state, 'cohorts'), orders.cohorts),
    cavalry: menPerBin(data.pools.cavalry, module.poolSize(run.state, 'cavalry'), orders.cavalry),
    pressure: {},
  };
  let s = module.applyMoveBefore(run.state, ctx);
  const table = data.pressure[run.plan][String(phase)];
  ctx.pressure = Object.fromEntries(sectors.map((k) => [k, (table[k] ?? 0) * data.tuning.pressureScale]));
  s = module.adjustPressure(s, ctx);
  s = module.useReserve(s, ctx);
  const during = sceneWhen(data, phase, 'during');
  if (during !== undefined) s = module.applySceneDuring(s, during, run.scenes[during], ctx);

  const results: Record<string, SectorResult> = {};
  for (const k of sectors) {
    let d = module.defence(s, k, ctx);
    if (ctx.commander === k) d *= data.tuning.commanderBonus;
    const p = ctx.pressure[k];
    results[k] = p <= QUIET_PRESSURE ? 'none' : band(data, d / p);
  }
  const record = (after: S): PhaseRecord<S> => ({
    phase,
    orders,
    commander: ctx.commander,
    results,
    stateBefore: run.state,
    stateAfter: after,
  });
  const fought = { ...run, phases: [...run.phases, record(s)] };

  const sudden = module.earlyEndingAfterFighting(s, ctx, results);
  if (sudden !== null) return finish(battle, fought, sudden, true, s);
  s = module.applyConsequences(s, ctx, results);
  s = module.applyMoveAfter(s, ctx, results);
  s = module.applyUpkeep(s, ctx);
  const played: BattleRun<S> = {
    ...run,
    state: s,
    phase: phase + 1,
    phases: [...run.phases, record(s)],
    phasesCompleted: run.phasesCompleted + 1,
  };
  const ended = module.earlyEndingAfterUpkeep(s);
  if (ended !== null) return finish(battle, played, ended, true, s);
  if (!ctx.finalPhase) return played;
  const final = module.finalOutcome(s, ctx, results);
  const decided = { ...played, state: final.state };
  if (isVictory(data, final.outcome) && victoryScene(data) !== undefined) return { ...decided, pendingVictory: final.outcome };
  return finish(battle, decided, final.outcome, false, final.state);
}

/** A sector's result from its defence / pressure ratio. */
export function band(data: BattleData, ratio: number): SectorResult {
  if (ratio < data.bands.breach) return 'breach';
  if (ratio < data.bands.strained) return 'strained';
  if (ratio < data.bands.held) return 'held';
  return 'easy';
}

/** Plays a whole strategy against a plan (as the fixtures and the simulator do). */
export function playStrategy<S>(
  battle: Battle<S>,
  plan: string,
  strategy: { readonly phases: Readonly<Record<string, Orders>>; readonly scenes: Readonly<Record<string, string>> },
): BattleRun<S> {
  let run = startBattle(battle, plan);
  for (;;) {
    const step = nextStep(battle, run);
    if (step.kind === 'finished') return run;
    run =
      step.kind === 'scene'
        ? chooseScene(battle, run, strategy.scenes[step.sceneId])
        : commitOrders(battle, run, strategy.phases[String(step.phase)]);
  }
}
