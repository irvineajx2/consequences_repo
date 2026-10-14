// XP, levels, ranks and gold. Pure TypeScript; every number comes from src/data/progression.json.
import config from '../data/progression.json';
import type { RulerProfile, RunResult } from './profile';

export type Band = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ProgressionConfig {
  readonly xp: { readonly perDecision: number; readonly newEndingBonus: number };
  readonly rulerTier: Readonly<Record<string, number>>;
  readonly level: { readonly base: number; readonly step: number };
  readonly currency: {
    readonly name: string;
    readonly bands: Readonly<Record<Band, number>>;
    /** Ending band by ruler id (folder name), then ending id. */
    readonly endings: Readonly<Record<string, Readonly<Record<string, Band>>>>;
  };
  readonly ranks: readonly { readonly fromLevel: number; readonly title: string }[];
  readonly migration: { readonly xpPerEarlierRun: number };
}

export const progression = config as unknown as ProgressionConfig;

/** The player's account-wide progress, shared across rulers. */
export interface Progression {
  readonly totalXp: number;
  readonly gold: number;
  /** The last run ids rewarded (most recent last), so a run is never rewarded twice. */
  readonly awardedRunIds: readonly string[];
  /** Achievements earned, by id: when each was first earned (ISO timestamp). Recorded once. */
  readonly achievements: Readonly<Record<string, string>>;
  /** Avatar items owned, by id: bought with gold or unlocked by an achievement, recorded once. */
  readonly wardrobe: Readonly<Record<string, WardrobeEntry>>;
}

export interface WardrobeEntry {
  /** When it was bought or unlocked (ISO timestamp). */
  readonly at: string;
  readonly by: 'gold' | 'achievement';
  /** Gold paid, for a purchase. */
  readonly price?: number;
}

export const emptyProgression: Progression = { totalXp: 0, gold: 0, awardedRunIds: [], achievements: {}, wardrobe: {} };

/** How many awarded run ids are remembered. */
export const AWARDED_RUN_MEMORY = 100;

/** XP needed to go from `level` to the next: base + step x (level - 1). */
export function xpToNext(level: number, cfg: ProgressionConfig = progression): number {
  return cfg.level.base + cfg.level.step * (level - 1);
}

export interface LevelProgress {
  readonly level: number;
  /** XP earned since reaching this level. */
  readonly xpIntoLevel: number;
  /** XP this level needs in all to reach the next. */
  readonly xpForLevel: number;
}

export function levelFromTotalXp(totalXp: number, cfg: ProgressionConfig = progression): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpToNext(level, cfg)) {
    remaining -= xpToNext(level, cfg);
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForLevel: xpToNext(level, cfg) };
}

/** Total XP at which a level begins. */
export function xpAtLevel(level: number, cfg: ProgressionConfig = progression): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l, cfg);
  return total;
}

export function rankTitle(level: number, cfg: ProgressionConfig = progression): string {
  let title = cfg.ranks[0]?.title ?? '';
  for (const r of cfg.ranks) if (level >= r.fromLevel) title = r.title;
  return title;
}

export function rulerTier(rulerId: string, cfg: ProgressionConfig = progression): number {
  return cfg.rulerTier[rulerId] ?? 1;
}

/** An ending's rarity band, or undefined if the ruler's endings lack one. */
export function endingBand(rulerId: string, endingId: string, cfg: ProgressionConfig = progression): Band | undefined {
  return cfg.currency.endings[rulerId]?.[endingId];
}

/** Gold for reaching an ending the first time: band amount x ruler tier, rounded. */
export function endingGold(rulerId: string, endingId: string, cfg: ProgressionConfig = progression): number {
  const band = endingBand(rulerId, endingId, cfg);
  return band === undefined ? 0 : Math.round(cfg.currency.bands[band] * rulerTier(rulerId, cfg));
}

export interface RunBreakdown {
  /** Every decision the player took, auto and branch scenes included. */
  readonly decisions: number;
  readonly perDecision: number;
  /** decisions x perDecision, before the ruler tier. */
  readonly decisionXp: number;
  readonly newEnding: boolean;
  /** The new-ending bonus before the ruler tier (0 when not new). */
  readonly newEndingXp: number;
  readonly tier: number;
  /** round((decisionXp + newEndingXp) x tier). */
  readonly totalXp: number;
  /** Gold for a new ending (0 when not new). */
  readonly gold: number;
  readonly band: Band | undefined;
}

/** What a finished run earns. `rulerProfile` is the ruler's record before this run. */
export function scoreRun(
  rulerId: string,
  run: Pick<RunResult, 'ending' | 'decisions'>,
  rulerProfile: Pick<RulerProfile, 'endings'>,
  cfg: ProgressionConfig = progression,
): RunBreakdown {
  const decisions = run.decisions.length;
  const decisionXp = cfg.xp.perDecision * decisions;
  const newEnding = rulerProfile.endings[run.ending] === undefined;
  const newEndingXp = newEnding ? cfg.xp.newEndingBonus : 0;
  const tier = rulerTier(rulerId, cfg);
  return {
    decisions,
    perDecision: cfg.xp.perDecision,
    decisionXp,
    newEnding,
    newEndingXp,
    tier,
    totalXp: Math.round((decisionXp + newEndingXp) * tier),
    gold: newEnding ? endingGold(rulerId, run.ending, cfg) : 0,
    band: endingBand(rulerId, run.ending, cfg),
  };
}

export interface RewardOutcome {
  readonly progression: Progression;
  readonly breakdown: RunBreakdown;
  readonly levelBefore: number;
  readonly levelAfter: number;
  readonly rankBefore: string;
  readonly rankAfter: string;
  readonly totalXpBefore: number;
  /** False when this run id had already been rewarded: nothing changed. */
  readonly awarded: boolean;
}

/**
 * Applies a finished run's rewards to the account, once per run id. A repeat id changes nothing
 * (so a crash after awarding can never award twice).
 */
export function applyRunRewards(
  current: Progression,
  rulerId: string,
  runId: string,
  run: Pick<RunResult, 'ending' | 'decisions'>,
  rulerProfileBefore: Pick<RulerProfile, 'endings'>,
  cfg: ProgressionConfig = progression,
): RewardOutcome {
  const breakdown = scoreRun(rulerId, run, rulerProfileBefore, cfg);
  const levelBefore = levelFromTotalXp(current.totalXp, cfg).level;
  const already = current.awardedRunIds.includes(runId);
  const next: Progression = already
    ? current
    : {
        totalXp: current.totalXp + breakdown.totalXp,
        gold: current.gold + breakdown.gold,
        awardedRunIds: [...current.awardedRunIds, runId].slice(-AWARDED_RUN_MEMORY),
        achievements: current.achievements,
        wardrobe: current.wardrobe,
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

/**
 * Credits progress made before XP existed: each ending already reached earns its new-ending XP
 * and gold as if earned then, and each earlier completed run earns a flat amount (their lengths
 * were not recorded). `rulers` maps a ruler id (folder name) to its existing record.
 */
export function migrateProgression(
  rulers: Readonly<Record<string, Pick<RulerProfile, 'endings' | 'runsCompleted'>>>,
  cfg: ProgressionConfig = progression,
): Progression {
  let totalXp = 0;
  let gold = 0;
  for (const [rulerId, record] of Object.entries(rulers)) {
    const tier = rulerTier(rulerId, cfg);
    for (const endingId of Object.keys(record.endings)) {
      totalXp += Math.round(cfg.xp.newEndingBonus * tier);
      gold += endingGold(rulerId, endingId, cfg);
    }
    totalXp += record.runsCompleted * cfg.migration.xpPerEarlierRun;
  }
  return { totalXp, gold, awardedRunIds: [], achievements: {}, wardrobe: {} };
}

/** One stretch of the XP bar animation: within one level, from one fill to another. */
export interface BarSegment {
  readonly level: number;
  readonly from: number;
  readonly to: number;
  /** The bar filled this level: a level-up follows. */
  readonly levelUp: boolean;
}

/**
 * How the XP bar animates from one total to another: fill to the end of each level passed (each
 * followed by a level-up), then into the final level.
 */
export function xpBarSegments(totalBefore: number, totalAfter: number, cfg: ProgressionConfig = progression): BarSegment[] {
  const start = levelFromTotalXp(totalBefore, cfg);
  const end = levelFromTotalXp(totalAfter, cfg);
  const segments: BarSegment[] = [];
  let from = start.xpIntoLevel / start.xpForLevel;
  for (let level = start.level; level < end.level; level++) {
    segments.push({ level, from, to: 1, levelUp: true });
    from = 0;
  }
  segments.push({ level: end.level, from, to: end.xpIntoLevel / end.xpForLevel, levelUp: false });
  return segments;
}
