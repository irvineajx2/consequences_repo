// A battle in play: the run, the choices that made it (so it can be saved and replayed), and the
// seed its hidden plan came from. Saving keeps the seed, never the plan, and resuming replays the
// choices against the same plan. Pure TypeScript.
import {
  type BattleRun,
  chooseScene,
  commitOrders,
  nextStep,
  type Orders,
  planForSeed,
  startBattle,
} from '../battle';
import type { BattleEntry } from '../data/battles';

export type BattleAction =
  | { readonly kind: 'scene'; readonly choice: string }
  | { readonly kind: 'orders'; readonly orders: Orders };

export interface BattleSession {
  readonly battleId: string;
  /** Rewards are applied once per run id. */
  readonly runId: string;
  /** Chooses the hidden plan. */
  readonly seed: string;
  readonly run: BattleRun<unknown>;
  readonly actions: readonly BattleAction[];
}

/** The stored form of a battle in progress. */
export interface BattleSave {
  readonly version: 1;
  readonly battleId: string;
  /** The battle data's version the choices were made under. */
  readonly dataVersion: number;
  readonly runId: string;
  readonly seed: string;
  readonly actions: readonly BattleAction[];
  readonly savedAt?: string;
}

export function newBattleSession(entry: BattleEntry, runId: string, seed: string): BattleSession {
  const { battle } = entry;
  return { battleId: entry.id, runId, seed, run: startBattle(battle, planForSeed(seed, battle.data.plans)), actions: [] };
}

/** Takes one action: a scene choice or a phase's orders. Throws if the battle isn't waiting for it. */
export function act(entry: BattleEntry, session: BattleSession, action: BattleAction): BattleSession {
  const run =
    action.kind === 'scene'
      ? chooseScene(entry.battle, session.run, action.choice)
      : commitOrders(entry.battle, session.run, action.orders);
  return { ...session, run, actions: [...session.actions, action] };
}

export function toBattleSave(entry: BattleEntry, session: BattleSession, savedAt?: string): BattleSave {
  return {
    version: 1,
    battleId: session.battleId,
    dataVersion: entry.battle.data.version,
    runId: session.runId,
    seed: session.seed,
    actions: session.actions,
    ...(savedAt !== undefined ? { savedAt } : {}),
  };
}

/** Replays a save; null if it cannot be restored (another battle, other data, an illegal choice). */
export function resumeBattle(entry: BattleEntry, save: BattleSave): BattleSession | null {
  if (save.battleId !== entry.id || save.dataVersion !== entry.battle.data.version) return null;
  try {
    let session = newBattleSession(entry, save.runId, save.seed);
    for (const action of save.actions) session = act(entry, session, action);
    return session;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseAction(value: unknown): BattleAction | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'scene' && typeof value.choice === 'string') return { kind: 'scene', choice: value.choice };
  const o = value.orders;
  if (value.kind !== 'orders' || !isRecord(o)) return null;
  const steps = (x: unknown) => (Array.isArray(x) && x.every((n) => typeof n === 'number') ? (x as number[]) : null);
  const cohorts = steps(o.cohorts);
  const cavalry = steps(o.cavalry);
  if (!cohorts || !cavalry || typeof o.commander !== 'string' || typeof o.move !== 'string') return null;
  return { kind: 'orders', orders: { cohorts, cavalry, commander: o.commander, move: o.move } };
}

export function parseBattleSave(json: string): BattleSave | null {
  try {
    const v: unknown = JSON.parse(json);
    if (!isRecord(v) || v.version !== 1 || !Array.isArray(v.actions)) return null;
    if (typeof v.battleId !== 'string' || typeof v.dataVersion !== 'number' || typeof v.runId !== 'string' || typeof v.seed !== 'string') {
      return null;
    }
    const actions = v.actions.map(parseAction);
    if (actions.some((a) => a === null)) return null;
    return {
      version: 1,
      battleId: v.battleId,
      dataVersion: v.dataVersion,
      runId: v.runId,
      seed: v.seed,
      actions: actions as BattleAction[],
      ...(typeof v.savedAt === 'string' ? { savedAt: v.savedAt } : {}),
    };
  } catch {
    return null;
  }
}

/** Whether the battle has ended. */
export function battleFinished(entry: BattleEntry, session: BattleSession): boolean {
  return nextStep(entry.battle, session.run).kind === 'finished';
}

/** Phases the player gave orders for. */
export function phasesPlayed(session: BattleSession): number {
  return session.run.phases.length;
}
