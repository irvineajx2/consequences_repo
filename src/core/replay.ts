import type { Outcome } from './engine';
import type { Rules } from './rules';
import { advance, type Run, startRun } from './run';

export interface ReplayResult {
  readonly outcome: Outcome;
  readonly run: Run;
}

/** Plays one option id per shown scene (auto scenes included) and returns the final outcome. */
export function replay(rules: Rules, choices: readonly string[]): ReplayResult {
  let run = startRun(rules);
  for (const [i, choice] of choices.entries()) {
    if (run.outcome !== null) {
      throw new Error(`Run ended after ${i} choices but ${choices.length} were given`);
    }
    run = advance(rules, run, choice);
  }
  if (run.outcome === null) {
    throw new Error(`Run not finished after ${choices.length} choices`);
  }
  return { outcome: run.outcome, run };
}
