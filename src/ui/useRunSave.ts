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
