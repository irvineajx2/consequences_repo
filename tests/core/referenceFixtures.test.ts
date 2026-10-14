// Rulers balanced on a design tool's own engine (Charles I, Cleopatra) come with that tool's
// fixtures: the option chosen at every shown scene, and what the run must produce. The repo engine
// must agree on every one.
import fs from 'fs';
import path from 'path';
import { flatten, loadRules, replay } from '../../src/core';

interface ReferenceFixture {
  name: string;
  choices: string[];
  ending: string;
  finalMeters: Record<string, number>;
  finalPath: string;
  /** Cleopatra's fixtures also give her final patron. */
  finalPatron?: string;
  beats: string[];
}

const read = (p: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../..', p), 'utf8'));
const RULERS: [string, number, number][] = [
  // ruler, fixtures, endings
  ['charles-i', 1548, 17],
  ['cleopatra', 1552, 17],
];

describe.each(RULERS)("%s's reference fixtures", (rulerId, count, endings) => {
  const rules = loadRules(read(`src/data/rulers/${rulerId}/rules.json`));
  const { fixtures } = read(`tests/fixtures/${rulerId}/reference_fixtures.json`) as { fixtures: ReferenceFixture[] };

  it(`has all ${count}, covering all ${endings} endings`, () => {
    expect(fixtures).toHaveLength(count);
    expect(new Set(fixtures.map((f) => f.ending)).size).toBe(endings);
    expect(Object.keys(rules.endings)).toHaveLength(endings);
  });

  test.each(fixtures.map((f, i) => [`${i} ${f.name}`, f] as const))('%s', (_name, f) => {
    const { outcome, run } = replay(rules, f.choices);
    const state = flatten(run.state);
    expect(outcome.ending).toBe(f.ending);
    expect(Object.fromEntries(Object.keys(f.finalMeters).map((m) => [m, state[m]]))).toEqual(f.finalMeters);
    expect(state.path).toBe(f.finalPath);
    if (f.finalPatron !== undefined) expect(state.patron).toBe(f.finalPatron);
    expect([...run.history.decisions.flatMap((d) => d.beats), ...outcome.beats]).toEqual(f.beats);
  });
});
