// Reading and writing a battle in progress, and recording a finished battle once in the profile.
import type { BattleEntry } from '../data/battles';
import { applyBattleResult, applyBattleRewards, type BattleRewardOutcome, scoreBattle } from './battleRecord';
import { type BattleSession, parseBattleSave, phasesPlayed, resumeBattle, toBattleSave } from './battleSession';
import { loadProfile, saveProfile } from './persistence';
import { battleRecord, type Profile, withBattleRecord } from './profile';
import { type KeyValueStorage, storageKeys } from './storage';

export async function saveBattle(storage: KeyValueStorage, entry: BattleEntry, session: BattleSession, savedAt?: string): Promise<void> {
  await storage.setItem(storageKeys.battle(entry.id), JSON.stringify(toBattleSave(entry, session, savedAt)));
}

export async function clearBattle(storage: KeyValueStorage, entry: BattleEntry): Promise<void> {
  await storage.removeItem(storageKeys.battle(entry.id));
}

/** Whether a battle save exists (it may still fail to restore). */
export async function hasBattleSave(storage: KeyValueStorage, entry: BattleEntry): Promise<boolean> {
  try {
    return (await storage.getItem(storageKeys.battle(entry.id))) !== null;
  } catch {
    return false;
  }
}

/** The battle in progress, replayed against its plan; null (and the save deleted) if it can't be. */
export async function loadBattle(storage: KeyValueStorage, entry: BattleEntry): Promise<BattleSession | null> {
  let json: string | null;
  try {
    json = await storage.getItem(storageKeys.battle(entry.id));
  } catch {
    return null;
  }
  if (json === null) return null;
  const save = parseBattleSave(json);
  const session = save ? resumeBattle(entry, save) : null;
  if (session === null) await clearBattle(storage, entry).catch(() => {});
  return session;
}

export interface FinishedBattleRecord {
  readonly profile: Profile;
  readonly rewards: BattleRewardOutcome;
}

/**
 * Records a finished battle once per run id: its ending, unlockables, plan and medal in the battle's
 * record, and its XP and gold in the account. A battle already recorded changes nothing. Then
 * deletes the save.
 */
export async function finishBattle(
  storage: KeyValueStorage,
  entry: BattleEntry,
  session: BattleSession,
  finishedAt: string,
): Promise<FinishedBattleRecord> {
  const end = session.run.end;
  if (end === null) throw new Error('The battle has not finished');
  const profile = await loadProfile(storage);
  const before = battleRecord(profile, entry.id);
  const result = { end, plan: session.run.plan, phases: phasesPlayed(session), finishedAt };
  const rewards = applyBattleRewards(profile.progression, session.runId, scoreBattle(entry.battle.data, result, before));
  if (!rewards.awarded) {
    await clearBattle(storage, entry);
    return { profile, rewards };
  }
  const updated = { ...withBattleRecord(profile, entry.id, applyBattleResult(before, result)), progression: rewards.progression };
  // Saved before the battle save is cleared, so a crash in between never pays twice.
  await saveProfile(storage, updated);
  await clearBattle(storage, entry);
  return { profile: updated, rewards };
}
