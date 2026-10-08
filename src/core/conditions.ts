import type { Clause, Condition, ConditionValue, Operator } from './rules';
import { type GameState, type StateValue, valueOf } from './state';

function ordered(a: StateValue, b: ConditionValue, op: Operator): boolean {
  if (typeof a !== typeof b || Array.isArray(b)) {
    throw new Error(`Cannot compare ${JSON.stringify(a)} ${op} ${JSON.stringify(b)}`);
  }
  const x = a as number | string;
  const y = b as number | string;
  switch (op) {
    case '<':
      return x < y;
    case '<=':
      return x <= y;
    case '>':
      return x > y;
    default:
      return x >= y;
  }
}

export function testClause(state: GameState, [name, op, expected]: Clause): boolean {
  const actual = valueOf(state, name);
  switch (op) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case 'in':
      if (!Array.isArray(expected)) throw new Error(`"in" needs a list for "${name}"`);
      return (expected as readonly StateValue[]).includes(actual);
    case '<':
    case '<=':
    case '>':
    case '>=':
      return ordered(actual, expected, op);
    default:
      throw new Error(`Unknown operator "${String(op)}"`);
  }
}

/** True when every clause holds. A missing condition is always true. */
export function matches(state: GameState, condition: Condition | undefined): boolean {
  return (condition ?? []).every((clause) => testClause(state, clause));
}
