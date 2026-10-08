// The playable rulers: rules and text bundled together.
import { loadRules, type Rules } from '../../core';
import type { RulerText } from '../../game/text';
import elizabethRules from './elizabeth-i/rules.json';
import elizabethText from './elizabeth-i/text.en.json';

export interface Ruler {
  readonly id: string;
  readonly rules: Rules;
  readonly text: RulerText;
}

export const rulers: readonly Ruler[] = [
  { id: 'elizabeth-i', rules: loadRules(elizabethRules), text: elizabethText as RulerText },
];

export function getRuler(id: string | undefined): Ruler {
  return rulers.find((r) => r.id === id) ?? rulers[0];
}
