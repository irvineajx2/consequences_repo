// Everything the profile screen shows, derived from the stored profile and the rulers' data.
// Nothing here is stored. Unreached endings and unearned hidden achievements never carry a name,
// so the screen cannot spoil them. Pure TypeScript.
import {
  type Achievement,
  achievementList,
  type FeaturedAchievement,
  featuredAchievement,
  type RulerFacts,
} from './achievements';
import { type Profile, rulerProfile } from './profile';
import { levelFromTotalXp, rankTitle } from './progression';
import { RARITY_TIERS, type RarityTier } from './rarity';

/** A ruler as the profile sees it: its facts, display text, and whether the player may play it. */
export interface ProfileRuler {
  readonly facts: RulerFacts;
  readonly name: string;
  /** The ruler card's image id. */
  readonly cardImage?: string;
  readonly unlocked: boolean;
  /** Name of the ruler whose reign unlocks this one, when locked. */
  readonly unlockedByName?: string;
  /** An ending's display title; only ever asked for endings the player has reached. */
  readonly endingTitle: (endingId: string) => string;
}

/** Best ending categories, best first. */
export const RESULT_ORDER = ['outperformed', 'historical', 'alternate', 'fallen_short', 'fallen'] as const;

export interface IdentityView {
  readonly nickname: string;
  readonly level: number;
  readonly rank: string;
  readonly xpIntoLevel: number;
  readonly xpForLevel: number;
  readonly gold: number;
}

export interface SummaryView {
  readonly endingsReached: number;
  readonly endingsTotal: number;
  readonly matchedHistory: number;
  readonly outdidHistory: number;
  readonly rulers: number;
  readonly achievementsEarned: number;
  readonly achievementsTotal: number;
}

/** An ending in a rarity row: its title only when reached. */
export interface RarityEnding {
  readonly rulerId: string;
  readonly endingId: string;
  readonly title: string | null;
}

export interface RarityRowView {
  readonly tier: RarityTier;
  readonly reached: number;
  readonly total: number;
  /** By ruler, in release order; only rulers with endings in this tier. */
  readonly byRuler: readonly { readonly rulerId: string; readonly name: string; readonly endings: readonly RarityEnding[] }[];
}

export interface RulerCardView {
  readonly rulerId: string;
  readonly name: string;
  readonly cardImage?: string;
  readonly unlocked: boolean;
  readonly unlockedByName?: string;
  /** The rest are only meaningful when unlocked. */
  readonly runs: number;
  /** Null until a run has been recorded since best matches were kept. */
  readonly bestMatched: number | null;
  readonly mainScenes: number;
  readonly bestResult: (typeof RESULT_ORDER)[number] | null;
  readonly endingsReached: number;
  readonly endingsTotal: number;
  readonly branchVisited: number;
  readonly branchTotal: number;
  /** Chronicle entries unlocked, 0..100, rounded. */
  readonly chroniclePercent: number;
}

export interface AchievementView {
  readonly id: string;
  /** "???" for an unearned hidden achievement. */
  readonly title: string;
  readonly description: string;
  readonly earned: boolean;
  readonly earnedAt: string | null;
  readonly featured: boolean;
}

export interface ProfileView {
  readonly identity: IdentityView;
  readonly featured: FeaturedAchievement | null;
  readonly summary: SummaryView;
  readonly rarity: readonly RarityRowView[];
  readonly rulers: readonly RulerCardView[];
  readonly achievements: readonly AchievementView[];
}

export const LOCKED = '???';

export function profileView(profile: Profile, rulers: readonly ProfileRuler[]): ProfileView {
  const facts = rulers.map((r) => r.facts);
  const records = new Map(rulers.map((r) => [r.facts.id, rulerProfile(profile, r.facts.profileKey)]));
  const reached = (r: ProfileRuler, e: string) => records.get(r.facts.id)?.endings[e] !== undefined;
  const { level, xpIntoLevel, xpForLevel } = levelFromTotalXp(profile.progression.totalXp);

  const achievements = achievementList(facts);
  const featured = featuredAchievement(profile, facts);
  const earnedAt = profile.progression.achievements;
  const hasCategory = (r: ProfileRuler, category: string) =>
    Object.entries(r.facts.endings).some(([e, c]) => c === category && reached(r, e));

  const endingIds = (r: ProfileRuler) => Object.keys(r.facts.endings);
  return {
    identity: {
      nickname: profile.identity.nickname,
      level,
      rank: rankTitle(level),
      xpIntoLevel,
      xpForLevel,
      gold: profile.progression.gold,
    },
    featured,
    summary: {
      endingsReached: rulers.reduce((n, r) => n + endingIds(r).filter((e) => reached(r, e)).length, 0),
      endingsTotal: rulers.reduce((n, r) => n + endingIds(r).length, 0),
      matchedHistory: rulers.filter((r) => hasCategory(r, 'historical')).length,
      outdidHistory: rulers.filter((r) => hasCategory(r, 'outperformed')).length,
      rulers: rulers.length,
      achievementsEarned: achievements.filter((a) => earnedAt[a.id] !== undefined).length,
      achievementsTotal: achievements.length,
    },
    rarity: RARITY_TIERS.map((tier) => {
      const byRuler = rulers
        .map((r) => ({
          rulerId: r.facts.id,
          name: r.name,
          endings: endingIds(r)
            .filter((e) => r.facts.rarity[e]?.tier === tier)
            .map((e) => ({ rulerId: r.facts.id, endingId: e, title: reached(r, e) ? r.endingTitle(e) : null })),
        }))
        .filter((g) => g.endings.length > 0);
      const all = byRuler.flatMap((g) => g.endings);
      return { tier, reached: all.filter((e) => e.title !== null).length, total: all.length, byRuler };
    }),
    rulers: rulers.map((r) => {
      const record = records.get(r.facts.id)!;
      const categories = Object.keys(record.endings).map((e) => r.facts.endings[e]);
      return {
        rulerId: r.facts.id,
        name: r.name,
        ...(r.cardImage !== undefined ? { cardImage: r.cardImage } : {}),
        unlocked: r.unlocked,
        ...(r.unlockedByName !== undefined ? { unlockedByName: r.unlockedByName } : {}),
        runs: record.runsCompleted,
        bestMatched: record.bestMatch?.matched ?? null,
        mainScenes: r.facts.mainScenes,
        bestResult: RESULT_ORDER.find((c) => categories.includes(c)) ?? null,
        endingsReached: endingIds(r).filter((e) => reached(r, e)).length,
        endingsTotal: endingIds(r).length,
        branchVisited: record.uncharted.filter((s) => r.facts.branchScenes.includes(s)).length,
        branchTotal: r.facts.branchScenes.length,
        chroniclePercent: r.facts.mainScenes > 0 ? Math.round((record.discovered.length / r.facts.mainScenes) * 100) : 0,
      };
    }),
    achievements: achievements.map((a: Achievement) => {
      const at = earnedAt[a.id] ?? null;
      const secret = a.hidden && at === null;
      return {
        id: a.id,
        title: secret ? LOCKED : a.title,
        description: secret ? LOCKED : a.description,
        earned: at !== null,
        earnedAt: at,
        featured: featured?.kind === 'featured' && featured.achievement.id === a.id,
      };
    }),
  };
}

/** `profileView`, remembering its last answer: the same profile and rulers give the same object. */
export function memoProfileView(): (profile: Profile, rulers: readonly ProfileRuler[]) => ProfileView {
  let last: { profile: Profile; rulers: readonly ProfileRuler[]; view: ProfileView } | null = null;
  return (profile, rulers) => {
    if (last && last.profile === profile && last.rulers === rulers) return last.view;
    last = { profile, rulers, view: profileView(profile, rulers) };
    return last.view;
  };
}
