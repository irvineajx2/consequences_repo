import { getRuler } from '../../src/data/rulers';
import {
  achievementList,
  awardAchievements,
  featuredAchievement,
  isMet,
  setFeatured,
} from '../../src/game/achievements';
import { finishRun, loadProfile, recordAchievements, saveProfile } from '../../src/game/persistence';
import { applyRunResult, emptyProfile, emptyRulerProfile, parseProfile, type Profile, withRulerProfile } from '../../src/game/profile';
import { progression as config, xpAtLevel } from '../../src/game/progression';
import { memoryStorage } from '../../src/game/storage';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';
import { fixtureRulers } from '../core/helpers';
import { AT, completionist, midGame } from './profileFixtures';

const LATER = '2026-11-01T09:00:00.000Z';
const list = achievementList(allRulerFacts);
const ids = list.map((a) => a.id);
const earnedIds = (p: Profile) => Object.keys(p.progression.achievements).sort();

describe('the achievement list', () => {
  it('has the first set, in order, with three per ruler generated from the ruler list, then the cross-ruler two', () => {
    expect(ids).toEqual([
      'first_reign',
      'uncharted',
      'off_the_map',
      'faithful_copy',
      'elizabeth_history',
      'caesar_history',
      'charles_history',
      'cleopatra_history',
      'elizabeth_outdone',
      'caesar_outdone',
      'charles_outdone',
      'cleopatra_outdone',
      'elizabeth_every_road',
      'caesar_every_road',
      'charles_every_road',
      'cleopatra_every_road',
      'legendary',
      'rank_chronicler',
      'rank_sage',
      'sea_dog',
      'royalist_victory',
      'love_older_than_rome',
      'beware_the_ides',
    ]);
    expect(list.find((a) => a.id === 'caesar_history')!.title).toBe('In Their Footsteps: Caesar');
    expect(list.filter((a) => a.hidden).map((a) => a.id)).toEqual([
      'elizabeth_outdone',
      'caesar_outdone',
      'charles_outdone',
      'cleopatra_outdone',
      'love_older_than_rome',
      'beware_the_ides',
    ]);
  });

  it("uses rank names that exist in progression.json", () => {
    const titles = config.ranks.map((r) => r.title);
    for (const a of list) if (a.condition.type === 'rank') expect(titles).toContain(a.condition.title);
  });
});

describe('earning achievements', () => {
  it('earns each condition exactly once, keeping the first date', () => {
    const first = awardAchievements(completionist, allRulerFacts, LATER);
    expect(first.newlyEarned).toEqual([]);
    expect(first.profile).toBe(completionist);
    expect(earnedIds(completionist)).toEqual([...ids].sort());
    for (const at of Object.values(completionist.progression.achievements)) expect(at).toBe(AT);
  });

  it('meets each condition only when its data says so', () => {
    const met = (p: Profile) => list.filter((a) => isMet(a, p, allRulerFacts)).map((a) => a.id);
    expect(met(emptyProfile)).toEqual([]);
    expect(met(midGame)).toEqual(['first_reign', 'faithful_copy', 'elizabeth_history', 'sea_dog']);
    const caesar = getRuler('julius-caesar').rules.ruler;
    const brancher = withRulerProfile(emptyProfile, caesar, {
      ...emptyRulerProfile,
      runsCompleted: 1,
      endings: { mob: { firstReached: AT, timesReached: 1 } },
      uncharted: ['b01'],
    });
    // mob is Caesar's Legendary ending.
    expect(met(brancher)).toEqual(['first_reign', 'uncharted', 'legendary']);
    const chronicler = { ...emptyProfile, progression: { ...emptyProfile.progression, totalXp: xpAtLevel(10) } };
    expect(met(chronicler)).toEqual(['rank_chronicler']);
    expect(met({ ...chronicler, progression: { ...chronicler.progression, totalXp: xpAtLevel(10) - 1 } })).toEqual([]);
  });

  it('backfills an existing (version 3) save on first load, all at once', async () => {
    const v3 = {
      version: 3,
      rulers: {
        elizabeth_i: {
          discovered: ['s01'],
          endings: { gloriana: { firstReached: AT, timesReached: 2 }, mistress: { firstReached: AT, timesReached: 1 } },
          runsCompleted: 9,
          uncharted: [],
        },
      },
      progression: { totalXp: 4100, gold: 230, awardedRunIds: [] },
    };
    const storage = memoryStorage({ 'consequences.profile.v2': JSON.stringify(v3) });
    const newly = await recordAchievements(storage, allRulerFacts, LATER);
    expect(newly.map((a) => a.id)).toEqual(['first_reign', 'elizabeth_history', 'elizabeth_outdone', 'rank_chronicler', 'sea_dog']);
    const after = await loadProfile(storage);
    expect(after.progression).toMatchObject({ totalXp: 4100, gold: 230 });
    expect(after.rulers.elizabeth_i.runsCompleted).toBe(9);
    // Faithful Copy can't be recovered: older saves never recorded their best match.
    expect(after.progression.achievements.faithful_copy).toBeUndefined();
    // A second load awards nothing more.
    expect(await recordAchievements(storage, allRulerFacts, LATER)).toEqual([]);
  });

  it('earns Faithful Copy from a run matching every decision, recorded when the run ends', async () => {
    const storage = memoryStorage();
    const elizabeth = getRuler('elizabeth-i');
    const historical = fixtureRulers().find((f) => f.id === 'elizabeth-i')!.cases.find((c) => c.name === 'historical_path')!;
    await finishRun(storage, elizabeth.rules, {
      runId: 'r1',
      ending: 'gloriana',
      score: 120,
      decisions: historical.expected.decisions,
      finishedAt: AT,
    });
    const newly = await recordAchievements(storage, allRulerFacts, AT);
    expect(newly.map((a) => a.id)).toEqual(['first_reign', 'faithful_copy', 'elizabeth_history', 'sea_dog']);
    expect((await loadProfile(storage)).rulers.elizabeth_i.bestMatch).toEqual({ matched: 17, finishedAt: AT });
  });

  it('keeps the best match across runs', () => {
    const decisions = fixtureRulers().find((f) => f.id === 'elizabeth-i')!.cases.find((c) => c.name === 'historical_path')!.expected.decisions;
    const best = applyRunResult(emptyRulerProfile, { ending: 'gloriana', score: 120, decisions, finishedAt: AT }).profile;
    const worse = applyRunResult(best, { ending: 'gloriana', score: 120, decisions: decisions.slice(0, 5), finishedAt: LATER }).profile;
    expect(worse.bestMatch).toEqual({ matched: 17, finishedAt: AT });
  });
});

describe('the featured achievement', () => {
  it('defaults to the rarest earned, labelled as the game\'s pick', () => {
    expect(featuredAchievement(midGame, allRulerFacts)).toMatchObject({ kind: 'rarest', achievement: { id: 'faithful_copy' } });
  });

  it('can be chosen, replaced and un-featured, only among earned achievements', () => {
    const chosen = setFeatured(midGame, 'elizabeth_history');
    expect(featuredAchievement(chosen, allRulerFacts)).toMatchObject({ kind: 'featured', achievement: { id: 'elizabeth_history' } });
    const replaced = setFeatured(chosen, 'first_reign');
    expect(replaced.identity.featuredAchievementId).toBe('first_reign');
    const cleared = setFeatured(replaced, null);
    expect(cleared.identity.featuredAchievementId).toBeUndefined();
    expect(featuredAchievement(cleared, allRulerFacts)?.kind).toBe('rarest');
    // Not earned: refused.
    expect(setFeatured(midGame, 'rank_sage')).toBe(midGame);
  });

  it('falls back to the default when saved data names an unearned or unknown achievement', () => {
    for (const id of ['rank_sage', 'no_such_achievement']) {
      const odd = { ...midGame, identity: { ...midGame.identity, nickname: 'X', featuredAchievementId: id } };
      expect(featuredAchievement(odd, allRulerFacts)).toMatchObject({ kind: 'rarest', achievement: { id: 'faithful_copy' } });
    }
  });

  it('shows the empty state with no achievements', () => {
    expect(featuredAchievement(emptyProfile, allRulerFacts)).toBeNull();
  });

  it('persists with the profile', async () => {
    const storage = memoryStorage();
    await saveProfile(storage, setFeatured(midGame, 'elizabeth_history'));
    const loaded = parseProfile(storage.contents.get('consequences.profile.v2') ?? null);
    expect(loaded.identity.featuredAchievementId).toBe('elizabeth_history');
  });
});
