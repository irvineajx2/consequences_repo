import { advance, applyEffect, choose, getScene, matches, start, startRun } from '../../src/core';
import { deepFreeze, rules } from './helpers';

const [lo, hi] = rules.meter_range;
const meter = Object.keys(rules.meters)[0];

describe('immutability', () => {
  it('choosing any option never changes the input state', () => {
    const pre = deepFreeze(JSON.parse(JSON.stringify(start(rules))));
    const snapshot = JSON.stringify(pre);
    for (const option of getScene(rules, 0, pre).options) {
      const { state } = choose(rules, 0, pre, option.id);
      expect(state).not.toBe(pre);
    }
    expect(JSON.stringify(pre)).toBe(snapshot);
  });

  it('advancing a run returns a new run and leaves the old one intact', () => {
    const run = deepFreeze(startRun(rules));
    const snapshot = JSON.stringify(run);
    const next = advance(rules, run, getScene(rules, run.sceneIndex, run.state).options[0].id);
    expect(next).not.toBe(run);
    expect(next.history.decisions).toHaveLength(1);
    expect(JSON.stringify(run)).toBe(snapshot);
  });
});

describe('clamp', () => {
  it('clamps an add below the minimum', () => {
    const state = applyEffect(start(rules), { add: { [meter]: -1000 } }, rules.meter_range);
    expect(state.meters[meter]).toBe(lo);
  });

  it('clamps an add above the maximum', () => {
    const state = applyEffect(start(rules), { add: { [meter]: 1000 } }, rules.meter_range);
    expect(state.meters[meter]).toBe(hi);
  });
});

describe('conditions', () => {
  const state = start(rules);
  const value = state.meters[meter];
  it.each([
    ['==', value, true],
    ['!=', value, false],
    ['<', value + 1, true],
    ['<=', value, true],
    ['>', value, false],
    ['>=', value + 1, false],
  ] as const)('%s %p is %p', (op, operand, expected) => {
    expect(matches(state, [[meter, op, operand]])).toBe(expected);
  });

  it('supports "in" on flags', () => {
    const [flag, flagValue] = Object.entries(state.flags).find(([, v]) => typeof v === 'string')!;
    expect(matches(state, [[flag, 'in', [flagValue as string, 'other']]])).toBe(true);
    expect(matches(state, [[flag, 'in', ['other']]])).toBe(false);
  });

  it('treats a missing condition as true', () => {
    expect(matches(state, undefined)).toBe(true);
  });
});
