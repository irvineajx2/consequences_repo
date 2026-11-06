// What the Battles menu and the profile's Battles section show of each battle. Spoiler rules as for
// rulers: an ending, unlockable or plan the player hasn't reached shows as "???" (null here), and a
// locked battle shows only its card and how to unlock it. Pure TypeScript.
import type { Medal } from '../battle';
import type { BattleEntry } from '../data/battles';
import { bestMedal } from './battleRecord';
import { battleRecord, type Profile } from './profile';

export interface NamedEntry {
  readonly id: string;
  /** Null until reached: shown as "???". */
  readonly title: string | null;
  readonly reached: boolean;
}

export interface BattleView {
  readonly battleId: string;
  readonly title: string;
  readonly years: string;
  readonly card: string;
  readonly cardImage: string;
  readonly unlocked: boolean;
  /** The ruler whose run unlocks it (folder id). */
  readonly unlockRuler: string;
  readonly battlesCompleted: number;
  readonly bestMedal: Medal | null;
  readonly endings: readonly NamedEntry[];
  readonly unlockables: readonly NamedEntry[];
  /** Plans faced are revealed (named); the rest are "???". */
  readonly plans: readonly (NamedEntry & { readonly won: boolean })[];
}

export function battleView(entry: BattleEntry, profile: Profile, unlocked: boolean): BattleView {
  const { data } = entry.battle;
  const { text } = entry;
  const record = battleRecord(profile, entry.id);
  const named = (ids: readonly string[], reached: (id: string) => boolean, title: (id: string) => string | undefined) =>
    ids.map((id) => ({ id, reached: reached(id), title: reached(id) ? (title(id) ?? id) : null }));
  return {
    battleId: entry.id,
    title: text.battle.title,
    years: text.battle.years,
    card: text.battle.card,
    cardImage: data.images.card,
    unlocked,
    unlockRuler: data.ruler,
    battlesCompleted: record.battlesCompleted,
    bestMedal: bestMedal(record),
    endings: named(
      [...data.outcomes.final, ...data.outcomes.early],
      (id) => record.endings[id] !== undefined,
      (id) => text.endings[id]?.title,
    ),
    unlockables: named(data.unlockables, (id) => record.unlockables[id] !== undefined, (id) => text.unlockables[id]?.title),
    plans: named(data.plans, (id) => record.plansFaced.includes(id), (id) => text.plans[id]?.name).map((p) => ({
      ...p,
      won: record.plansWon.includes(p.id),
    })),
  };
}

export const countReached = (entries: readonly NamedEntry[]) => entries.filter((e) => e.reached).length;
