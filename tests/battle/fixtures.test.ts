import fixtureFile from '../../content/battles/alesia/fixtures.json';
import { type AlesiaState, playStrategy, type Strategy } from '../../src/battle';
import { getBattle } from '../../src/data/battles';

interface Fixture {
  readonly name: string;
  readonly plan: string;
  readonly strategy: Strategy;
  readonly outcome: string;
  readonly unlocks: readonly string[];
  readonly final: Readonly<Record<string, number | boolean>>;
}

const fixtures = (fixtureFile as unknown as { fixtures: Fixture[] }).fixtures;
const { battle } = getBattle('alesia');

describe('Alesia golden fixtures (tools/battle_sim/battle.py)', () => {
  it('has all 867', () => {
    expect(fixtures).toHaveLength(867);
  });

  test.each(fixtures.map((f) => [f.name, f] as const))('%s', (_name, fx) => {
    const run = playStrategy(battle, fx.plan, fx.strategy);
    expect(run.end?.outcome).toBe(fx.outcome);
    expect(run.end?.unlocks).toEqual([...fx.unlocks].sort());
    const state = run.state as AlesiaState;
    for (const [key, value] of Object.entries(fx.final)) {
      const actual = state[key as keyof AlesiaState];
      if (typeof value === 'number') expect(actual as number).toBeCloseTo(value, 9);
      else expect(actual).toBe(value);
    }
  });
});
