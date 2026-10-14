// Achievements: defined in src/data/achievements.json, earned from what the profile already records,
// and recorded once in the progression ledger with the date. Pure TypeScript.
import data from '../data/achievements.json';
import { type Profile, rulerProfile } from './profile';
import { levelFromTotalXp, progression as progressionConfig } from './progression';
import type { RarityTier } from './rarity';

export type AchievementCondition =
  | { readonly type: 'runsCompleted'; readonly atLeast: number }
  | { readonly type: 'branchScenesVisited'; readonly atLeast: number }
  | { readonly type: 'everyDecisionMatched' }
  | { readonly type: 'endingCategory'; readonly category: string }
  | { readonly type: 'everyEnding' }
  | { readonly type: 'endingRarity'; readonly tier: RarityTier }
  | { readonly type: 'rank'; readonly title: string }
  /** Endings from several rulers, reached in any runs and any order: one of each group's `anyOf`. */
  | { readonly type: 'endingsReached'; readonly all: readonly { readonly ruler: string; readonly anyOf: readonly string[] }[] };

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Title and description stay "???" until earned. */
  readonly hidden: boolean;
  readonly condition: AchievementCondition;
  /** For a per-ruler achievement, the ruler (folder id) it belongs to. */
  readonly rulerId?: string;
}

/** What achievements need to know about a ruler, from its data (not the player's record). */
export interface RulerFacts {
  /** Folder id, e.g. "elizabeth-i". */
  readonly id: string;
  /** The rules file's `ruler` id, which keys the player's record. */
  readonly profileKey: string;
  /** Display short name, e.g. "Elizabeth". */
  readonly shortName: string;
  /** Category of every ending (historical, outperformed, alternate, fallen_short, fallen). */
  readonly endings: Readonly<Record<string, string>>;
  /** Rarity of every ending. */
  readonly rarity: Readonly<Record<string, { readonly share: number; readonly tier: RarityTier }>>;
  /** Main-line (non-branch) scenes: the most decisions a run can match. */
  readonly mainScenes: number;
  readonly branchScenes: readonly string[];
  /** Share of history-leaning runs visiting any branch scene, and matching every decision. */
  readonly anyBranchShare: number;
  readonly allHistoricalShare: number;
}

interface RawAchievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly hidden?: boolean;
  readonly condition: AchievementCondition;
}
type RawEntry = RawAchievement | { readonly forEachRuler: RawAchievement };

/** A ruler's key in per-ruler achievement ids: its short name in lower case ("elizabeth"). */
export function achievementKey(shortName: string): string {
  return shortName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** The achievement list, in display order, with the per-ruler entries repeated for every ruler. */
export function achievementList(
  rulers: readonly RulerFacts[],
  entries: readonly RawEntry[] = (data as unknown as { achievements: RawEntry[] }).achievements,
): Achievement[] {
  return entries.flatMap((entry) => {
    if (!('forEachRuler' in entry)) return [{ ...entry, hidden: entry.hidden ?? false }];
    const t = entry.forEachRuler;
    return rulers.map((r) => {
      const fill = (s: string) => s.replace(/\{key\}/g, achievementKey(r.shortName)).replace(/\{name\}/g, r.shortName);
      return {
        id: fill(t.id),
        title: fill(t.title),
        description: fill(t.description),
        hidden: t.hidden ?? false,
        condition: t.condition,
        rulerId: r.id,
      };
    });
  });
}

/** Whether the player's record meets an achievement's condition. */
export function isMet(a: Achievement, profile: Profile, rulers: readonly RulerFacts[]): boolean {
  const records = rulers.map((r) => ({ facts: r, record: rulerProfile(profile, r.profileKey) }));
  const own = records.find((x) => x.facts.id === a.rulerId);
  const c = a.condition;
  switch (c.type) {
    case 'runsCompleted':
      return records.reduce((n, x) => n + x.record.runsCompleted, 0) >= c.atLeast;
    case 'branchScenesVisited':
      return records.reduce((n, x) => n + x.record.uncharted.length, 0) >= c.atLeast;
    case 'everyDecisionMatched':
      // Following every historical choice is the historical path, so a run that matched every
      // decision matched as many as the ruler has main scenes.
      return records.some((x) => x.facts.mainScenes > 0 && (x.record.bestMatch?.matched ?? 0) >= x.facts.mainScenes);
    case 'endingCategory':
      return own !== undefined && Object.keys(own.record.endings).some((e) => own.facts.endings[e] === c.category);
    case 'everyEnding':
      return own !== undefined && Object.keys(own.facts.endings).every((e) => own.record.endings[e] !== undefined);
    case 'endingRarity':
      return records.some((x) => Object.keys(x.record.endings).some((e) => x.facts.rarity[e]?.tier === c.tier));
    case 'rank': {
      const from = progressionConfig.ranks.find((r) => r.title === c.title)?.fromLevel;
      return from !== undefined && levelFromTotalXp(profile.progression.totalXp).level >= from;
    }
    case 'endingsReached':
      return c.all.every((group) => {
        const x = records.find((r) => r.facts.id === group.ruler);
        return x !== undefined && group.anyOf.some((e) => x.record.endings[e] !== undefined);
      });
  }
}

/**
 * Records every achievement the player now meets and has not yet earned, dated `now`. Earned
 * achievements are never removed or re-dated, so this is safe to run at any time (after a run, on
 * load) and backfills an older save in one go.
 */
export function awardAchievements(
  profile: Profile,
  rulers: readonly RulerFacts[],
  now: string,
): { profile: Profile; newlyEarned: Achievement[] } {
  const earned = profile.progression.achievements;
  const newlyEarned = achievementList(rulers).filter((a) => earned[a.id] === undefined && isMet(a, profile, rulers));
  if (newlyEarned.length === 0) return { profile, newlyEarned };
  return {
    newlyEarned,
    profile: {
      ...profile,
      progression: {
        ...profile.progression,
        achievements: { ...earned, ...Object.fromEntries(newlyEarned.map((a) => [a.id, now])) },
      },
    },
  };
}

/**
 * How rare an achievement is: the share of history-leaning runs that earn it, where a single run
 * can (the most achievable ruler's share for general ones); undefined where it takes many runs.
 */
export function achievementShare(a: Achievement, rulers: readonly RulerFacts[]): number | undefined {
  const c = a.condition;
  const own = rulers.find((r) => r.id === a.rulerId);
  const best = (f: (r: RulerFacts) => number) => (rulers.length ? Math.max(...rulers.map(f)) : undefined);
  switch (c.type) {
    case 'runsCompleted':
      return c.atLeast <= 1 ? 1 : undefined;
    case 'branchScenesVisited':
      return c.atLeast <= 1 ? best((r) => r.anyBranchShare) : undefined;
    case 'everyDecisionMatched':
      return best((r) => r.allHistoricalShare);
    case 'endingCategory':
      if (!own) return undefined;
      return Object.entries(own.endings)
        .filter(([, cat]) => cat === c.category)
        .reduce((sum, [e]) => sum + (own.rarity[e]?.share ?? 0), 0);
    case 'endingRarity':
      return best((r) => Object.values(r.rarity).filter((x) => x.tier === c.tier).reduce((s, x) => s + x.share, 0));
    case 'endingsReached': {
      // One ruler's endings: one run can earn it. Several rulers' (cross-ruler): it takes many runs.
      if (c.all.length !== 1) return undefined;
      const facts = rulers.find((r) => r.id === c.all[0].ruler);
      return facts ? c.all[0].anyOf.reduce((sum, e) => sum + (facts.rarity[e]?.share ?? 0), 0) : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Earned achievements, rarest first: those a single run can earn by their share (smaller is
 * rarer); those that take many runs count as rarer than any single-run one, the later in the list
 * the rarer.
 */
export function rarestFirst(earned: readonly Achievement[], rulers: readonly RulerFacts[]): Achievement[] {
  const order = new Map(achievementList(rulers).map((a, i) => [a.id, i]));
  const key = (a: Achievement) => achievementShare(a, rulers) ?? -1;
  return [...earned].sort((x, y) => key(x) - key(y) || (order.get(y.id) ?? 0) - (order.get(x.id) ?? 0));
}

export interface FeaturedAchievement {
  readonly achievement: Achievement;
  readonly earnedAt: string;
  /** "featured": the player chose it; "rarest": the game's default until they do. */
  readonly kind: 'featured' | 'rarest';
}

/**
 * The achievement on the profile banner: the player's choice if it is earned and still exists,
 * otherwise their rarest earned one; null with none earned.
 */
export function featuredAchievement(profile: Profile, rulers: readonly RulerFacts[]): FeaturedAchievement | null {
  const earnedAt = profile.progression.achievements;
  const list = achievementList(rulers);
  const chosen = list.find((a) => a.id === profile.identity.featuredAchievementId && earnedAt[a.id] !== undefined);
  if (chosen) return { achievement: chosen, earnedAt: earnedAt[chosen.id], kind: 'featured' };
  const [rarest] = rarestFirst(
    list.filter((a) => earnedAt[a.id] !== undefined),
    rulers,
  );
  return rarest ? { achievement: rarest, earnedAt: earnedAt[rarest.id], kind: 'rarest' } : null;
}

/** Features an earned achievement (replacing any other), or un-features with null. */
export function setFeatured(profile: Profile, id: string | null): Profile {
  if (id !== null && profile.progression.achievements[id] === undefined) return profile;
  const { featuredAchievementId: _old, ...rest } = profile.identity;
  return { ...profile, identity: id === null ? rest : { ...rest, featuredAchievementId: id } };
}
