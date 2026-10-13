// Charles I's rules were balanced on a design tool's own engine. Its 1,548 fixtures give the option
// chosen at every shown scene and what the run must produce; the repo engine must agree on all of them.
import fs from 'fs';
import path from 'path';
import { flatten, loadRules, replay } from '../../src/core';

interface ReferenceFixture {
  name: string;
  choices: string[];
  ending: string;
  finalMeters: Record<string, number>;
  finalPath: string;
  beats: string[];
}

const read = (p: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../..', p), 'utf8'));
const rules = loadRules(read('src/data/rulers/charles-i/rules.json'));
const { fixtures } = read('tests/fixtures/charles-i/reference_fixtures.json') as { fixtures: ReferenceFixture[] };

describe("Charles I's reference fixtures", () => {
  it('has all 1,548, covering all 17 endings', () => {
    expect(fixtures).toHaveLength(1548);
    expect(new Set(fixtures.map((f) => f.ending)).size).toBe(17);
    expect(Object.keys(rules.endings)).toHaveLength(17);
  });

  test.each(fixtures.map((f, i) => [`${i} ${f.name}`, f] as const))('%s', (_name, f) => {
    const { outcome, run } = replay(rules, f.choices);
    const state = flatten(run.state);
    expect(outcome.ending).toBe(f.ending);
    expect(Object.fromEntries(Object.keys(f.finalMeters).map((m) => [m, state[m]]))).toEqual(f.finalMeters);
    expect(state.path).toBe(f.finalPath);
    expect([...run.history.decisions.flatMap((d) => d.beats), ...outcome.beats]).toEqual(f.beats);
  });
});
