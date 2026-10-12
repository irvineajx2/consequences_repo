// Turns the rules engine into a sequence of screens. Pure TypeScript: no React.
import {
  currentScene,
  type Decision,
  type GameState,
  type Rules,
  type Run,
  startRun,
  step,
} from '../core';
import { newRunId } from './runId';

/** Every view carries the state its meters should display. */
interface Displayed {
  readonly state: GameState;
}

/**
 * A scene. Choice scenes start in the `read` phase (caption, narration, Decide) and move to
 * `decide` (narration and options). Auto scenes have only the `read` phase.
 */
export interface SceneViewModel extends Displayed {
  readonly kind: 'scene';
  readonly sceneIndex: number;
  readonly sceneId: string;
  readonly variant: number;
  readonly image: string;
  readonly mode: 'choice' | 'auto';
  readonly phase: 'read' | 'decide';
  /** Option ids in display order. Whether an option is historical is deliberately not exposed. */
  readonly options: readonly string[];
}

/** Shows the state right after the choice, before drift. */
export interface ConsequenceViewModel extends Displayed {
  readonly kind: 'consequence';
  readonly sceneIndex: number;
  readonly sceneId: string;
  readonly variant: number;
  readonly image: string;
  readonly optionId: string;
}

/** Shows the same state as the consequence before it. */
export interface BeatViewModel extends Displayed {
  readonly kind: 'beat';
  readonly beatId: string;
  readonly image: string;
}

export interface EndingViewModel extends Displayed {
  readonly kind: 'ending';
  readonly ending: string;
  readonly image: string;
  readonly score: number | null;
  readonly early: boolean;
  readonly decisions: readonly Decision[];
  /** Player decisions (auto scenes excluded) that matched the ruler. */
  readonly historicalMatches: number;
  /** Player decisions that could match the ruler: auto and branch decisions excluded. */
  readonly playerDecisions: number;
  /** Decisions made in branch scenes (uncharted paths). */
  readonly branchDecisions: number;
}

/** The opening slide of a new run. */
export interface PrologueViewModel extends Displayed {
  readonly kind: 'prologue';
  readonly image: string;
}

/**
 * The card at the start of an era. It shows the resolved state, including the drift that led into
 * the era, so the meters animate here rather than on the scene that follows.
 */
export interface EraViewModel extends Displayed {
  readonly kind: 'era';
  readonly eraId: string;
  readonly image: string;
}

export type SessionView =
  | PrologueViewModel
  | EraViewModel
  | SceneViewModel
  | ConsequenceViewModel
  | BeatViewModel
  | EndingViewModel;

/** Presentation that shapes the run's flow without touching its rules (from a ruler's ui.json). */
export interface Presentation {
  readonly prologue?: { readonly image: string };
  /** In scene order. A scene belongs to the last era whose `startsAt` is at or before it. */
  readonly eras?: readonly { readonly id: string; readonly startsAt: string; readonly image: string }[];
}

export interface Session {
  /** Identifies this run for its save and its one-time rewards. */
  readonly runId: string;
  readonly rules: Rules;
  readonly presentation: Presentation;
  readonly run: Run;
  readonly view: SessionView;
  /** Beats still to show, in order, before the next scene or the ending. */
  readonly pendingBeats: readonly string[];
  /** Era cards (indexes into `presentation.eras`) still to show before the next scene. */
  readonly pendingEras: readonly number[];
  /** Index of the last era card shown, or -1. Each card appears at most once per run. */
  readonly lastEra: number;
  /** The state shown while the consequence and beats play (after the choice, before drift). */
  readonly afterChoice: GameState;
}

/** The view for where the run now stands: the next scene (resolved state) or the ending. */
function viewFor(rules: Rules, run: Run): SceneViewModel | EndingViewModel {
  if (run.outcome !== null) {
    const { decisions, historicalMatches, branchDecisions } = run.history;
    return {
      kind: 'ending',
      state: run.state,
      ending: run.outcome.ending,
      image: rules.endings[run.outcome.ending].image,
      score: run.outcome.score,
      early: run.outcome.early,
      decisions,
      historicalMatches,
      playerDecisions: decisions.filter((d) => !d.auto && !d.branch).length,
      branchDecisions,
    };
  }
  const scene = currentScene(rules, run);
  if (scene === null || scene.mode === 'skip') {
    throw new Error(`Run is not at a playable scene (index ${run.sceneIndex})`);
  }
  const sceneData = rules.scenes[run.sceneIndex];
  return {
    kind: 'scene',
    state: run.state,
    sceneIndex: run.sceneIndex,
    sceneId: sceneData.id,
    variant: scene.variant,
    image: sceneData.image,
    mode: scene.mode,
    phase: 'read',
    options: scene.options.map((o) => o.id),
  };
}

/** Index of the era a scene belongs to, or -1 when it comes before every era. */
function eraIndexOf(session: Session, sceneIndex: number): number {
  const eras = session.presentation.eras ?? [];
  let found = -1;
  eras.forEach((era, i) => {
    const start = session.rules.scenes.findIndex((s) => s.id === era.startsAt);
    if (start < 0) throw new Error(`Era "${era.id}" starts at unknown scene "${era.startsAt}"`);
    if (start <= sceneIndex) found = i;
  });
  return found;
}

function showEra(session: Session, queue: readonly number[]): Session {
  const [index, ...rest] = queue;
  const era = (session.presentation.eras ?? [])[index];
  return {
    ...session,
    view: { kind: 'era', eraId: era.id, image: era.image, state: session.run.state },
    pendingEras: rest,
    lastEra: index,
  };
}

/**
 * Shows where the run now stands: the ending, or the next scene, preceded by the card of every
 * era begun since the last card (an era whose first scene was skipped still gets its card).
 */
function arrive(session: Session): Session {
  const view = viewFor(session.rules, session.run);
  if (view.kind !== 'scene') return { ...session, view, pendingEras: [] };
  const era = eraIndexOf(session, view.sceneIndex);
  if (era <= session.lastEra) return { ...session, view };
  const queue = Array.from({ length: era - session.lastEra }, (_, i) => session.lastEra + 1 + i);
  return showEra(session, queue);
}

/** A new run: the prologue (if any), then the first era card, then the first scene. */
export function start(rules: Rules, presentation: Presentation = {}, runId: string = newRunId()): Session {
  const run = startRun(rules);
  const base: Session = {
    runId,
    rules,
    presentation,
    run,
    view: viewFor(rules, run),
    pendingBeats: [],
    pendingEras: [],
    lastEra: -1,
    afterChoice: run.state,
  };
  if (presentation.prologue) {
    return { ...base, view: { kind: 'prologue', image: presentation.prologue.image, state: run.state } };
  }
  return arrive(base);
}

/** Moves a choice scene from reading to deciding. */
export function decide(session: Session): Session {
  const { view } = session;
  if (view.kind !== 'scene' || view.mode !== 'choice' || view.phase !== 'read') {
    throw new Error('Decide is only available while reading a choice scene');
  }
  return { ...session, view: { ...view, phase: 'decide' } };
}

function beatView(rules: Rules, beatId: string, state: GameState): BeatViewModel {
  return { kind: 'beat', beatId, image: rules.beats[beatId].image, state };
}

/**
 * Plays an option in the current scene: from the decide phase of a choice scene, or straight from
 * an auto scene. Shows its consequence, or the ending if the option itself ends the run. The
 * decision's beats follow the consequence, then the finale beats if the run reached the finale.
 */
export function choose(session: Session, optionId: string): Session {
  const { view, rules } = session;
  if (view.kind !== 'scene') throw new Error(`Cannot choose an option from the ${view.kind} view`);
  if (view.mode === 'choice' && view.phase !== 'decide') {
    throw new Error('Options are chosen in the decide phase');
  }
  const option = currentScene(rules, session.run)?.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Scene "${view.sceneId}" has no available option "${optionId}"`);

  const { run, afterChoice } = step(rules, session.run, optionId);
  if (option.end !== undefined) {
    return arrive({ ...session, run, pendingBeats: [], afterChoice });
  }
  const decision = run.history.decisions[run.history.decisions.length - 1];
  return {
    ...session,
    run,
    afterChoice,
    pendingBeats: [...decision.beats, ...(run.outcome?.beats ?? [])],
    view: {
      kind: 'consequence',
      state: afterChoice,
      sceneIndex: view.sceneIndex,
      sceneId: view.sceneId,
      variant: view.variant,
      image: view.image,
      optionId,
    },
  };
}

/**
 * Moves on from a prologue, era card, consequence or beat: to the next beat, the next era card,
 * the next shown scene, or the ending.
 */
function continueSession(session: Session): Session {
  const { view, rules, pendingBeats, pendingEras, afterChoice } = session;
  if (view.kind === 'scene' || view.kind === 'ending') {
    throw new Error(`Cannot continue from the ${view.kind} view`);
  }
  const [next, ...rest] = pendingBeats;
  if (next !== undefined) {
    return { ...session, view: beatView(rules, next, afterChoice), pendingBeats: rest };
  }
  if (pendingEras.length > 0) return showEra(session, pendingEras);
  return arrive(session);
}
export { continueSession as continue };

export type SessionAction =
  | { readonly type: 'start' }
  | { readonly type: 'decide' }
  | { readonly type: 'choose'; readonly optionId: string }
  | { readonly type: 'continue' };

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'start':
      return start(session.rules, session.presentation);
    case 'decide':
      return decide(session);
    case 'choose':
      return choose(session, action.optionId);
    case 'continue':
      return continueSession(session);
  }
}
