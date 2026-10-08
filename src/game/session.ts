// Turns the rules engine into a sequence of screens. Pure TypeScript: no React.
import { advance, currentScene, type Decision, type Rules, type Run, startRun } from '../core';

export interface SceneViewModel {
  readonly kind: 'scene';
  readonly sceneIndex: number;
  readonly sceneId: string;
  readonly variant: number;
  readonly image: string;
  readonly mode: 'choice' | 'auto';
  /** Option ids in display order. Whether an option is historical is deliberately not exposed. */
  readonly options: readonly string[];
}

export interface ConsequenceViewModel {
  readonly kind: 'consequence';
  readonly sceneIndex: number;
  readonly sceneId: string;
  readonly variant: number;
  readonly image: string;
  readonly optionId: string;
}

export interface BeatViewModel {
  readonly kind: 'beat';
  readonly beatId: string;
  readonly image: string;
}

export interface EndingViewModel {
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
}

function viewFor(rules: Rules, run: Run): SceneViewModel | EndingViewModel {
  if (run.outcome !== null) {
    const { decisions, historicalMatches } = run.history;
    return {
      kind: 'ending',
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
    sceneIndex: run.sceneIndex,
    sceneId: sceneData.id,
    variant: scene.variant,
    image: sceneData.image,
    mode: scene.mode,
    options: scene.options.map((o) => o.id),
  };
}

export function start(rules: Rules): Session {
  const run = startRun(rules);
  return { rules, run, view: viewFor(rules, run), pendingBeats: [] };
}

function beatView(rules: Rules, beatId: string): BeatViewModel {
  return { kind: 'beat', beatId, image: rules.beats[beatId].image };
}

/**
 * Plays an option in the current scene. Shows its consequence, or the ending if the option itself
 * ends the run. The decision's beats follow the consequence, then the finale beats if the run
 * reached the finale.
 */
export function choose(session: Session, optionId: string): Session {
  const { view, rules } = session;
  if (view.kind !== 'scene') throw new Error(`Cannot choose an option from the ${view.kind} view`);
  const option = currentScene(rules, session.run)?.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Scene "${view.sceneId}" has no available option "${optionId}"`);

  const run = advance(rules, session.run, optionId);
  if (option.end !== undefined) return { rules, run, view: viewFor(rules, run), pendingBeats: [] };
  const decision = run.history.decisions[run.history.decisions.length - 1];
  return {
    rules,
    run,
    pendingBeats: [...decision.beats, ...(run.outcome?.beats ?? [])],
    view: {
      kind: 'consequence',
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
  const { view, rules, pendingBeats } = session;
  if (view.kind !== 'consequence' && view.kind !== 'beat') {
    throw new Error(`Cannot continue from the ${view.kind} view`);
  }
  const [next, ...rest] = pendingBeats;
  if (next !== undefined) return { ...session, view: beatView(rules, next), pendingBeats: rest };
  return { ...session, view: viewFor(rules, session.run) };
}
export { continueSession as continue };

export type SessionAction =
  | { readonly type: 'start' }
  | { readonly type: 'choose'; readonly optionId: string }
  | { readonly type: 'continue' };

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'start':
      return start(session.rules);
    case 'choose':
      return choose(session, action.optionId);
    case 'continue':
      return continueSession(session);
  }
}
