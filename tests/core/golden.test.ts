import { flatten, replay } from '../../src/core';
import { goldenCases, rules } from './helpers';

describe('golden paths', () => {
  it('has all 218 cases', () => {
    expect(goldenCases).toHaveLength(218);
  });

  test.each(goldenCases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const { outcome, run } = replay(rules, c.choices);
    const expected = c.expected;

    expect(outcome.ending).toBe(expected.ending);
    expect(outcome.early).toBe(expected.early_finale);
    if (expected.score === null) {
      expect(outcome.score).toBeNull();
    } else {
      expect(outcome.score).not.toBeNull();
      expect(Math.abs((outcome.score as number) - expected.score)).toBeLessThanOrEqual(1e-9);
    }
    expect(flatten(run.state)).toEqual(expected.final_state);
    expect(run.history.decisions).toEqual(expected.decisions);
    expect(run.history.historicalMatches).toBe(expected.historical_matches);
  });
});

describe('historical path', () => {
  it('ends in gloriana with every decision historical', () => {
    const historical = goldenCases.find((c) => c.name === 'historical_path');
    expect(historical).toBeDefined();
    const { outcome, run } = replay(rules, historical!.choices);
    expect(outcome.ending).toBe('gloriana');
    expect(outcome.score).toBeCloseTo(120, 9);
    expect(outcome.early).toBe(false);
    expect(run.history.decisions).toHaveLength(17);
    expect(run.history.historicalMatches).toBe(17);
  });
});
