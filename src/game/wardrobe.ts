// The avatar wardrobe: which items the player owns, buying with gold, unlocking by achievement and
// wearing. Ownership is recorded once in the progression ledger. Pure TypeScript.
import avatarData from '../data/avatar.json';
import { type Achievement, achievementList, type RulerFacts } from './achievements';
import { type AvatarCatalogue, avatarCatalogue, type AvatarSlot, type Outfit } from './avatar';
import type { Profile } from './profile';

export interface WardrobeData {
  /** The achievement that unlocks each achievement item. */
  readonly unlockAchievements: Readonly<Record<string, string>>;
  /** Temporary prices, used only while the testing switch is on. */
  readonly devPrices: Readonly<Record<string, number>>;
  readonly backdrops: readonly { readonly id: string; readonly name: string; readonly colour?: string }[];
}

export const wardrobeData = avatarData as unknown as WardrobeData;

/** Whether the player owns an item: free items always; others once bought or unlocked. */
export function owns(profile: Profile, itemId: string, cat: AvatarCatalogue = avatarCatalogue): boolean {
  const item = cat.items[itemId];
  if (!item) return false;
  return item.unlock.type === 'free' || profile.progression.wardrobe[itemId] !== undefined;
}

/** An item's gold price: its catalogue price, or with the testing switch a dev price; null until set. */
export function priceOf(itemId: string, devPrices: boolean, cat: AvatarCatalogue = avatarCatalogue, data = wardrobeData): number | null {
  const unlock = cat.items[itemId]?.unlock;
  if (unlock?.type !== 'gold') return null;
  return unlock.price ?? (devPrices ? (data.devPrices[itemId] ?? null) : null);
}

export type BuyResult =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly reason: 'owned' | 'notForSale' | 'priceTBC' | 'notEnoughGold' };

/** Buys an item with gold, once: the gold is spent and the item recorded in the ledger. */
export function buyItem(profile: Profile, itemId: string, now: string, devPrices: boolean, cat: AvatarCatalogue = avatarCatalogue): BuyResult {
  if (owns(profile, itemId, cat)) return { ok: false, reason: 'owned' };
  if (cat.items[itemId]?.unlock.type !== 'gold') return { ok: false, reason: 'notForSale' };
  const price = priceOf(itemId, devPrices, cat);
  if (price === null) return { ok: false, reason: 'priceTBC' };
  if (profile.progression.gold < price) return { ok: false, reason: 'notEnoughGold' };
  return {
    ok: true,
    profile: {
      ...profile,
      progression: {
        ...profile.progression,
        gold: profile.progression.gold - price,
        wardrobe: { ...profile.progression.wardrobe, [itemId]: { at: now, by: 'gold', price } },
      },
    },
  };
}

/**
 * Records every achievement item whose achievement the player has earned and that isn't yet in the
 * ledger (run alongside awarding achievements, so older saves get theirs too).
 */
export function unlockAchievementItems(
  profile: Profile,
  now: string,
  cat: AvatarCatalogue = avatarCatalogue,
  data = wardrobeData,
): { profile: Profile; unlocked: string[] } {
  const earned = profile.progression.achievements;
  const unlocked = Object.entries(cat.items)
    .filter(([id, item]) => item.unlock.type === 'achievement' && !owns(profile, id, cat))
    .filter(([id]) => earned[data.unlockAchievements[id] ?? ''] !== undefined)
    .map(([id]) => id);
  if (unlocked.length === 0) return { profile, unlocked };
  const added = Object.fromEntries(unlocked.map((id) => [id, { at: now, by: 'achievement' as const }]));
  return {
    unlocked,
    profile: { ...profile, progression: { ...profile.progression, wardrobe: { ...profile.progression.wardrobe, ...added } } },
  };
}

/**
 * How an unowned achievement item is unlocked, as shown: its rule, unless the achievement is hidden
 * (and unearned), which would spoil it; then only that an achievement unlocks it.
 */
export function unlockText(
  itemId: string,
  profile: Profile,
  rulers: readonly RulerFacts[],
  cat: AvatarCatalogue = avatarCatalogue,
  data = wardrobeData,
): string | null {
  const unlock = cat.items[itemId]?.unlock;
  if (unlock?.type !== 'achievement') return null;
  const achievement: Achievement | undefined = achievementList(rulers).find((a) => a.id === data.unlockAchievements[itemId]);
  const secret = achievement === undefined || (achievement.hidden && profile.progression.achievements[achievement.id] === undefined);
  return secret ? null : unlock.rule;
}

/** The items worn in an outfit. */
export function outfitItems(outfit: Outfit): string[] {
  return (['head', 'top', 'bottoms'] as AvatarSlot[]).map((s) => outfit[s]).filter((x): x is string => x !== undefined);
}

/** Wears an outfit if the player owns everything in it (any base is free); otherwise no change. */
export function wearOutfit(profile: Profile, outfit: Outfit, cat: AvatarCatalogue = avatarCatalogue): Profile {
  if (!cat.bases[outfit.base] || !outfitItems(outfit).every((id) => owns(profile, id, cat))) return profile;
  return { ...profile, identity: { ...profile.identity, avatar: outfit } };
}
