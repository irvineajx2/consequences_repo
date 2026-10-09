// The ruler registry: rules, text and presentation for each playable ruler. Adding a ruler means
// adding an entry here; the screens list whatever is registered.
import { loadRules, type Rules } from '../../core';
import type { RulerUi } from '../../game/rulerUi';
import type { RulerText } from '../../game/text';
import elizabethRules from './elizabeth-i/rules.json';
import elizabethText from './elizabeth-i/text.en.json';
import elizabethUi from './elizabeth-i/ui.json';

export interface Ruler {
  readonly id: string;
  readonly rules: Rules;
  readonly text: RulerText;
  /** Presentation only: meters, prologue, eras, title backdrop and ruler card. */
  readonly ui: RulerUi;
}

export const rulers: readonly Ruler[] = [
  {
    id: 'elizabeth-i',
    rules: loadRules(elizabethRules),
    text: elizabethText as RulerText,
    ui: elizabethUi as RulerUi,
  },
];

export function getRuler(id: string | undefined): Ruler {
  return rulers.find((r) => r.id === id) ?? rulers[0];
}
