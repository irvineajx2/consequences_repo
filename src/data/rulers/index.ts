// The ruler registry: rules, text, presentation and images for each playable ruler. Adding a ruler
// means adding an entry here; every screen lists whatever is registered.
import type { ImageSourcePropType } from 'react-native';
import { loadRules, type Rules } from '../../core';
import type { Profile } from '../../game/profile';
import type { RulerUi } from '../../game/rulerUi';
import { isUnlocked } from '../../game/unlock';
import { normaliseText, type RawRulerText, type RulerText } from '../../game/text';
import { imageRegistries } from '../../ui/imageRegistry';
import elizabethRules from './elizabeth-i/rules.json';
import elizabethText from './elizabeth-i/text.en.json';
import elizabethUi from './elizabeth-i/ui.json';
import caesarRules from './julius-caesar/rules.json';
import caesarText from './julius-caesar/text.en.json';
import caesarUi from './julius-caesar/ui.json';

export interface Ruler {
  /** Folder name under src/data/rulers and assets/rulers. */
  readonly id: string;
  readonly rules: Rules;
  readonly text: RulerText;
  /** Presentation only: meters, prologue, eras, title backdrop and ruler card. */
  readonly ui: RulerUi;
  /** This ruler's images by id (missing ones show the placeholder). */
  readonly images: Readonly<Record<string, ImageSourcePropType>>;
  /** Locked until the player has reached any ending as this ruler. */
  readonly unlockedBy?: string;
}

function defineRuler(
  id: string,
  rulesJson: unknown,
  textJson: unknown,
  uiJson: unknown,
  unlockedBy?: string,
): Ruler {
  const rules = loadRules(rulesJson);
  return {
    id,
    rules,
    text: normaliseText(textJson as RawRulerText, rules),
    ui: uiJson as RulerUi,
    images: imageRegistries[id] ?? {},
    ...(unlockedBy !== undefined ? { unlockedBy } : {}),
  };
}

export const rulers: readonly Ruler[] = [
  defineRuler('elizabeth-i', elizabethRules, elizabethText, elizabethUi),
  defineRuler('julius-caesar', caesarRules, caesarText, caesarUi, 'elizabeth-i'),
];

export function getRuler(id: string | undefined): Ruler {
  return rulers.find((r) => r.id === id) ?? rulers[0];
}

/** Whether a ruler is open to play, given the profile (and the hidden testing switch). */
export function rulerUnlocked(ruler: Ruler, profile: Profile, unlockAll = false): boolean {
  const prerequisite = ruler.unlockedBy !== undefined ? getRuler(ruler.unlockedBy).rules.ruler : undefined;
  return isUnlocked(prerequisite, profile, unlockAll);
}
