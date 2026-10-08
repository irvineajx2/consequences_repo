import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadProfile } from '../game/persistence';
import { type RulerProfile, rulerProfile } from '../game/profile';
import { appStorage } from './appStorage';

/** The stored profile for a ruler, reloaded whenever the screen comes into focus. Null while loading. */
export function useRulerProfile(rulerId: string): RulerProfile | null {
  const [profile, setProfile] = useState<RulerProfile | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadProfile(appStorage).then((p) => {
        if (!cancelled) setProfile(rulerProfile(p, rulerId));
      });
      return () => {
        cancelled = true;
      };
    }, [rulerId]),
  );
  return profile;
}
