import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadProfile, loadUnlockAll, saveUnlockAll } from '../game/persistence';
import { type Profile, type RulerProfile, rulerProfile } from '../game/profile';
import { appStorage } from './appStorage';

/** The stored profile, reloaded whenever the screen comes into focus. Null while loading. */
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadProfile(appStorage).then((p) => {
        if (!cancelled) setProfile(p);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return profile;
}

/** One ruler's record (by its rules id), reloaded on focus. Null while loading. */
export function useRulerProfile(rulerId: string): RulerProfile | null {
  const profile = useProfile();
  return profile === null ? null : rulerProfile(profile, rulerId);
}

/** The hidden testing switch that unlocks every ruler, and a toggle for it. */
export function useUnlockAll(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadUnlockAll(appStorage).then((v) => {
        if (!cancelled) setOn(v);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  const toggle = () => {
    const next = !on;
    setOn(next);
    saveUnlockAll(appStorage, next).catch(() => {});
  };
  return [on, toggle];
}
