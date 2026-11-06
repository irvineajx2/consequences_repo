// The battle screen's state: the session, what is on screen (intro, a scene's consequence, a phase's
// report) and the orders being drafted. Saves after every action and records the battle once when it
// ends (rewards, then achievements).
import { useCallback, useEffect, useRef, useState } from 'react';
import { evenSteps, movesFor, nextStep, type Orders } from '../../battle';
import type { BattleEntry } from '../../data/battles';
import type { Achievement } from '../../game/achievements';
import { clearBattle, finishBattle, type FinishedBattleRecord, loadBattle, saveBattle } from '../../game/battlePersistence';
import { act, type BattleSession, newBattleSession } from '../../game/battleSession';
import { recordAchievements } from '../../game/persistence';
import { newRunId } from '../../game/runId';
import { appStorage } from '../appStorage';
import { allRulerFacts } from '../profile/rulerFacts';

export interface BattleScreenState {
  readonly session: BattleSession;
  /** The intro shows before the first orders of a new battle. */
  readonly intro: boolean;
  /** A scene just chosen: its consequence shows next. */
  readonly consequence: { readonly sceneId: string; readonly choice: string } | null;
  /** Phases whose report has been seen. */
  readonly reported: number;
  readonly draft: Orders;
}

export type BattleView =
  | { readonly kind: 'intro' }
  | { readonly kind: 'consequence'; readonly sceneId: string; readonly choice: string }
  | { readonly kind: 'report' }
  | { readonly kind: 'scene'; readonly sceneId: string }
  | { readonly kind: 'orders'; readonly phase: number }
  | { readonly kind: 'result' };

export function viewOf(entry: BattleEntry, s: BattleScreenState): BattleView {
  if (s.intro) return { kind: 'intro' };
  if (s.consequence) return { kind: 'consequence', ...s.consequence };
  if (s.session.run.phases.length > s.reported) return { kind: 'report' };
  const step = nextStep(entry.battle, s.session.run);
  if (step.kind === 'scene') return { kind: 'scene', sceneId: step.sceneId };
  if (step.kind === 'orders') return { kind: 'orders', phase: step.phase };
  return { kind: 'result' };
}

/** The orders a phase starts from: the last phase's (with a move this phase has), or an even split. */
export function defaultOrders(entry: BattleEntry, phase: number, previous?: Orders): Orders {
  const { data } = entry.battle;
  const moves = movesFor(data, phase);
  if (previous) return { ...previous, move: moves.includes(previous.move) ? previous.move : moves[0] };
  return { cohorts: evenSteps(data.pools.cohorts), cavalry: evenSteps(data.pools.cavalry), commander: 'camp', move: moves[0] };
}

function fresh(entry: BattleEntry): BattleScreenState {
  const runId = newRunId();
  return { session: newBattleSession(entry, runId, `${runId}/plan`), intro: true, consequence: null, reported: 0, draft: defaultOrders(entry, 1) };
}

function resumed(entry: BattleEntry, session: BattleSession): BattleScreenState {
  const last = session.run.phases[session.run.phases.length - 1]?.orders;
  return { session, intro: false, consequence: null, reported: session.run.phases.length, draft: defaultOrders(entry, session.run.phase, last) };
}

export interface FinishedBattle extends FinishedBattleRecord {
  readonly runId: string;
  readonly achievements: readonly Achievement[];
}

export function useBattleScreen(entry: BattleEntry, mode: 'new' | 'continue') {
  const [state, setState] = useState<BattleScreenState | null>(null);
  const [finished, setFinished] = useState<FinishedBattle | null>(null);
  const recording = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const begin = async () => {
      if (mode === 'continue') {
        const session = await loadBattle(appStorage, entry);
        if (session) return resumed(entry, session);
      } else {
        await clearBattle(appStorage, entry).catch(() => {});
      }
      return fresh(entry);
    };
    begin()
      .catch(() => fresh(entry))
      .then((s) => {
        if (!cancelled) setState(s);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, mode]);

  // Save after every action; record the battle once when it ends.
  const session = state?.session;
  useEffect(() => {
    if (!session) return;
    if (session.run.end === null) {
      if (session.actions.length > 0) saveBattle(appStorage, entry, session, new Date().toISOString()).catch(() => {});
      return;
    }
    if (recording.current === session.runId) return;
    recording.current = session.runId;
    const now = new Date().toISOString();
    finishBattle(appStorage, entry, session, now)
      .then(async (record) => ({ ...record, runId: session.runId, achievements: await recordAchievements(appStorage, allRulerFacts, now) }))
      .then(setFinished)
      .catch(() => {});
  }, [entry, session]);

  const update = useCallback((change: (s: BattleScreenState) => BattleScreenState) => setState((s) => (s ? change(s) : s)), []);

  return {
    state,
    /** The battle's record and rewards, once it has ended and been recorded. */
    finished: finished !== null && finished.runId === state?.session.runId ? finished : null,
    dismissIntro: () => update((s) => ({ ...s, intro: false })),
    choose: (sceneId: string, choice: string) =>
      update((s) => ({ ...s, session: act(entry, s.session, { kind: 'scene', choice }), consequence: { sceneId, choice } })),
    dismissConsequence: () => update((s) => ({ ...s, consequence: null })),
    setDraft: (draft: Orders) => update((s) => ({ ...s, draft })),
    commit: () => update((s) => ({ ...s, session: act(entry, s.session, { kind: 'orders', orders: s.draft }) })),
    dismissReport: () =>
      update((s) => {
        const last = s.session.run.phases[s.session.run.phases.length - 1];
        return { ...s, reported: s.session.run.phases.length, draft: defaultOrders(entry, s.session.run.phase, last?.orders) };
      }),
    restart: () => {
      setFinished(null);
      setState(fresh(entry));
    },
  };
}
