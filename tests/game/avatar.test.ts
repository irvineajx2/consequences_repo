import { avatarCatalogue as cat, DEFAULT_OUTFIT, equip, renderPlan } from '../../src/game/avatar';
import { loadProfile, recordAchievements, saveProfile } from '../../src/game/persistence';
import { emptyProfile, type Profile } from '../../src/game/profile';
import { memoryStorage } from '../../src/game/storage';
import { buyItem, owns, priceOf, unlockAchievementItems, unlockText, wearOutfit } from '../../src/game/wardrobe';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';

const AT = '2026-10-14T12:00:00.000Z';
const withGold = (gold: number): Profile => ({ ...emptyProfile, progression: { ...emptyProfile.progression, gold } });
const images = (plan: ReturnType<typeof renderPlan>) => plan.map((op) => op.image);

describe('the render plan (as render_reference.py)', () => {
  it('draws in ascending layer order, ties in the order added', () => {
    const plan = renderPlan({ base: 'b1', top: 'cavalier', bottoms: 'cavalier', head: 'cavalier' }, false);
    const layers = plan.map((op) => op.layer);
    expect(layers).toEqual([...layers].sort((a, b) => a - b));
    // The hat (-5) goes behind everything; the doublet (40) over the breeches (30).
    expect(images(plan)[0]).toBe('cavalier_head');
    expect(images(plan).indexOf('cavalier_top')).toBeGreaterThan(images(plan).indexOf('cavalier_bottoms'));
  });

  it("erases the body under a top and bottoms (with the base's waistband mask), and the arms", () => {
    const plan = renderPlan({ base: 'b2', top: 'courtier', bottoms: 'courtier' }, false);
    expect(plan.find((op) => op.image === 'b2_body')?.masks).toEqual(['courtier_top_bodyhide', 'courtier_bottoms_bodyhide', 'b2_bandhide']);
    expect(plan.find((op) => op.image === 'b2_arms')?.masks).toEqual(['courtier_top_armshide', 'courtier_bottoms_armshide']);
  });

  it("erases the hair (body and front hair) under a hat that hides it, skipping bases that need none", () => {
    const plan = renderPlan({ base: 'b2', head: 'courtier' }, false);
    expect(plan.find((op) => op.image === 'b2_body')?.masks).toEqual(['courtier_hairhide_b2']);
    expect(plan.find((op) => op.image === 'b2_front_hair')?.masks).toEqual(['courtier_hairhide_b2']);
    // b5's close-cropped hair needs no mask (null in the catalogue).
    expect(renderPlan({ base: 'b5', head: 'courtier' }, false).find((op) => op.image === 'b5_body')?.masks).toEqual([]);
  });

  it('adds the eyes-closed patch only when asked', () => {
    expect(images(renderPlan(DEFAULT_OUTFIT, false))).not.toContain('b1_eyes_closed');
    expect(images(renderPlan(DEFAULT_OUTFIT, true))).toContain('b1_eyes_closed');
  });

  it("shows a top's extension over lower bottoms from another set, cut just below their waist", () => {
    // Legionary bottoms (waist lower than the starter top's) from another item.
    const plan = renderPlan({ base: 'b4', top: 'starter', bottoms: 'legionary' }, false);
    const ext = plan.find((op) => op.image === 'starter_top_ext');
    expect(ext).toMatchObject({ toY: (cat.items.legionary.waist ?? 0) + 6 });
    // Not with its own bottoms.
    expect(images(renderPlan({ base: 'b4', top: 'starter', bottoms: 'starter' }, false))).not.toContain('starter_top_ext');
  });

  it("stops bottoms layered above the top under the top's sash", () => {
    const plan = renderPlan({ base: 'b1', top: 'cavalier', bottoms: 'courtlady' }, false);
    expect(plan.find((op) => op.image === 'courtlady_bottoms')).toMatchObject({ fromY: cat.items.cavalier.overlayTop });
  });

  it('draws the shirt strip only with bottoms and no top, and never a piece an item lacks', () => {
    expect(images(renderPlan({ base: 'b1', bottoms: 'starter' }, false))).toContain('starter_shirtstrip');
    expect(images(renderPlan({ base: 'b1', top: 'starter', bottoms: 'starter' }, false))).not.toContain('starter_shirtstrip');
    // The legionary has no shirt strip.
    expect(() => renderPlan({ base: 'b1', bottoms: 'legionary' }, false)).not.toThrow();
  });

  it('a full item replaces the bottoms', () => {
    const plan = renderPlan({ base: 'b3', top: 'senator', bottoms: 'starter', head: 'senator' }, false);
    expect(images(plan)).toContain('senator_full');
    expect(images(plan)).not.toContain('starter_bottoms');
  });
});

describe('equipping', () => {
  it('a full item clears the bottoms; bottoms clear a worn full item', () => {
    const toga = equip({ base: 'b1', top: 'starter', bottoms: 'starter' }, 'top', 'senator');
    expect(toga).toEqual({ base: 'b1', top: 'senator' });
    expect(equip(toga, 'bottoms', 'cavalier')).toEqual({ base: 'b1', bottoms: 'cavalier' });
    expect(equip({ base: 'b1', top: 'cavalier', head: 'trooper' }, 'head', undefined)).toEqual({ base: 'b1', top: 'cavalier' });
  });
});

describe('the wardrobe', () => {
  it('owns free items from the start, others only once bought or unlocked', () => {
    expect(owns(emptyProfile, 'starter')).toBe(true);
    expect(owns(emptyProfile, 'cavalier')).toBe(false);
    expect(owns(emptyProfile, 'mariner')).toBe(false);
  });

  it('blocks buying while prices are unset ("price TBC"), and uses dev prices only with the testing switch', () => {
    expect(priceOf('puritan', false)).toBeNull();
    expect(buyItem(withGold(500), 'puritan', AT, false)).toEqual({ ok: false, reason: 'priceTBC' });
    expect(priceOf('puritan', true)).toBe(25);
  });

  it('buys an item once with real gold, recorded in the ledger', () => {
    const bought = buyItem(withGold(40), 'puritan', AT, true);
    if (!bought.ok) throw new Error(bought.reason);
    expect(bought.profile.progression.gold).toBe(15);
    expect(bought.profile.progression.wardrobe.puritan).toEqual({ at: AT, by: 'gold', price: 25 });
    expect(owns(bought.profile, 'puritan')).toBe(true);
    expect(buyItem(bought.profile, 'puritan', AT, true)).toEqual({ ok: false, reason: 'owned' });
  });

  it("refuses what can't be bought: not enough gold, achievement items, free items", () => {
    expect(buyItem(withGold(10), 'puritan', AT, true)).toEqual({ ok: false, reason: 'notEnoughGold' });
    expect(buyItem(withGold(999), 'mariner', AT, true)).toEqual({ ok: false, reason: 'notForSale' });
    expect(buyItem(withGold(999), 'starter', AT, true)).toEqual({ ok: false, reason: 'owned' });
  });

  it("unlocks achievement items once their achievement is earned, once", () => {
    const earned = { ...emptyProfile, progression: { ...emptyProfile.progression, achievements: { sea_dog: AT } } };
    const first = unlockAchievementItems(earned, AT);
    expect(first.unlocked).toEqual(['mariner']);
    expect(first.profile.progression.wardrobe.mariner).toEqual({ at: AT, by: 'achievement' });
    expect(unlockAchievementItems(first.profile, AT).unlocked).toEqual([]);
  });

  it('records achievement unlocks alongside the achievements (and backfills older saves)', async () => {
    const elizabethGloriana = {
      ...emptyProfile,
      rulers: { elizabeth_i: { discovered: [], endings: { gloriana: { firstReached: AT, timesReached: 1 } }, runsCompleted: 1, uncharted: [] } },
    };
    const storage = memoryStorage();
    await saveProfile(storage, elizabethGloriana);
    await recordAchievements(storage, allRulerFacts, AT);
    const after = await loadProfile(storage);
    expect(after.progression.achievements.sea_dog).toBe(AT);
    expect(owns(after, 'mariner')).toBe(true);
    expect(owns(after, 'trooper')).toBe(false);
  });

  it('shows an unlock rule only when its achievement is visible', () => {
    expect(unlockText('mariner', emptyProfile, allRulerFacts)).toBe('Reach an Elizabeth ending at sea');
    expect(unlockText('trooper', emptyProfile, allRulerFacts)).toBe('Win a battle as Charles');
    expect(unlockText('cavalier', emptyProfile, allRulerFacts)).toBeNull();
  });

  it('wears an outfit only when everything in it is owned, and keeps it across a restart', async () => {
    const trial = { base: 'b2', top: 'cavalier', bottoms: 'starter' };
    expect(wearOutfit(emptyProfile, trial)).toBe(emptyProfile);
    const bought = buyItem(withGold(100), 'puritan', AT, true);
    if (!bought.ok) throw new Error(bought.reason);
    const dressed = wearOutfit(bought.profile, { base: 'b6', head: 'puritan', top: 'puritan', bottoms: 'starter' });
    expect(dressed.identity.avatar).toEqual({ base: 'b6', head: 'puritan', top: 'puritan', bottoms: 'starter' });
    const storage = memoryStorage();
    await saveProfile(storage, dressed);
    const reopened = await loadProfile(storage);
    expect(reopened.identity.avatar).toEqual(dressed.identity.avatar);
    expect(reopened.progression.wardrobe.puritan).toMatchObject({ by: 'gold', price: 25 });
    expect(reopened.progression.gold).toBe(75);
  });
});
