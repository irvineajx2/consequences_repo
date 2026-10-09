import { flatten, replay } from '../../src/core';
import { fixtureRulers, goldenCases, rules } from './helpers';

const rulers = fixtureRulers();
const EXPECTED_CASES: Record<string, number> = { 'elizabeth-i': 218, 'julius-caesar': 170 };

describe('golden paths', () => {
  it('finds fixtures for both rulers', () => {
    expect(rulers.map((r) => r.id).sort()).toEqual(['elizabeth-i', 'julius-caesar']);
  });

  describe.each(rulers.map((r) => [r.id, r] as const))('%s', (id, ruler) => {
    it(`has all ${EXPECTED_CASES[id]} cases`, () => {
      expect(ruler.cases).toHaveLength(EXPECTED_CASES[id]);
    });

    test.each(ruler.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
      const { outcome, run } = replay(ruler.rules, c.choices);
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
      expect(outcome.beats).toEqual(expected.finale_beats);
      expect(run.history.historicalMatches).toBe(expected.historical_matches);
      expect(run.history.branchDecisions).toBe(expected.branch_decisions);
    });
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
