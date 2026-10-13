import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { loadProfile, updateProfile } from '../../game/persistence';
import type { Profile } from '../../game/profile';
import { memoProfileView, type ProfileView } from '../../game/profileView';
import { appStorage } from '../appStorage';
import { useUnlockAll } from '../useProfile';
import { profileRulers } from './profileRulers';

const selectView = memoProfileView();

/**
 * The stored profile (reloaded on focus), the profile screen's view of it (memoised), and a way to
 * change it (nickname, featured achievement), saved straight away.
 */
export function useProfileData(): {
  readonly profile: Profile | null;
  readonly view: ProfileView | null;
  readonly update: (change: (p: Profile) => Profile) => void;
} {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlockAll] = useUnlockAll();
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
  const rulers = useMemo(() => (profile ? profileRulers(profile, unlockAll) : null), [profile, unlockAll]);
  const view = useMemo(() => (profile && rulers ? selectView(profile, rulers) : null), [profile, rulers]);
  const update = useCallback((change: (p: Profile) => Profile) => {
    updateProfile(appStorage, change)
      .then(setProfile)
      .catch(() => {});
  }, []);
  return { profile, view, update };
}
