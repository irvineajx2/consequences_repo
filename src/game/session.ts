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
  /** Player decisions, auto scenes excluded. */
  readonly playerDecisions: number;
}

export type SessionView = SceneViewModel | ConsequenceViewModel | BeatViewModel | EndingViewModel;

export interface Session {
  readonly rules: Rules;
  readonly run: Run;
  readonly view: SessionView;
  /** Beats still to show, in order, before the next scene or the ending. */
  readonly pendingBeats: readonly string[];
  /** The state shown while the consequence and beats play (after the choice, before drift). */
  readonly afterChoice: GameState;
}

/** The view for where the run now stands: the next scene (resolved state) or the ending. */
function viewFor(rules: Rules, run: Run): SceneViewModel | EndingViewModel {
  if (run.outcome !== null) {
    const { decisions, historicalMatches } = run.history;
    return {
      kind: 'ending',
      state: run.state,
      ending: run.outcome.ending,
      image: rules.endings[run.outcome.ending].image,
      score: run.outcome.score,
      early: run.outcome.early,
      decisions,
      historicalMatches,
      playerDecisions: decisions.filter((d) => !d.auto).length,
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

export function start(rules: Rules): Session {
  const run = startRun(rules);
  return { rules, run, view: viewFor(rules, run), pendingBeats: [], afterChoice: run.state };
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
    return { rules, run, view: viewFor(rules, run), pendingBeats: [], afterChoice };
  }
  const decision = run.history.decisions[run.history.decisions.length - 1];
  return {
    rules,
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

/** Moves on from a consequence or beat to the next beat, the next shown scene, or the ending. */
function continueSession(session: Session): Session {
  const { view, rules, pendingBeats, afterChoice } = session;
  if (view.kind !== 'consequence' && view.kind !== 'beat') {
    throw new Error(`Cannot continue from the ${view.kind} view`);
  }
  const [next, ...rest] = pendingBeats;
  if (next !== undefined) {
    return { ...session, view: beatView(rules, next, afterChoice), pendingBeats: rest };
  }
  return { ...session, view: viewFor(rules, session.run) };
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
      return start(session.rules);
    case 'decide':
      return decide(session);
    case 'choose':
      return choose(session, action.optionId);
    case 'continue':
      return continueSession(session);
  }
}
