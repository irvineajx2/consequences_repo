import { choose, getScene, type Outcome, resolve, type SceneView, start } from './engine';
import type { Rules } from './rules';
import type { GameState } from './state';

export interface Decision {
  readonly scene: string;
  readonly option: string;
  readonly historical: boolean;
  readonly auto: boolean;
  /** Story beats shown after this decision. */
  readonly beats: readonly string[];
}

export interface RunHistory {
  readonly decisions: readonly Decision[];
  /** Decisions that matched the ruler, excluding auto scenes. */
  readonly historicalMatches: number;
}

/**
 * A run in progress or finished. While `outcome` is null, `sceneIndex` always points at a scene
 * that is shown to the player (skipped scenes are resolved on the way).
 */
export interface Run {
  readonly state: GameState;
  readonly history: RunHistory;
  readonly sceneIndex: number;
  readonly outcome: Outcome | null;
}

export const emptyHistory: RunHistory = Object.freeze({ decisions: Object.freeze([]), historicalMatches: 0 });

export function record(history: RunHistory, decision: Decision): RunHistory {
  const counts = decision.historical && !decision.auto;
  const entry = Object.freeze({ ...decision, beats: Object.freeze([...decision.beats]) });
  return Object.freeze({
    decisions: Object.freeze([...history.decisions, entry]),
    historicalMatches: history.historicalMatches + (counts ? 1 : 0),
  });
}

/** Resolves skipped scenes until the run reaches a shown scene or ends. */
function settle(rules: Rules, run: Run): Run {
  let current = run;
  while (current.outcome === null && getScene(rules, current.sceneIndex, current.state).mode === 'skip') {
    const { state, outcome } = resolve(rules, current.sceneIndex, current.state);
    current = { ...current, state, outcome, sceneIndex: current.sceneIndex + 1 };
  }
  return Object.freeze(current);
}

export function startRun(rules: Rules): Run {
  return settle(rules, { state: start(rules), history: emptyHistory, sceneIndex: 0, outcome: null });
}

/** The scene the player is currently facing, or null when the run is over. */
export function currentScene(rules: Rules, run: Run): SceneView | null {
  return run.outcome === null ? getScene(rules, run.sceneIndex, run.state) : null;
}

/** Plays one option in the current scene and returns the next run. */
export function advance(rules: Rules, run: Run, optionId: string): Run {
  if (run.outcome !== null) throw new Error('The run is already over');
  const view = getScene(rules, run.sceneIndex, run.state);
  const option = view.options.find((o) => o.id === optionId);
  if (!option) {
    throw new Error(`Scene "${rules.scenes[run.sceneIndex].id}" has no available option "${optionId}"`);
  }
  const chosen = choose(rules, run.sceneIndex, run.state, optionId);
  const history = record(run.history, {
    scene: rules.scenes[run.sceneIndex].id,
    option: option.id,
    historical: option.historical,
    auto: view.mode === 'auto',
    beats: chosen.beats,
  });

  if (chosen.ending !== null) {
    return Object.freeze({
      state: chosen.state,
      history,
      sceneIndex: run.sceneIndex,
      outcome: { ending: chosen.ending, score: null, early: false, beats: [] },
    });
  }
  const { state, outcome } = resolve(rules, run.sceneIndex, chosen.state);
  return settle(rules, { state, history, sceneIndex: run.sceneIndex + 1, outcome });
}
