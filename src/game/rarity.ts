// Ending rarity: how often players reach each ending. Today it comes from each ruler's simulated
// rarity.json (`npm run rarity`); once there are real players' numbers, only `endingRarity` changes.

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Most common first. */
export const RARITY_TIERS: readonly RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/** The lowest share (of history-leaning runs) for each tier; anything below Epic's is Legendary. */
export const TIER_THRESHOLDS: Readonly<Record<Exclude<RarityTier, 'legendary'>, number>> = {
  common: 0.05,
  uncommon: 0.01,
  rare: 0.001,
  epic: 0.0001,
};

/** Endings reached in fewer simulated runs than this are classed Legendary whatever their share. */
export const MIN_RUNS_FOR_SHARE = 10;

export interface EndingRarity {
  /** Share of history-leaning runs reaching the ending (0..1). */
  readonly share: number;
  readonly tier: RarityTier;
  /** Simulated runs that reached it. */
  readonly runs: number;
}

/** A ruler's rarity.json. */
export interface RarityData {
  readonly runs: number;
  readonly endings: Readonly<Record<string, EndingRarity>>;
  readonly anyBranchShare: number;
  readonly allHistoricalShare: number;
}

/** The tier for a share, as the rarity script assigns it. */
export function tierFor(share: number, runs: number): RarityTier {
  if (runs < MIN_RUNS_FOR_SHARE) return 'legendary';
  for (const tier of ['common', 'uncommon', 'rare', 'epic'] as const) if (share >= TIER_THRESHOLDS[tier]) return tier;
  return 'legendary';
}

/** The one place the game looks up how rare an ending is. */
export function endingRarity(rarity: RarityData, endingId: string): EndingRarity | undefined {
  return rarity.endings[endingId];
}
