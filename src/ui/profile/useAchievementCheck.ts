import { useEffect, useState } from 'react';
import type { Achievement } from '../../game/achievements';
import { recordAchievements } from '../../game/persistence';
import { appStorage } from '../appStorage';
import { allRulerFacts } from './rulerFacts';

/**
 * Once `ready` (the saves have been checked, so any finished run is recorded), awards every
 * achievement the stored profile qualifies for: on first launch with achievements, an existing
 * player receives all they have already earned, together. Returns those just earned (for one
 * notice) and whether the check has finished.
 */
export function useAchievementCheck(ready: boolean): { readonly checked: boolean; readonly newlyEarned: readonly Achievement[] } {
  const [result, setResult] = useState<{ checked: boolean; newlyEarned: readonly Achievement[] }>({ checked: false, newlyEarned: [] });
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    recordAchievements(appStorage, allRulerFacts, new Date().toISOString())
      .catch(() => [])
      .then((newlyEarned) => {
        if (!cancelled) setResult({ checked: true, newlyEarned });
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return result;
}
