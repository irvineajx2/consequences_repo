// The rules features Charles I leans on, each on a tiny synthetic ruler (no real ruler's data).
import { flatten, loadRules, replay, type Rules } from '../../src/core';

/** A two-scene ruler; `overrides` replace any top-level part. */
function ruler(overrides: Record<string, unknown>): Rules {
  return loadRules({
    ruler: 'test',
    version: 1,
    meter_range: [0, 100],
    meters: { gold: 50, army: 50 },
    flags: { path: 'main', war: false, lied: false },
    failures: [],
    drift: [],
    events: {},
    beats: { b1: { image: 'B1' } },
    early_finale: null,
    finale: { terms: [{ var: 'gold', mult: 1 }], outcomes: [{ end: 'done' }], beats: [] },
    endings: {
      done: { category: 'fallen_short', image: 'X1' },
      won: { category: 'outperformed', image: 'X2' },
      broke: { category: 'fallen', image: 'X3' },
      fled: { category: 'alternate', image: 'X4' },
    },
    scenes: [
      { id: 's1', title: 'One', image: '1', options: [{ id: 'a', label: 'A', historical: true }, { id: 'b', label: 'B', historical: false, add: { gold: -40 }, set: { path: 'exile' } }] },
      { id: 's2', title: 'Two', image: '2', options: [{ id: 'a', label: 'A', historical: true }, { id: 'b', label: 'B', historical: false, add: { army: -50 } }] },
    ],
    ...overrides,
  });
}

describe('engine features used by Charles I and Cleopatra', () => {
  it('string flags: sets and tests a string-valued flag', () => {
    const r = ruler({});
    expect(flatten(replay(r, ['b', 'a']).run.state).path).toBe('exile');
  });

  it('"in" in a failure: ends only when the flag is one of the listed values', () => {
    const r = ruler({ failures: [{ if: [['gold', '<=', 10], ['path', 'in', ['exile', 'peace']]], end: 'broke' }] });
    const exiled = ruler({ failures: r.failures, scenes: [{ ...r.scenes[0], options: [{ id: 'b', label: 'B', historical: false, add: { gold: -45 }, set: { path: 'exile' } }] }, r.scenes[1]] });
    expect(replay(exiled, ['b']).outcome.ending).toBe('broke');
    const home = ruler({ failures: r.failures, scenes: [{ ...r.scenes[0], options: [{ id: 'b', label: 'B', historical: false, add: { gold: -45 } }] }, r.scenes[1]] });
    expect(replay(home, ['b', 'a']).outcome.ending).toBe('done');
  });

  it('failures with several conditions need all of them', () => {
    const r = ruler({ failures: [{ if: [['army', '<=', 0], ['war', '==', true]], end: 'broke' }] });
    // Army at 0 without a war is no failure.
    expect(replay(r, ['a', 'b']).outcome.ending).toBe('done');
    const atWar = ruler({ flags: { path: 'main', war: true, lied: false }, failures: r.failures });
    expect(replay(atWar, ['a', 'b']).outcome.ending).toBe('broke');
  });

  it('drift rules that set flags as well as add, each seeing the rules before it', () => {
    const r = ruler({
      flags: { path: 'main', war: false, lied: true },
      drift: [
        { if: [['lied', '==', false]], then: { add: { gold: -10 } } },
        { then: { set: { lied: false } } },
        { if: [['lied', '==', false]], then: { add: { army: 5 } } },
      ],
      scenes: [{ id: 's1', title: 'One', image: '1', drift_after: true, options: [{ id: 'a', label: 'A', historical: true }] }],
    });
    const state = flatten(replay(r, ['a']).run.state);
    expect([state.gold, state.lied, state.army]).toEqual([50, false, 55]);
  });

  it('finale outcomes decided by "if" alone, with no score threshold', () => {
    const r = ruler({
      finale: { terms: [{ var: 'gold', mult: 1 }], outcomes: [{ if: [['army', '>=', 50]], end: 'won' }, { end: 'done' }], beats: [] },
    });
    expect(replay(r, ['a', 'a']).outcome.ending).toBe('won');
    expect(replay(r, ['a', 'b']).outcome.ending).toBe('done');
  });

  it('a cond branch whose else is an ending', () => {
    const r = ruler({
      scenes: [
        { id: 's1', title: 'One', image: '1', options: [{ id: 'a', label: 'A', historical: true, cond: [{ if: [['gold', '>=', 60]], then: { add: { gold: 5 } }, else: { end: 'fled' } }] }] },
        ruler({}).scenes[1],
      ],
    });
    expect(replay(r, ['a']).outcome.ending).toBe('fled');
  });

  it('skipped scenes, including a run of them while a path is active', () => {
    const onlyMain = (id: string) => ({
      id, title: id, image: id,
      variants: [{ if: [['path', '==', 'main']], options: [{ id: 'a', label: 'A', historical: true }] }, { skip: true }],
    });
    const r = ruler({ scenes: [ruler({}).scenes[0], onlyMain('s2'), onlyMain('s3'), onlyMain('s4')] });
    const away = replay(r, ['b']);
    expect(away.run.history.decisions.map((d) => d.scene)).toEqual(['s1']);
    expect(away.outcome.ending).toBe('done');
    expect(replay(r, ['a', 'a', 'a', 'a']).run.history.decisions).toHaveLength(4);
  });

  it('event branches with a score test, and the beat they play', () => {
    const r = ruler({
      events: {
        battle: {
          branches: [
            { score: { terms: [{ var: 'army', mult: 1 }, { var: 'gold', mult: 0.5 }], at_least: 70 }, beat: 'b1', then: { add: { gold: 10 } } },
            { end: 'broke' },
          ],
        },
      },
      scenes: [{ ...ruler({}).scenes[0], after: ['battle'] }, ruler({}).scenes[1]],
    });
    const won = replay(r, ['a', 'a']);
    expect(won.run.history.decisions[0].beats).toEqual(['b1']);
    expect(flatten(won.run.state).gold).toBe(60);
    expect(replay(r, ['b']).outcome.ending).toBe('broke');
  });

  it('several cond entries on one option run in order, an earlier one with no else', () => {
    const treat = (gold: number) =>
      ruler({
        meters: { gold, army: 50 },
        scenes: [
          {
            id: 's1',
            title: 'One',
            image: '1',
            options: [
              {
                id: 'treat',
                label: 'Treat',
                historical: true,
                cond: [
                  { if: [['gold', '<=', 40]], then: { end: 'won' } },
                  { if: [['army', '>=', 50]], then: { end: 'done' }, else: { end: 'broke' } },
                ],
              },
            ],
          },
        ],
      });
    // The first entry ends the run when it holds; otherwise the second decides.
    expect(replay(treat(30), ['treat']).outcome.ending).toBe('won');
    expect(replay(treat(60), ['treat']).outcome.ending).toBe('done');
  });

  it('two finale outcomes with different checklists can give the same ending', () => {
    const r = ruler({
      finale: {
        terms: [{ var: 'gold', mult: 1 }],
        outcomes: [
          { if: [['path', '==', 'exile'], ['gold', '>=', 90]], end: 'won' },
          { if: [['army', '>=', 50], ['gold', '>=', 50]], end: 'won' },
          { end: 'done' },
        ],
        beats: [],
      },
    });
    expect(replay(r, ['a', 'a']).outcome.ending).toBe('won'); // second route
    expect(replay(r, ['b', 'b']).outcome.ending).toBe('done'); // neither
  });

  it('several events after one scene, each firing its own beat, one also changing meters', () => {
    const r = ruler({
      beats: { b1: { image: 'B1' }, b2: { image: 'B2' } },
      events: {
        first: { branches: [{ if: [['gold', '>=', 50]], beat: 'b1', then: { add: { army: -10 } } }] },
        second: { branches: [{ if: [['army', '<=', 40]], beat: 'b2' }] },
      },
      scenes: [{ ...ruler({}).scenes[0], after: ['first', 'second'] }, ruler({}).scenes[1]],
    });
    const { run } = replay(r, ['a', 'a']);
    // The second event sees the first one's change (army 40), so both beats fire, in order.
    expect(run.history.decisions[0].beats).toEqual(['b1', 'b2']);
    expect(flatten(run.state).army).toBe(40);
  });
});
