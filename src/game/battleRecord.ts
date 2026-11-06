// What the profile keeps of each battle (endings, unlockables, plans faced and won, medals) and what a
// finished battle earns: XP per phase, gold for first-time endings and unlockables, and a one-off
// reward for each medal's first win. Pure TypeScript.
import type { BattleData, BattleEnd, Medal } from '../battle';
import type { EndingRecord } from './profile';
import {
  AWARDED_RUN_MEMORY,
  type Band,
  levelFromTotalXp,
  progression,
  type Progression,
  type ProgressionConfig,
  rankTitle,
  type RewardOutcome,
  type RunBreakdown,
} from './progression';

export const MEDALS: readonly Medal[] = ['gold', 'silver', 'bronze'];

export interface BattleRecord {
  readonly battlesCompleted: number;
  readonly endings: Readonly<Record<string, EndingRecord>>;
  /** Unlockable endings, by id: when each was first earned. */
  readonly unlockables: Readonly<Record<string, string>>;
  /** Hidden plans fought to the end (and so revealed), in the order first faced. */
  readonly plansFaced: readonly string[];
  /** Plans beaten (any medal), in the order first beaten. */
  readonly plansWon: readonly string[];
  /** Medals won, by medal: when each was first won (its one-off reward was paid then). */
  readonly medals: Readonly<Partial<Record<Medal, string>>>;
}

export const emptyBattleRecord: BattleRecord = {
  battlesCompleted: 0,
  endings: {},
  unlockables: {},
  plansFaced: [],
  plansWon: [],
  medals: {},
};

/** The medal an outcome wins, if any. */
export function medalOf(outcome: string): Medal | null {
  return (MEDALS as readonly string[]).includes(outcome) ? (outcome as Medal) : null;
}

/** The best medal won at a battle, or null. */
export function bestMedal(record: BattleRecord): Medal | null {
  return MEDALS.find((m) => record.medals[m] !== undefined) ?? null;
}

/** What a finished battle contributes to the profile. */
export interface BattleResult {
  readonly end: BattleEnd;
  readonly plan: string;
  /** Phases the player gave orders for (one that ended the battle included). */
  readonly phases: number;
  readonly finishedAt: string;
}

export function applyBattleResult(record: BattleRecord, result: BattleResult): BattleRecord {
  const { end, plan, finishedAt } = result;
  const previous = record.endings[end.outcome];
  const medal = medalOf(end.outcome);
  return {
    battlesCompleted: record.battlesCompleted + 1,
    endings: {
      ...record.endings,
      [end.outcome]: { firstReached: previous?.firstReached ?? finishedAt, timesReached: (previous?.timesReached ?? 0) + 1 },
    },
    unlockables: { ...Object.fromEntries(end.unlocks.map((u) => [u, finishedAt])), ...record.unlockables },
    plansFaced: record.plansFaced.includes(plan) ? record.plansFaced : [...record.plansFaced, plan],
    plansWon: medal === null || record.plansWon.includes(plan) ? record.plansWon : [...record.plansWon, plan],
    medals: medal === null || record.medals[medal] !== undefined ? record.medals : { ...record.medals, [medal]: finishedAt },
  };
}

/** A battle ending's or unlockable's gold band (provisional, in progression.json). */
export function battleBand(battleId: string, kind: 'endings' | 'unlockables', id: string, cfg: ProgressionConfig = progression): Band | undefined {
  return cfg.currency.battles?.[battleId]?.[kind]?.[id];
}

export interface GoldItem {
  readonly kind: 'ending' | 'unlockable' | 'medal';
  readonly id: string;
  readonly gold: number;
}

/** A battle's rewards, in the shape the rewards panel shows (a "decision" is a phase). */
export interface BattleBreakdown extends RunBreakdown {
  /** Where the gold came from: a first-time ending, first-time unlockables and a first medal. */
  readonly goldItems: readonly GoldItem[];
}

/**
 * What a finished battle earns, given the battle's record before it: XP per phase played at the
 * per-decision rate times the battle's tier, plus the first-time ending bonus; gold (band x tier) for
 * a first-time ending and each first-time unlockable; and each medal's one-off reward the first time.
 */
export function scoreBattle(
  data: BattleData,
  result: Pick<BattleResult, 'end' | 'phases'>,
  before: BattleRecord,
  cfg: ProgressionConfig = progression,
): BattleBreakdown {
  const { end } = result;
  const tier = data.tier;
  const decisionXp = cfg.xp.perDecision * result.phases;
  const newEnding = before.endings[end.outcome] === undefined;
  const newEndingXp = newEnding ? cfg.xp.newEndingBonus : 0;
  const bandGold = (band: Band | undefined) => (band === undefined ? 0 : Math.round(cfg.currency.bands[band] * tier));
  const items: GoldItem[] = [];
  if (newEnding) items.push({ kind: 'ending', id: end.outcome, gold: bandGold(battleBand(data.id, 'endings', end.outcome, cfg)) });
  for (const u of end.unlocks) {
    if (before.unlockables[u] === undefined) items.push({ kind: 'unlockable', id: u, gold: bandGold(battleBand(data.id, 'unlockables', u, cfg)) });
  }
  const medal = medalOf(end.outcome);
  if (medal !== null && before.medals[medal] === undefined) items.push({ kind: 'medal', id: medal, gold: data.economy.goldFirstMedal[medal] ?? 0 });
  const goldItems = items.filter((i) => i.gold > 0);
  return {
    decisions: result.phases,
    perDecision: cfg.xp.perDecision,
    decisionXp,
    newEnding,
    newEndingXp,
    tier,
    totalXp: Math.round((decisionXp + newEndingXp) * tier),
    gold: goldItems.reduce((sum, i) => sum + i.gold, 0),
    band: battleBand(data.id, 'endings', end.outcome, cfg),
    goldItems,
  };
}

export interface BattleRewardOutcome extends RewardOutcome {
  readonly breakdown: BattleBreakdown;
}

/** Applies a battle's rewards to the account once per battle id: a repeat id changes nothing. */
export function applyBattleRewards(
  current: Progression,
  runId: string,
  breakdown: BattleBreakdown,
  cfg: ProgressionConfig = progression,
): BattleRewardOutcome {
  const levelBefore = levelFromTotalXp(current.totalXp, cfg).level;
  const already = current.awardedRunIds.includes(runId);
  const next: Progression = already
    ? current
    : {
        ...current,
        totalXp: current.totalXp + breakdown.totalXp,
        gold: current.gold + breakdown.gold,
        awardedRunIds: [...current.awardedRunIds, runId].slice(-AWARDED_RUN_MEMORY),
      };
  const levelAfter = levelFromTotalXp(next.totalXp, cfg).level;
  return {
    progression: next,
    breakdown,
    levelBefore,
    levelAfter,
    rankBefore: rankTitle(levelBefore, cfg),
    rankAfter: rankTitle(levelAfter, cfg),
    totalXpBefore: current.totalXp,
    awarded: !already,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : []);

const dated = (value: unknown): Record<string, string> =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string')) : {};

/** Reads a stored battle record, keeping whatever is readable. */
export function parseBattleRecord(value: unknown): BattleRecord | null {
  if (!isRecord(value) || typeof value.battlesCompleted !== 'number') return null;
  const endings: Record<string, EndingRecord> = {};
  if (isRecord(value.endings)) {
    for (const [id, e] of Object.entries(value.endings)) {
      if (isRecord(e) && typeof e.firstReached === 'string' && typeof e.timesReached === 'number') {
        endings[id] = { firstReached: e.firstReached, timesReached: e.timesReached };
      }
    }
  }
  const medals = dated(value.medals);
  return {
    battlesCompleted: value.battlesCompleted,
    endings,
    unlockables: dated(value.unlockables),
    plansFaced: strings(value.plansFaced),
    plansWon: strings(value.plansWon),
    medals: Object.fromEntries(MEDALS.filter((m) => medals[m] !== undefined).map((m) => [m, medals[m]])),
  };
}
