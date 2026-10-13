import { getRuler, rulers } from '../../src/data/rulers';
import { achievementList, type RulerFacts } from '../../src/game/achievements';
import { emptyProfile } from '../../src/game/profile';
import { LOCKED, memoProfileView, type ProfileRuler, profileView } from '../../src/game/profileView';
import { profileRulers } from '../../src/ui/profile/profileRulers';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';
import { AT, completionist, midGame, newPlayer } from './profileFixtures';

const viewOf = (p: typeof emptyProfile, unlockAll = false) => profileView(p, profileRulers(p, unlockAll));

describe('profile selectors', () => {
  it('a new player: nothing reached, Elizabeth open, the others locked', () => {
    const v = viewOf(newPlayer);
    expect(v.identity).toEqual({ nickname: 'Chronicler', level: 1, rank: 'Novice', xpIntoLevel: 0, xpForLevel: 150, gold: 0 });
    expect(v.summary).toEqual({
      endingsReached: 0,
      endingsTotal: 47,
      matchedHistory: 0,
      outdidHistory: 0,
      rulers: 3,
      achievementsEarned: 0,
      achievementsTotal: 16,
    });
    expect(v.featured).toBeNull();
    expect(v.rarity.map((r) => [r.tier, r.reached, r.total])).toEqual([
      ['common', 0, 20],
      ['uncommon', 0, 12],
      ['rare', 0, 10],
      ['epic', 0, 3],
      ['legendary', 0, 2],
    ]);
    expect(v.rulers.map((r) => [r.rulerId, r.unlocked, r.unlockedByName ?? null])).toEqual([
      ['elizabeth-i', true, null],
      ['julius-caesar', false, 'Elizabeth I'],
      ['charles-i', false, 'Julius Caesar'],
    ]);
    expect(v.rulers[0]).toMatchObject({ runs: 0, bestMatched: null, bestResult: null, endingsReached: 0, chroniclePercent: 0 });
  });

  it('a mid-game player: every number', () => {
    const v = viewOf(midGame);
    expect(v.identity).toMatchObject({ level: 4, rank: 'Novice', xpIntoLevel: 1000 - 675, xpForLevel: 375, gold: 140 });
    expect(v.summary).toEqual({
      endingsReached: 3,
      endingsTotal: 47,
      matchedHistory: 1,
      outdidHistory: 0,
      rulers: 3,
      achievementsEarned: 3,
      achievementsTotal: 16,
    });
    expect(v.achievements.filter((a) => a.earned).map((a) => a.id)).toEqual(['first_reign', 'faithful_copy', 'elizabeth_history']);
    expect(v.rarity.map((r) => [r.tier, r.reached, r.total])).toEqual([
      ['common', 2, 20],
      ['uncommon', 1, 12],
      ['rare', 0, 10],
      ['epic', 0, 3],
      ['legendary', 0, 2],
    ]);
    const [liz, caesar, charles] = v.rulers;
    expect(liz).toMatchObject({
      runs: 6,
      bestMatched: 17,
      mainScenes: 17,
      bestResult: 'historical',
      endingsReached: 3,
      endingsTotal: 13,
      branchVisited: 0,
      branchTotal: 0,
      chroniclePercent: 71,
    });
    expect(caesar).toMatchObject({ unlocked: true, runs: 0, bestMatched: null, bestResult: null, endingsTotal: 17, branchTotal: 8 });
    expect(charles).toMatchObject({ unlocked: false, unlockedByName: 'Julius Caesar' });
    // The rarest earned achievement stands in until the player features one: matching every
    // decision (about 3 in 100,000 history-leaning reigns) beats Gloriana (3%) and a first reign.
    expect(v.featured).toMatchObject({ kind: 'rarest', achievement: { id: 'faithful_copy' }, earnedAt: AT });
  });

  it('a completionist: everything reached and earned', () => {
    const v = viewOf(completionist);
    expect(v.identity).toMatchObject({ level: 30, rank: 'Keeper of Ages' });
    expect(v.summary).toEqual({
      endingsReached: 47,
      endingsTotal: 47,
      matchedHistory: 3,
      outdidHistory: 3,
      rulers: 3,
      achievementsEarned: 16,
      achievementsTotal: 16,
    });
    for (const row of v.rarity) expect(row.reached).toBe(row.total);
    for (const r of v.rulers) {
      expect(r).toMatchObject({ unlocked: true, runs: 40, bestMatched: r.mainScenes, bestResult: 'outperformed', chroniclePercent: 100 });
      expect([r.endingsReached, r.branchVisited]).toEqual([r.endingsTotal, r.branchTotal]);
    }
    expect(v.rulers.map((r) => [r.branchTotal])).toEqual([[0], [8], [22]]);
  });

  it('remembers its last view for the same profile', () => {
    const select = memoProfileView();
    const input = profileRulers(midGame, false);
    expect(select(midGame, input)).toBe(select(midGame, input));
  });
});

describe('no spoilers in the view', () => {
  const v = viewOf(midGame);

  it('names only reached endings; the rest are unnamed', () => {
    const named = v.rarity.flatMap((r) => r.byRuler.flatMap((g) => g.endings)).filter((e) => e.title !== null);
    expect(named.map((e) => e.endingId).sort()).toEqual(['assassinated', 'gloriana', 'habsburg_queen']);
  });

  it('shows hidden achievements as ??? until earned', () => {
    for (const a of v.achievements.filter((x) => x.id.endsWith('_outdone'))) {
      expect([a.title, a.description]).toEqual([LOCKED, LOCKED]);
    }
    const done = viewOf(completionist).achievements.find((a) => a.id === 'elizabeth_outdone')!;
    expect(done.title).toBe('Better Than History: Elizabeth');
  });
});

describe('a new ruler', () => {
  it('appears in the rulers section, the rarity rows and the per-ruler achievements with no code change', () => {
    const facts: RulerFacts = {
      id: 'test-ruler',
      profileKey: 'test_ruler',
      shortName: 'Tester',
      endings: { won: 'historical', lost: 'fallen' },
      rarity: { won: { share: 0.02, tier: 'uncommon' }, lost: { share: 0.5, tier: 'common' } },
      mainScenes: 3,
      branchScenes: [],
      anyBranchShare: 0,
      allHistoricalShare: 0.1,
    };
    const extra: ProfileRuler = { facts, name: 'Test Ruler', unlocked: true, endingTitle: () => 'Won' };
    const input = [...profileRulers(midGame, false), extra];
    const v = profileView(midGame, input);
    expect(v.rulers.map((r) => r.rulerId)).toContain('test-ruler');
    expect(v.rarity.find((r) => r.tier === 'uncommon')!.byRuler.map((g) => g.rulerId)).toContain('test-ruler');
    expect(v.summary.endingsTotal).toBe(49);
    const ids = achievementList([...allRulerFacts, facts]).map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['tester_history', 'tester_outdone', 'tester_every_road']));
    expect(v.summary.achievementsTotal).toBe(19);
  });

  it('every registered ruler is on the profile', () => {
    expect(viewOf(newPlayer).rulers.map((r) => r.rulerId)).toEqual(rulers.map((r) => r.id));
    expect(getRuler('charles-i').ui.rulerCard?.image).toBe('KR1');
  });
});
