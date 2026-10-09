import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Ruler } from '../data/rulers';
import { loadRun } from '../game/persistence';
import { appStorage } from './appStorage';

export type RunSaveStatus = 'loading' | 'none' | 'saved' | 'discarded';

/**
 * Whether a ruler has a reign in progress, checked whenever the screen comes into view. A save
 * that cannot be restored is deleted by loadRun and reported once as 'discarded'.
 */
export function useRunSave(ruler: Ruler): RunSaveStatus {
  const [status, setStatus] = useState<RunSaveStatus>('loading');
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadRun(appStorage, ruler.rules, ruler.ui).then((loaded) => {
        if (cancelled) return;
        setStatus(loaded.status === 'resumed' ? 'saved' : loaded.status);
      });
      return () => {
        cancelled = true;
      };
    }, [ruler]),
  );
  return status;
}

export interface LatestSave {
  /** The ruler whose reign was saved most recently, or null if none is in progress. */
  readonly ruler: Ruler | null;
  /** Some save could not be restored (and was deleted). */
  readonly discarded: boolean;
  readonly loading: boolean;
}

/** Across all rulers, the reign in progress that was saved most recently. Rechecked on focus. */
export function useLatestSave(rulers: readonly Ruler[]): LatestSave {
  const [latest, setLatest] = useState<LatestSave>({ ruler: null, discarded: false, loading: true });
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all(rulers.map((r) => loadRun(appStorage, r.rules, r.ui).then((loaded) => ({ r, loaded })))).then(
        (results) => {
          if (cancelled) return;
          const saved = results.flatMap(({ r, loaded }) =>
            loaded.status === 'resumed' ? [{ r, at: loaded.savedAt ?? '' }] : [],
          );
          // ISO timestamps sort as text; saves from before timestamps count as oldest.
          saved.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
          setLatest({
            ruler: saved[0]?.r ?? null,
            discarded: results.some(({ loaded }) => loaded.status === 'discarded'),
            loading: false,
          });
        },
      );
      return () => {
        cancelled = true;
      };
    }, [rulers]),
  );
  return latest;
}
