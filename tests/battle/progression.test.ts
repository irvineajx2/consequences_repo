import { achievementList, isMet } from '../../src/game/achievements';
import { finishBattle, loadBattle, saveBattle } from '../../src/game/battlePersistence';
import { emptyBattleRecord, MEDALS, scoreBattle } from '../../src/game/battleRecord';
import { battleView, countReached } from '../../src/game/battleView';
import { battleUnlocked } from '../../src/data/battles';
import { getRuler } from '../../src/data/rulers';
import { loadProfile, recordAchievements, saveProfile } from '../../src/game/persistence';
import { emptyProfile, emptyRulerProfile, type Profile, withRulerProfile } from '../../src/game/profile';
import { progression } from '../../src/game/progression';
import { memoryStorage } from '../../src/game/storage';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';
import { alesia, fixtureFor, playSession } from './helpers';

const AT = '2026-11-06T12:00:00.000Z';
const { data } = alesia.battle;
const caesarKey = getRuler('julius-caesar').rules.ruler;

describe('unlocking Alesia', () => {
  it('opens with any Caesar ending (including ones reached before battles existed), and not without', () => {
    expect(battleUnlocked(alesia, emptyProfile)).toBe(false);
    const elizabethOnly = withRulerProfile(emptyProfile, getRuler('elizabeth-i').rules.ruler, {
      ...emptyRulerProfile,
      endings: { gloriana: { firstReached: AT, timesReached: 1 } },
      runsCompleted: 1,
    });
    expect(battleUnlocked(alesia, elizabethOnly)).toBe(false);
    // A version 5 save (before this task) with a Caesar ending: read from the stored record.
    const v5 = JSON.stringify({
      version: 5,
      rulers: { [caesarKey]: { discovered: [], endings: { ruined_debt: { firstReached: AT, timesReached: 1 } }, runsCompleted: 1 } },
      progression: { totalXp: 0, gold: 0, awardedRunIds: [] },
    });
    const storage = memoryStorage({ 'consequences.profile.v2': v5 });
    return loadProfile(storage).then((p) => expect(battleUnlocked(alesia, p)).toBe(true));
  });

  it('opens with the testing switch', () => {
    expect(battleUnlocked(alesia, emptyProfile, true)).toBe(true);
  });
});

describe('battle rewards', () => {
  it('pays XP per phase at the per-decision rate times the tier, plus the first-time ending bonus', () => {
    const session = playSession(fixtureFor('stalemate'));
    const breakdown = scoreBattle(data, { end: session.run.end!, phases: session.run.phases.length }, emptyBattleRecord);
    expect(data.tier).toBe(2);
    expect(breakdown.decisions).toBe(5);
    expect(breakdown.totalXp).toBe(Math.round((progression.xp.perDecision * 5 + progression.xp.newEndingBonus) * 2));
  });

  it('pays first-time ending, unlockable and medal gold once each, through the ledger, gold then silver then bronze', async () => {
    const storage = memoryStorage();
    const gold = await finishBattle(storage, alesia, playSession(fixtureFor('gold', 'iron_ring'), 'b1'), AT);
    const goldItems = gold.rewards.breakdown.goldItems;
    expect(goldItems).toContainEqual({ kind: 'medal', id: 'gold', gold: data.economy.goldFirstMedal.gold });
    expect(goldItems.map((i) => i.kind)).toEqual(expect.arrayContaining(['ending', 'unlockable', 'medal']));
    expect(gold.profile.progression.gold).toBe(gold.rewards.breakdown.gold);

    // The same battle again (same run id): nothing more.
    const again = await finishBattle(storage, alesia, playSession(fixtureFor('gold', 'iron_ring'), 'b1'), AT);
    expect(again.rewards.awarded).toBe(false);
    expect((await loadProfile(storage)).progression.gold).toBe(gold.rewards.breakdown.gold);

    // Another gold: no ending, medal or (already earned) unlockable gold, but XP.
    const gold2 = await finishBattle(storage, alesia, playSession(fixtureFor('gold', 'iron_ring'), 'b2'), AT);
    expect(gold2.rewards.breakdown.goldItems.filter((i) => i.kind !== 'unlockable')).toEqual([]);
    expect(gold2.rewards.breakdown.totalXp).toBeGreaterThan(0);

    // Silver and bronze after gold still pay their own medal rewards, once.
    const silver = await finishBattle(storage, alesia, playSession(fixtureFor('silver'), 'b3'), AT);
    expect(silver.rewards.breakdown.goldItems).toContainEqual({ kind: 'medal', id: 'silver', gold: data.economy.goldFirstMedal.silver });
    const bronze = await finishBattle(storage, alesia, playSession(fixtureFor('bronze'), 'b4'), AT);
    expect(bronze.rewards.breakdown.goldItems).toContainEqual({ kind: 'medal', id: 'bronze', gold: data.economy.goldFirstMedal.bronze });
    const bronze2 = await finishBattle(storage, alesia, playSession(fixtureFor('bronze'), 'b5'), AT);
    expect(bronze2.rewards.breakdown.goldItems.find((i) => i.kind === 'medal')).toBeUndefined();

    const record = (await loadProfile(storage)).battles.alesia;
    expect(record.battlesCompleted).toBe(5);
    expect(Object.keys(record.medals).sort()).toEqual([...MEDALS].sort());
    expect(record.plansFaced.length).toBeGreaterThan(0);
  });

  it('records a battle that ended early, its plan as faced but not won', async () => {
    const storage = memoryStorage();
    const fx = fixtureFor('trapped');
    const done = await finishBattle(storage, alesia, playSession(fx), AT);
    const record = done.profile.battles.alesia;
    expect(record.endings.trapped.timesReached).toBe(1);
    expect(record.plansFaced).toEqual([fx.plan]);
    expect(record.plansWon).toEqual([]);
    expect(done.rewards.breakdown.goldItems.find((i) => i.kind === 'medal')).toBeUndefined();
  });

  it('saves a battle in progress and clears it once recorded', async () => {
    const storage = memoryStorage();
    const fx = fixtureFor('silver');
    await saveBattle(storage, alesia, playSession(fx, 'b9', 4), AT);
    expect((await loadBattle(storage, alesia))?.run.plan).toBe(fx.plan);
    await finishBattle(storage, alesia, playSession(fx, 'b9'), AT);
    expect(await loadBattle(storage, alesia)).toBeNull();
  });
});

describe('battle achievements', () => {
  const list = achievementList(allRulerFacts);
  const met = (p: Profile) => list.filter((a) => isMet(a, p, allRulerFacts)).map((a) => a.id);

  it('First Command, Gold at Alesia, Every Plan and Alesia Complete, from the battle record', async () => {
    const storage = memoryStorage();
    await finishBattle(storage, alesia, playSession(fixtureFor('trapped'), 'a1'), AT);
    expect(met(await loadProfile(storage))).toEqual(['first_command']);
    await finishBattle(storage, alesia, playSession(fixtureFor('gold'), 'a2'), AT);
    expect(await recordAchievements(storage, allRulerFacts, AT)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'first_command' }), expect.objectContaining({ id: 'gold_at_alesia' })]),
    );
    const p = await loadProfile(storage);
    const everything = {
      ...p,
      battles: {
        alesia: { ...p.battles.alesia, plansWon: [...data.plans], unlockables: Object.fromEntries(data.unlockables.map((u) => [u, AT])) },
      },
    };
    expect(met(everything)).toEqual(expect.arrayContaining(['every_plan', 'alesia_complete']));
    // Every plan means a victory against each one, not just facing it.
    const facedOnly = { ...everything, battles: { alesia: { ...everything.battles.alesia, plansWon: [data.plans[0]] } } };
    expect(met(facedOnly)).not.toContain('every_plan');
  });

  it('keeps Alesia Complete hidden until earned', () => {
    expect(list.find((a) => a.id === 'alesia_complete')?.hidden).toBe(true);
  });
});

describe('spoilers', () => {
  it('names no unreached ending, unlockable or plan, in the menu or the profile', () => {
    const fresh = battleView(alesia, emptyProfile, true);
    expect([...fresh.endings, ...fresh.unlockables, ...fresh.plans].every((e) => e.title === null)).toBe(true);
    expect(fresh.bestMedal).toBeNull();
    const json = JSON.stringify(fresh);
    for (const e of Object.values(alesia.text.endings)) expect(json).not.toContain(e.title);
    for (const u of Object.values(alesia.text.unlockables)) expect(json).not.toContain(u.title);
    for (const p of Object.values(alesia.text.plans)) expect(json).not.toContain(p.name);
  });

  it('names what has been reached, and counts it', async () => {
    const storage = memoryStorage();
    await saveProfile(storage, emptyProfile);
    const fx = fixtureFor('silver', 'iron_ring');
    await finishBattle(storage, alesia, playSession(fx), AT);
    const v = battleView(alesia, await loadProfile(storage), true);
    expect(v.endings.find((e) => e.id === 'silver')?.title).toBe(alesia.text.endings.silver.title);
    expect(v.endings.find((e) => e.id === 'gold')?.title).toBeNull();
    expect(countReached(v.unlockables)).toBe(fx.unlocks.length);
    expect(v.plans.find((p) => p.id === fx.plan)).toMatchObject({ title: alesia.text.plans[fx.plan].name, won: true });
    expect(v.bestMedal).toBe('silver');
    expect(v.endings).toHaveLength(9);
    expect(v.unlockables).toHaveLength(7);
  });
});

