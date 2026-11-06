import {
  type AlesiaState,
  type BattleRun,
  chooseScene,
  commitOrders,
  evenSteps,
  hashSeed,
  menPerBin,
  nextStep,
  type Orders,
  planForSeed,
  playStrategy,
  setBin,
  startBattle,
  stepCount,
  validOrders,
} from '../../src/battle';
import { parseBattleSave, resumeBattle, toBattleSave } from '../../src/game/battleSession';
import { alesia, fixtureFor, playSession } from './helpers';

const { battle } = alesia;
const { data } = battle;
const cohorts = data.pools.cohorts;
const cavalry = data.pools.cavalry;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe('sliders', () => {
  it('has ten cohort steps across five bins and five cavalry steps across three, as battle.json gives', () => {
    expect(stepCount(cohorts)).toBe(10);
    expect(stepCount(cavalry)).toBe(5);
    expect(evenSteps(cohorts)).toEqual([2, 2, 2, 2, 2]);
    expect(evenSteps(cavalry)).toEqual([1, 1, 3]);
  });

  it('always totals 100% in whole steps, whatever is set', () => {
    for (const pool of [cohorts, cavalry]) {
      let steps = evenSteps(pool);
      // Every bin to every value, from every state reached so far (deterministic sweep).
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < pool.bins.length; i++) {
          for (let v = -1; v <= stepCount(pool) + 1; v++) {
            steps = setBin(pool, steps, i, v);
            expect(sum(steps)).toBe(stepCount(pool));
            expect(steps.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
          }
        }
      }
    }
  });

  it('raises a bin from the reserve first, then from the largest other bin; lowering refills the reserve', () => {
    expect(setBin(cohorts, [2, 2, 2, 2, 2], 0, 4)).toEqual([4, 2, 2, 2, 0]);
    expect(setBin(cohorts, [4, 2, 2, 2, 0], 1, 4)).toEqual([2, 4, 2, 2, 0]);
    expect(setBin(cohorts, [2, 4, 2, 2, 0], 1, 1)).toEqual([2, 1, 2, 2, 3]);
    // The reserve is what is left: it isn't set directly.
    expect(setBin(cohorts, [2, 2, 2, 2, 2], 4, 9)).toEqual([2, 2, 2, 2, 2]);
    expect(setBin(cavalry, [1, 1, 3], 0, 5)).toEqual([5, 0, 0]);
  });

  it('keeps each bin its share when cohorts are lost: each step holds fewer men', () => {
    const steps = [3, 2, 1, 1, 3];
    const full = menPerBin(cohorts, 100, steps);
    const reduced = menPerBin(cohorts, 84, steps);
    expect(full).toEqual({ inner: 30, plain: 20, rea: 10, north: 10, reserve: 30 });
    expect(sum(Object.values(reduced))).toBeCloseTo(84, 9);
    for (const bin of cohorts.bins) expect(reduced[bin] / 84).toBeCloseTo(full[bin] / 100, 9);
    // In play: after losses the run's cohort pool shrinks and the same sliders commit fewer men.
    const played = playSession(fixtureFor('stalemate'));
    const later = played.run.phases.find((p) => (p.stateBefore as AlesiaState).coh < 100)!;
    expect((later.stateBefore as AlesiaState).coh).toBeLessThan(100);
  });

  it('rejects orders that break the rules', () => {
    const ok: Orders = { cohorts: [2, 2, 2, 2, 2], cavalry: [1, 1, 3], commander: 'camp', move: 'build' };
    expect(validOrders(data, 1, ok)).toBe(true);
    expect(validOrders(data, 1, { ...ok, cohorts: [2, 2, 2, 2, 3] })).toBe(false);
    expect(validOrders(data, 1, { ...ok, cavalry: [1, 1, 2.5] })).toBe(false);
    expect(validOrders(data, 1, { ...ok, commander: 'rome' })).toBe(false);
    expect(validOrders(data, 1, { ...ok, move: 'german' })).toBe(false);
    expect(() => commitOrders(battle, startBattle(battle, 'historical'), { ...ok, move: 'german' })).toThrow();
  });
});

describe('the hidden plan', () => {
  it('comes from the seed, the same every time, and every plan is reachable', () => {
    expect(planForSeed('abc', data.plans)).toBe(planForSeed('abc', data.plans));
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => planForSeed(`seed-${i}`, data.plans)));
    expect([...seen].sort()).toEqual([...data.plans].sort());
  });

  it('stays the same across save and resume, and the save never names it', () => {
    const fx = fixtureFor('silver');
    for (let upTo = 0; upTo <= 9; upTo++) {
      const partway = playSession(fx, 'r1', upTo);
      const json = JSON.stringify(toBattleSave(alesia, partway, '2026-11-06T10:00:00.000Z'));
      for (const plan of data.plans) expect(json).not.toContain(`"${plan}"`);
      const resumed = resumeBattle(alesia, parseBattleSave(json)!)!;
      expect(resumed.run.plan).toBe(fx.plan);
      expect(resumed.run).toEqual(partway.run);
    }
  });

  it("won't resume a save for other battle data, or with an illegal choice", () => {
    const partway = playSession(fixtureFor('silver'), 'r1', 3);
    const save = toBattleSave(alesia, partway);
    expect(resumeBattle(alesia, { ...save, dataVersion: save.dataVersion + 1 })).toBeNull();
    expect(resumeBattle(alesia, { ...save, actions: [...save.actions, { kind: 'scene', choice: 'nope' }] })).toBeNull();
    expect(parseBattleSave('{"version":1}')).toBeNull();
  });
});

describe('the decision scenes', () => {
  const steps = (fx = fixtureFor('silver')) => {
    const seen: string[] = [];
    let run: BattleRun<unknown> = startBattle(battle, fx.plan);
    for (;;) {
      const step = nextStep(battle, run);
      if (step.kind === 'finished') return seen;
      if (step.kind === 'scene') {
        seen.push(`${step.sceneId}:${step.when}:${run.phase}`);
        run = chooseScene(battle, run, fx.strategy.scenes[step.sceneId]);
      } else {
        seen.push(`orders:${step.phase}`);
        run = commitOrders(battle, run, fx.strategy.phases[String(step.phase)]);
      }
    }
  };

  it('come at their points: riders before phase 2, the Mandubii before 4, the crisis after phase 5 orders, the surrender after victory', () => {
    expect(steps()).toEqual([
      'orders:1',
      'riders:before:2',
      'orders:2',
      'orders:3',
      'mandubii:before:4',
      'orders:4',
      'orders:5',
      'crisis:during:5',
      'surrender:after:6',
    ]);
  });

  it('has no surrender without a victory', () => {
    expect(steps(fixtureFor('stalemate'))).not.toContainEqual(expect.stringMatching(/^surrender/));
  });
});

describe('early endings', () => {
  it.each(['trapped', 'army_breaks', 'siege_lifted', 'death'])('%s ends the battle early', (outcome) => {
    const fx = fixtureFor(outcome);
    const run = playStrategy(battle, fx.plan, fx.strategy);
    expect(run.end).toMatchObject({ outcome, early: true });
    expect(run.phases.length).toBeLessThanOrEqual(5);
    // The phase that ended it is recorded, for the report.
    expect(run.phases.length).toBeGreaterThan(0);
  });

  it('death only in the last phase, with the commander in a breached sector and morale low', () => {
    const run = playStrategy(battle, fixtureFor('death').plan, fixtureFor('death').strategy);
    const last = run.phases[run.phases.length - 1];
    expect(last.phase).toBe(5);
    expect(last.results[last.commander]).toBe('breach');
  });

  it('Gaul Rises Behind You: allies driven to zero end the battle', () => {
    // Allies down to 5; the inner wall left bare in phase 1 is breached (alone, so not trapped),
    // costing 5 allies.
    const start = startBattle(battle, 'historical');
    const run = { ...start, state: { ...(start.state as AlesiaState), allies: 5 } };
    const after = commitOrders(battle, run, { cohorts: [0, 0, 0, 0, 10], cavalry: [0, 0, 5], commander: 'camp', move: 'build' });
    expect(after.phases[0].results).toMatchObject({ inner: 'breach', rea: 'none', north: 'none' });
    expect(after.phases[0].results.plain).not.toBe('breach');
    expect(after.end).toEqual({ outcome: 'gaul_rises', early: true, unlocks: [] });
    expect((after.state as AlesiaState).allies).toBe(0);
  });

  it('a victory waits for the surrender before its unlockables are known', () => {
    const fx = fixtureFor('gold', 'throws_down_arms');
    let run: BattleRun<unknown> = startBattle(battle, fx.plan);
    for (let step = nextStep(battle, run); !(step.kind === 'scene' && step.when === 'after'); step = nextStep(battle, run)) {
      if (step.kind === 'finished') throw new Error('Ended without a surrender');
      run =
        step.kind === 'scene'
          ? chooseScene(battle, run, fx.strategy.scenes[step.sceneId])
          : commitOrders(battle, run, fx.strategy.phases[String(step.phase)]);
    }
    expect(run.pendingVictory).toBe('gold');
    expect(run.end).toBeNull();
    expect(chooseScene(battle, run, 'execute').end?.unlocks).not.toContain('throws_down_arms');
    expect(chooseScene(battle, run, 'triumph').end?.unlocks).toContain('throws_down_arms');
  });
});
