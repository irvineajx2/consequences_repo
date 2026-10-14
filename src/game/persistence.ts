// Reading and writing the profile and the run in progress, over any key-value store.
import type { Rules } from '../core';
import {
  applyRunResult,
  parseProfile,
  type Profile,
  rulerIdForProfileKey,
  rulerProfile,
  type RunResult,
  withRulerProfile,
} from './profile';
import { type Achievement, awardAchievements, type RulerFacts } from './achievements';
import { unlockAchievementItems } from './wardrobe';
import { applyRunRewards, type RewardOutcome } from './progression';
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
  | { readonly status: 'discarded' }
  /** The save held a run that had finished but was never recorded: it has been recorded now. */
  | { readonly status: 'recorded' };

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
  if (resumed && !resumed.ok && resumed.reason === 'finished') {
    // The app closed between the run ending and its rewards being recorded: record them now
    // (once only: a run already rewarded is just cleared).
    try {
      await finishRun(storage, rules, resultOf(resumed.session, new Date().toISOString()));
      return { status: 'recorded' };
    } catch {
      return { status: 'none' };
    }
  }
  try {
    await clearRun(storage, rules);
  } catch {
    // Nothing more to do; the next save overwrites it.
  }
  return { status: 'discarded' };
}

/** A finished session as a run result. */
export function resultOf(s: Pick<Session, 'run' | 'runId'>, finishedAt: string): RunResult & { readonly runId: string } {
  const outcome = s.run.outcome;
  if (outcome === null) throw new Error('The run has not finished');
  return {
    runId: s.runId,
    ending: outcome.ending,
    score: outcome.score,
    decisions: s.run.history.decisions,
    finishedAt,
  };
}

export interface FinishedRunRecord {
  readonly profile: Profile;
  readonly newlyDiscovered: string[];
  readonly newlyUncharted: string[];
  readonly rewards: RewardOutcome;
}

/**
 * Records a finished run once per run id: its discoveries and ending in the ruler's record, and its
 * XP and gold in the account. A run already recorded changes nothing (so a crash after recording
 * never awards twice). Then deletes the run save. Returns what this run earned.
 */
export async function finishRun(
  storage: KeyValueStorage,
  rules: Rules,
  result: RunResult & { readonly runId: string },
): Promise<FinishedRunRecord> {
  const profile = await loadProfile(storage);
  const before = rulerProfile(profile, rules.ruler);
  const rewards = applyRunRewards(profile.progression, rulerIdForProfileKey(rules.ruler), result.runId, result, before);
  if (!rewards.awarded) {
    await clearRun(storage, rules);
    return { profile, newlyDiscovered: [], newlyUncharted: [], rewards };
  }
  const applied = applyRunResult(before, result);
  const updated = { ...withRulerProfile(profile, rules.ruler, applied.profile), progression: rewards.progression };
  // The profile is saved before the run save is cleared: if the app closes in between, the next
  // launch finds the save, sees this run id already rewarded, and only clears it.
  await saveProfile(storage, updated);
  await clearRun(storage, rules);
  return {
    profile: updated,
    newlyDiscovered: applied.newlyDiscovered,
    newlyUncharted: applied.newlyUncharted,
    rewards,
  };
}

/**
 * Awards every achievement the stored profile now qualifies for (after a run, and on load, which
 * also backfills older saves), unlocks the avatar items those achievements open, and saves it.
 * Returns the achievements newly earned, in list order.
 */
export async function recordAchievements(
  storage: KeyValueStorage,
  rulers: readonly RulerFacts[],
  now: string,
): Promise<Achievement[]> {
  const before = await loadProfile(storage);
  const awarded = awardAchievements(before, rulers, now);
  const { profile, unlocked } = unlockAchievementItems(awarded.profile, now);
  if (awarded.newlyEarned.length > 0 || unlocked.length > 0) await saveProfile(storage, profile);
  return awarded.newlyEarned;
}

/** Applies a change to the stored profile (e.g. the nickname or featured achievement) and saves it. */
export async function updateProfile(storage: KeyValueStorage, change: (p: Profile) => Profile): Promise<Profile> {
  const next = change(await loadProfile(storage));
  await saveProfile(storage, next);
  return next;
}
