// The outfit the player wears, for every place the avatar appears. Loaded once from the profile and
// updated when the dressing room saves, so all placements show the same figure.
import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_OUTFIT, type Outfit } from '../../game/avatar';
import { loadProfile } from '../../game/persistence';
import { appStorage } from '../appStorage';

let current: Outfit = DEFAULT_OUTFIT;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows a new outfit everywhere (after the dressing room saves it). */
export function setPlayerOutfit(outfit: Outfit): void {
  current = outfit;
  listeners.forEach((l) => l());
}

/** The player's outfit (the default until the profile has loaded). */
export function usePlayerOutfit(): Outfit {
  useEffect(() => {
    loading ??= loadProfile(appStorage)
      .then((p) => setPlayerOutfit(p.identity.avatar))
      .catch(() => {});
  }, []);
  return useSyncExternalStore(subscribe, () => current);
}
