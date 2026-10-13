import { useEffect, useRef, useState } from 'react';
import type { Achievement } from '../game/achievements';
import { finishRun, recordAchievements, resultOf, saveRun } from '../game/persistence';
import type { RewardOutcome } from '../game/progression';
import { saveOf } from '../game/save';
import type { Session } from '../game/session';
import type { KeyValueStorage } from '../game/storage';
import { allRulerFacts } from './profile/rulerFacts';

export interface FinishedRun {
  /** Scenes this run discovered for the first time. */
  readonly newlyDiscovered: readonly string[];
  /** What the run earned (zero if it had somehow been rewarded already). */
  readonly rewards: RewardOutcome | null;
  /** Achievements this run earned. */
  readonly achievements: readonly Achievement[];
}

/**
 * Saves the run after every choice. When it ends: saves it once more, complete (so if the app
 * closes before the run is recorded, the next launch records it), then records it in the profile
 * with its rewards, once per run id, and deletes the save. Returns the finished run's discoveries
 * and rewards once recorded (null while playing or still saving).
 */
export function useRunPersistence(storage: KeyValueStorage, session: Session): FinishedRun | null {
  const { run, rules, runId } = session;
  const decisions = run.history.decisions;
  const [finished, setFinished] = useState<{ decisions: unknown; result: FinishedRun } | null>(null);
  const recorded = useRef<unknown>(null);

  // Save once per choice: the decisions list only changes when a choice is made.
  useEffect(() => {
    if (run.outcome !== null || decisions.length === 0) return;
    saveRun(storage, rules, saveOf({ rules, run, runId }, new Date().toISOString())).catch(() => {
      // A failed save only loses resume; the game carries on.
    });
  }, [decisions, run, rules, runId, storage]);

  useEffect(() => {
    if (run.outcome === null || recorded.current === decisions) return;
    recorded.current = decisions;
    const now = new Date().toISOString();
    saveRun(storage, rules, saveOf({ rules, run, runId }, now))
      .catch(() => {})
      .then(() => finishRun(storage, rules, resultOf({ run, runId }, now)))
      .then(async ({ newlyDiscovered, rewards }) => {
        const achievements = await recordAchievements(storage, allRulerFacts, now).catch(() => []);
        setFinished({ decisions, result: { newlyDiscovered, rewards, achievements } });
      })
      .catch(() => setFinished({ decisions, result: { newlyDiscovered: [], rewards: null, achievements: [] } }));
  }, [run, decisions, rules, runId, storage]);

  // Only report the finish for the run currently on screen (not one before "Play again").
  return finished !== null && finished.decisions === decisions ? finished.result : null;
}
