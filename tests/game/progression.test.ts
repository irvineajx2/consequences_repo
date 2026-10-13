import { getRuler, rulers } from '../../src/data/rulers';
import { finishRun, loadProfile, loadRun, saveRun } from '../../src/game/persistence';
import { applyRunResult, emptyRulerProfile, parseProfile, rulerIdForProfileKey, rulerProfile } from '../../src/game/profile';
import {
  AWARDED_RUN_MEMORY,
  applyRunRewards,
  emptyProgression,
  endingBand,
  endingGold,
  levelFromTotalXp,
  migrateProgression,
  progression,
  rankTitle,
  scoreRun,
  xpBarSegments,
  xpToNext,
} from '../../src/game/progression';
import { memoryStorage, storageKeys } from '../../src/game/storage';
import { fixtureRulers } from '../core/helpers';

const fixtures = fixtureRulers();
const historical = (id: string) => fixtures.find((f) => f.id === id)!.cases.find((c) => c.name === 'historical_path')!;
const liz = historical('elizabeth-i');
const caesar = historical('julius-caesar');
const AT = '2026-10-12T12:00:00.000Z';

describe('levels and ranks', () => {
  it('needs base + step x (level - 1) XP per level: 150, 225, 300, 375', () => {
    expect([1, 2, 3, 4].map((l) => xpToNext(l))).toEqual([150, 225, 300, 375]);
  });

  it.each([
    [0, 1],
    [149, 1],
    [150, 2],
    [375, 3],
    [4050, 10],
    [15675, 20],
  ])('reaches level %p at %p XP', (xp, level) => {
    expect(levelFromTotalXp(xp).level).toBe(level);
  });

  it('reports progress into the current level', () => {
    expect(levelFromTotalXp(270)).toEqual({ level: 2, xpIntoLevel: 120, xpForLevel: 225 });
    expect(levelFromTotalXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForLevel: 150 });
  });

  it('has no cap', () => {
    expect(levelFromTotalXp(10_000_000).level).toBeGreaterThan(100);
  });

  it.each([
    [1, 'Novice'],
    [4, 'Novice'],
    [5, 'Scribe'],
    [10, 'Chronicler'],
    [15, 'Historian'],
    [20, 'Sage'],
    [29, 'Sage'],
    [30, 'Keeper of Ages'],
    [99, 'Keeper of Ages'],
  ])('titles level %p %p', (level, title) => {
    expect(rankTitle(level)).toBe(title);
  });
});

describe('run rewards (worked examples)', () => {
  it("Elizabeth's historical path, first time: 170 + 100 = 270 XP and 80 gold; from zero, level 2 with 120 of 225", () => {
    const b = scoreRun('elizabeth-i', liz.expected, emptyRulerProfile);
    expect(b).toMatchObject({ decisions: 17, decisionXp: 170, newEnding: true, newEndingXp: 100, tier: 1, totalXp: 270, gold: 80 });
    const r = applyRunRewards(emptyProgression, 'elizabeth-i', 'run-1', liz.expected, emptyRulerProfile);
    expect(levelFromTotalXp(r.progression.totalXp)).toEqual({ level: 2, xpIntoLevel: 120, xpForLevel: 225 });
    expect(r).toMatchObject({ levelBefore: 1, levelAfter: 2, rankBefore: 'Novice', rankAfter: 'Novice', awarded: true });
  });

  it('the same run again: 170 XP, 0 gold', () => {
    const reached = applyRunResult(emptyRulerProfile, { ...liz.expected, finishedAt: AT }).profile;
    const b = scoreRun('elizabeth-i', liz.expected, reached);
    expect(b).toMatchObject({ newEnding: false, newEndingXp: 0, totalXp: 170, gold: 0 });
  });

  it("Caesar's historical path, first time: (220 + 100) x 1.25 = 400 XP and 100 gold", () => {
    const b = scoreRun('julius-caesar', caesar.expected, emptyRulerProfile);
    expect(b).toMatchObject({ decisions: 22, decisionXp: 220, newEndingXp: 100, tier: 1.25, totalXp: 400, gold: 100 });
  });

  it('counts every decision, auto and branch scenes included', () => {
    const branched = fixtures
      .find((f) => f.id === 'julius-caesar')!
      .cases.find((c) => (c.expected.branch_decisions ?? 0) > 0)!;
    expect(scoreRun('julius-caesar', branched.expected, emptyRulerProfile).decisions).toBe(
      branched.expected.decisions.length,
    );
  });
});

describe('gold', () => {
  it('gives every ending of every ruler a band (a new ending without one fails this test)', () => {
    for (const ruler of rulers) {
      for (const id of Object.keys(ruler.rules.endings)) expect(endingBand(ruler.id, id)).toBeDefined();
      expect(Object.keys(progression.currency.endings[ruler.id]).sort()).toEqual(Object.keys(ruler.rules.endings).sort());
    }
  });

  it('caps what each ruler can pay: 740 for Elizabeth and 1,214 for Caesar', () => {
    const total = (id: string) =>
      Object.keys(getRuler(id).rules.endings).reduce((sum, e) => sum + endingGold(id, e), 0);
    expect(total('elizabeth-i')).toBe(740);
    expect(total('julius-caesar')).toBe(1214);
  });

  it('pays band x tier, rounded (a legendary Caesar ending is 188)', () => {
    expect(endingGold('julius-caesar', 'pater_patriae')).toBe(188);
    expect(endingGold('elizabeth-i', 'mistress')).toBe(150);
  });
});

describe('rewarding once per run', () => {
  it('ignores a repeated run id', () => {
    const once = applyRunRewards(emptyProgression, 'elizabeth-i', 'run-1', liz.expected, emptyRulerProfile);
    const twice = applyRunRewards(once.progression, 'elizabeth-i', 'run-1', liz.expected, emptyRulerProfile);
    expect(twice.awarded).toBe(false);
    expect(twice.progression).toBe(once.progression);
  });

  it(`remembers the last ${AWARDED_RUN_MEMORY} run ids`, () => {
    let p = emptyProgression;
    for (let i = 0; i < AWARDED_RUN_MEMORY + 5; i++) {
      p = applyRunRewards(p, 'elizabeth-i', `r${i}`, liz.expected, { endings: { gloriana: {} as never } }).progression;
    }
    expect(p.awardedRunIds).toHaveLength(AWARDED_RUN_MEMORY);
    expect(p.awardedRunIds[AWARDED_RUN_MEMORY - 1]).toBe(`r${AWARDED_RUN_MEMORY + 4}`);
    expect(p.totalXp).toBe(170 * (AWARDED_RUN_MEMORY + 5));
  });

  const rules = getRuler('elizabeth-i').rules;
  const result = { runId: 'run-7', ending: 'gloriana', score: 120, decisions: liz.expected.decisions, finishedAt: AT };

  it('records a run and its rewards once, even if recorded again', async () => {
    const storage = memoryStorage();
    const first = await finishRun(storage, rules, result);
    expect(first.rewards).toMatchObject({ awarded: true, breakdown: { totalXp: 270, gold: 80 } });
    const again = await finishRun(storage, rules, result);
    expect(again.rewards.awarded).toBe(false);
    const profile = await loadProfile(storage);
    expect(profile.progression).toMatchObject({ totalXp: 270, gold: 80, awardedRunIds: ['run-7'] });
    expect(rulerProfile(profile, rules.ruler).runsCompleted).toBe(1);
  });

  it('awards on next launch a run that finished before it was recorded (crash before awarding)', async () => {
    const storage = memoryStorage();
    await saveRun(storage, rules, { rulesVersion: rules.version, choices: liz.choices, runId: 'run-8' });
    expect(await loadRun(storage, rules)).toEqual({ status: 'recorded' });
    const profile = await loadProfile(storage);
    expect(profile.progression).toMatchObject({ totalXp: 270, gold: 80, awardedRunIds: ['run-8'] });
    expect(storage.contents.has(storageKeys.run(rules.ruler))).toBe(false);
    // Launching again finds nothing more to do.
    expect(await loadRun(storage, rules)).toEqual({ status: 'none' });
    expect((await loadProfile(storage)).progression.totalXp).toBe(270);
  });

  it('never awards twice when the app closed after recording but before clearing the save (crash after awarding)', async () => {
    const storage = memoryStorage();
    const save = { rulesVersion: rules.version, choices: liz.choices, runId: 'run-9' };
    await finishRun(storage, rules, { ...result, runId: 'run-9' });
    await saveRun(storage, rules, save); // the save survived the "crash"
    expect(await loadRun(storage, rules)).toEqual({ status: 'recorded' });
    const profile = await loadProfile(storage);
    expect(profile.progression).toMatchObject({ totalXp: 270, gold: 80 });
    expect(rulerProfile(profile, rules.ruler).runsCompleted).toBe(1);
    expect(storage.contents.has(storageKeys.run(rules.ruler))).toBe(false);
  });

  it('a run abandoned part-way earns nothing', async () => {
    const storage = memoryStorage();
    await saveRun(storage, rules, { rulesVersion: rules.version, choices: liz.choices.slice(0, 5), runId: 'run-10' });
    expect((await loadRun(storage, rules)).status).toBe('resumed');
    expect((await loadProfile(storage)).progression).toEqual(emptyProgression);
  });
});

describe('migration to version 3', () => {
  it('credits a version 2 profile: new-ending XP and gold for each ending reached, 120 XP per earlier run', async () => {
    const lizRecord = {
      discovered: ['s01'],
      endings: {
        gloriana: { firstReached: AT, timesReached: 2, bestScore: 120 },
        dudleys_wife: { firstReached: AT, timesReached: 1 },
      },
      runsCompleted: 3,
      uncharted: [],
    };
    const caesarRecord = { discovered: [], endings: { ides: { firstReached: AT, timesReached: 1 } }, runsCompleted: 1, uncharted: ['b01'] };
    const v2 = { version: 2, rulers: { elizabeth_i: lizRecord, julius_caesar: caesarRecord } };
    const profile = parseProfile(JSON.stringify(v2));
    // Elizabeth: 2 endings x 100 XP + 3 runs x 120; gold 80 (rare) + 20 (common).
    // Caesar: 1 ending x 125 XP + 1 run x 120; gold 100 (rare x 1.25).
    expect(profile.progression).toEqual({
      totalXp: 2 * 100 + 3 * 120 + 125 + 120,
      gold: 80 + 20 + 100,
      awardedRunIds: [],
      achievements: {},
    });
    expect(profile.rulers).toEqual(v2.rulers);
    // A sensible level straight away: 805 XP is level 4.
    expect(levelFromTotalXp(profile.progression.totalXp).level).toBe(4);

    const storage = memoryStorage({ [storageKeys.profile]: JSON.stringify(v2) });
    expect((await loadProfile(storage)).progression).toEqual(profile.progression);
  });

  it("keeps a version 3 profile's progress, as version 4 with no achievements and the default identity", () => {
    const v3 = { version: 3, rulers: {}, progression: { totalXp: 999, gold: 5, awardedRunIds: ['x'] } };
    expect(parseProfile(JSON.stringify(v3))).toEqual({
      version: 4,
      rulers: {},
      progression: { ...v3.progression, achievements: {} },
      identity: { nickname: 'Chronicler' },
    });
  });

  it('keeps a version 4 profile as stored, best match, achievements and identity included', () => {
    const v4 = {
      version: 4,
      rulers: {
        elizabeth_i: {
          discovered: ['s01'],
          endings: { gloriana: { firstReached: AT, timesReached: 1 } },
          runsCompleted: 2,
          uncharted: [],
          bestMatch: { matched: 17, finishedAt: AT },
        },
      },
      progression: { totalXp: 999, gold: 5, awardedRunIds: ['x'], achievements: { first_reign: AT } },
      identity: { nickname: 'Gloriana', featuredAchievementId: 'first_reign' },
    };
    expect(parseProfile(JSON.stringify(v4))).toEqual(v4);
  });

  it('gives an empty profile nothing', () => {
    expect(migrateProgression({})).toEqual(emptyProgression);
  });

  it("maps every registered ruler's profile key to its ruler id", () => {
    for (const ruler of rulers) expect(rulerIdForProfileKey(ruler.rules.ruler)).toBe(ruler.id);
  });
});

describe('XP bar animation', () => {
  it('fills within a level when no level is gained', () => {
    // 270 XP is level 2 with 120 of 225; 350 is still level 2, with 200.
    expect(xpBarSegments(270, 350)).toEqual([{ level: 2, from: 120 / 225, to: 200 / 225, levelUp: false }]);
    expect(xpBarSegments(150, 300)).toEqual([{ level: 2, from: 0, to: 150 / 225, levelUp: false }]);
  });

  it('fills to the end of each level passed, each followed by a level-up', () => {
    expect(xpBarSegments(0, 270)).toEqual([
      { level: 1, from: 0, to: 1, levelUp: true },
      { level: 2, from: 0, to: 120 / 225, levelUp: false },
    ]);
    const many = xpBarSegments(100, 1100);
    expect(many.map((s) => s.level)).toEqual([1, 2, 3, 4, 5]);
    expect(many.filter((s) => s.levelUp)).toHaveLength(4);
    expect(many[0].from).toBeCloseTo(100 / 150, 9);
  });
});
