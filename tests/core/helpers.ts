import rulesJson from '../../src/data/rulers/elizabeth-i/rules.json';
import goldenJson from '../fixtures/golden_paths.json';
import { loadRules, type Decision, type StateValue } from '../../src/core';

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
  };
}

export const rawRules: unknown = rulesJson;
export const rules = loadRules(rulesJson);
export const goldenCases = (goldenJson as { cases: GoldenCase[] }).cases;

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
