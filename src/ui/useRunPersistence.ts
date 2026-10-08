import { useEffect, useRef, useState } from 'react';
import { finishRun, saveRun } from '../game/persistence';
import { saveOf } from '../game/save';
import type { Session } from '../game/session';
import type { KeyValueStorage } from '../game/storage';

export interface FinishedRun {
  /** Scenes this run discovered for the first time. */
  readonly newlyDiscovered: readonly string[];
}

/**
 * Saves the run after every choice; when it ends, records it in the profile and deletes the save.
 * Returns the finished run's discoveries once recorded (null while playing or still saving).
 */
export function useRunPersistence(storage: KeyValueStorage, session: Session): FinishedRun | null {
  const { run, rules } = session;
  const decisions = run.history.decisions;
  const [finished, setFinished] = useState<{ decisions: unknown; result: FinishedRun } | null>(null);
  const recorded = useRef<unknown>(null);

  // Save once per choice: the decisions list only changes when a choice is made.
  useEffect(() => {
    if (run.outcome !== null || decisions.length === 0) return;
    saveRun(storage, rules, saveOf({ rules, run })).catch(() => {
      // A failed save only loses resume; the game carries on.
    });
  }, [decisions, run, rules, storage]);

  useEffect(() => {
    const outcome = run.outcome;
    if (outcome === null || recorded.current === decisions) return;
    recorded.current = decisions;
    finishRun(storage, rules, {
      ending: outcome.ending,
      score: outcome.score,
      decisions,
      finishedAt: new Date().toISOString(),
    })
      .then(({ newlyDiscovered }) => setFinished({ decisions, result: { newlyDiscovered } }))
      .catch(() => setFinished({ decisions, result: { newlyDiscovered: [] } }));
  }, [run.outcome, decisions, rules, storage]);

  // Only report the finish for the run currently on screen (not one before "Play again").
  return finished !== null && finished.decisions === decisions ? finished.result : null;
}
