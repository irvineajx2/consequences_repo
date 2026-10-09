// Reading and writing the profile and the run in progress, over any key-value store.
import type { Rules } from '../core';
import { applyRunResult, parseProfile, type Profile, type RunResult, rulerProfile, withRulerProfile } from './profile';
import { parseRunSave, resume, type RunSave } from './save';
import type { Presentation, Session } from './session';
import { type KeyValueStorage, storageKeys } from './storage';

/**
 * The stored profile. A version 1 profile (under its old key) is migrated to version 2, saved
 * under the new key, and the old key removed; nothing it recorded is lost.
 */
export async function loadProfile(storage: KeyValueStorage): Promise<Profile> {
  try {
    const current = await storage.getItem(storageKeys.profile);
    if (current !== null) return parseProfile(current);
    const legacy = await storage.getItem(storageKeys.legacyProfile);
    if (legacy === null) return parseProfile(null);
    const migrated = parseProfile(legacy);
    await saveProfile(storage, migrated);
    await storage.removeItem(storageKeys.legacyProfile);
    return migrated;
  } catch {
    return parseProfile(null);
  }
}

export async function loadUnlockAll(storage: KeyValueStorage): Promise<boolean> {
  try {
    return (await storage.getItem(storageKeys.unlockAll)) === 'true';
  } catch {
    return false;
  }
}

export async function saveUnlockAll(storage: KeyValueStorage, on: boolean): Promise<void> {
  if (on) await storage.setItem(storageKeys.unlockAll, 'true');
  else await storage.removeItem(storageKeys.unlockAll);
}

export async function saveProfile(storage: KeyValueStorage, profile: Profile): Promise<void> {
  await storage.setItem(storageKeys.profile, JSON.stringify(profile));
}

export async function saveRun(storage: KeyValueStorage, rules: Rules, save: RunSave): Promise<void> {
  await storage.setItem(storageKeys.run(rules.ruler), JSON.stringify(save));
}

export async function clearRun(storage: KeyValueStorage, rules: Rules): Promise<void> {
  await storage.removeItem(storageKeys.run(rules.ruler));
}

export type LoadedRun =
  | { readonly status: 'none' }
  /** `savedAt` is when the save was written (ISO), if known. */
  | { readonly status: 'resumed'; readonly session: Session; readonly savedAt?: string }
  /** A save existed but could not be restored; it has been deleted. */
  | { readonly status: 'discarded' };

/** Loads and replays the run in progress, quietly deleting a save that cannot be restored. */
export async function loadRun(
  storage: KeyValueStorage,
  rules: Rules,
  presentation: Presentation = {},
): Promise<LoadedRun> {
  let json: string | null;
  try {
    json = await storage.getItem(storageKeys.run(rules.ruler));
  } catch {
    return { status: 'none' };
  }
  if (json === null) return { status: 'none' };
  const save = parseRunSave(json);
  const resumed = save ? resume(rules, save, presentation) : null;
  if (resumed?.ok) {
    return { status: 'resumed', session: resumed.session, ...(save?.savedAt ? { savedAt: save.savedAt } : {}) };
  }
  try {
    await clearRun(storage, rules);
  } catch {
    // Nothing more to do; the next save overwrites it.
  }
  return { status: 'discarded' };
}

/** Records a finished run in the profile and deletes its run save. Returns the newly discovered scenes. */
export async function finishRun(
  storage: KeyValueStorage,
  rules: Rules,
  result: RunResult,
): Promise<{ profile: Profile; newlyDiscovered: string[]; newlyUncharted: string[] }> {
  const profile = await loadProfile(storage);
  const applied = applyRunResult(rulerProfile(profile, rules.ruler), result);
  const updated = withRulerProfile(profile, rules.ruler, applied.profile);
  await saveProfile(storage, updated);
  await clearRun(storage, rules);
  return { profile: updated, newlyDiscovered: applied.newlyDiscovered, newlyUncharted: applied.newlyUncharted };
}
