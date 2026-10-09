// Which rulers the player may play. Pure TypeScript.
import { type Profile, rulerProfile } from './profile';

/**
 * A ruler with no prerequisite is always open. Otherwise it unlocks once the player has reached any
 * ending as the prerequisite ruler (`unlockedBy`, that ruler's rules id). `unlockAll` is the hidden
 * testing switch.
 */
export function isUnlocked(unlockedBy: string | undefined, profile: Profile, unlockAll = false): boolean {
  if (unlockAll || unlockedBy === undefined) return true;
  return Object.keys(rulerProfile(profile, unlockedBy).endings).length > 0;
}
