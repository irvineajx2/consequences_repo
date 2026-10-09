import fs from 'fs';
import path from 'path';
import rulesJson from '../../src/data/rulers/elizabeth-i/rules.json';
import goldenJson from '../fixtures/elizabeth-i/golden_paths.json';
import { loadRules, type Decision, type Rules, type StateValue } from '../../src/core';

/** A fixture decision; older fixtures omit `branch`. */
type FixtureDecision = Omit<Decision, 'branch'> & { branch?: boolean };

interface FixtureCase {
  name: string;
  choices: string[];
  expected: Omit<GoldenCase['expected'], 'decisions'> & { decisions: FixtureDecision[] };
}

export interface GoldenCase {
  name: string;
  choices: string[];
  expected: {
    ending: string;
    score: number | null;
    early_finale: boolean;
    final_state: Record<string, StateValue>;
    decisions: Decision[];
    finale_beats: string[];
    historical_matches: number;
    /** Fixtures from before branch scenes omit this (and `branch` on decisions): read as 0 / false. */
    branch_decisions?: number;
  };
}

/** Fixtures as written, normalised so older ones (no branch fields) compare like newer ones. */
export function normaliseCase(c: FixtureCase): GoldenCase {
  const decisions = c.expected.decisions.map((d) => ({ ...d, branch: d.branch ?? false }));
  return {
    ...c,
    expected: {
      ...c.expected,
      decisions,
      branch_decisions: c.expected.branch_decisions ?? decisions.filter((d) => d.branch).length,
    },
  };
}

const fixturesDir = path.join(__dirname, '../fixtures');

/** Every ruler with fixtures under tests/fixtures/<ruler>/, with its rules and cases. */
export function fixtureRulers(): { id: string; rules: Rules; cases: GoldenCase[] }[] {
  return fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
      const rules = loadRules(read(path.join(__dirname, '../../src/data/rulers', e.name, 'rules.json')));
      const golden = read(path.join(fixturesDir, e.name, 'golden_paths.json')) as { cases: FixtureCase[] };
      return { id: e.name, rules, cases: golden.cases.map(normaliseCase) };
    });
}

export const rawRules: unknown = rulesJson;
export const rules = loadRules(rulesJson);
/** Elizabeth's golden cases (most tests use her). */
export const goldenCases = (goldenJson as unknown as { cases: FixtureCase[] }).cases.map(normaliseCase);

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
