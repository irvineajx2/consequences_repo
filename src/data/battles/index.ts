// The battle registry. Each battle's data and text live in content/battles/<id>/; its own move and
// scene effects in a module in src/battle. Adding a battle adds an entry here.
import alesiaText from '../../../content/battles/alesia/text.en.json';
import { type Battle, type BattleData, createAlesiaModule } from '../../battle';
import type { Profile } from '../../game/profile';
import { isUnlocked } from '../../game/unlock';
import { getRuler } from '../rulers';
import { battleDataList } from './data';

/** All player-facing text for a battle (text.en.json). */
export interface BattleText {
  readonly battle: {
    readonly title: string;
    readonly years: string;
    readonly commander: string;
    readonly card: string;
    readonly intro_caption: string;
    readonly intro: string;
    /** The commander's real result, for the result card. */
    readonly real_result: string;
  };
  readonly sectors: Readonly<Record<string, { readonly name: string; readonly desc: string }>>;
  readonly pools: Readonly<Record<string, string>>;
  readonly resources: Readonly<Record<string, string>>;
  readonly phases: Readonly<Record<string, { readonly title: string; readonly caption: string; readonly text: string }>>;
  readonly moves: Readonly<Record<string, { readonly label: string; readonly desc: string }>>;
  readonly results: Readonly<Record<string, string>>;
  readonly scenes: Readonly<
    Record<
      string,
      {
        readonly caption: string;
        readonly narration: string;
        readonly options: Readonly<Record<string, string>>;
        readonly consequences: Readonly<Record<string, string>>;
      }
    >
  >;
  readonly grades: Readonly<Record<string, string>>;
  readonly endings: Readonly<Record<string, { readonly title: string; readonly text: string }>>;
  readonly unlockables: Readonly<Record<string, { readonly title: string; readonly text: string }>>;
  readonly plans: Readonly<Record<string, { readonly name: string; readonly reveal: string; readonly clue: string }>>;
}

export interface BattleEntry<S = unknown> {
  readonly id: string;
  readonly battle: Battle<S>;
  readonly text: BattleText;
}

function entry<S>(data: BattleData, text: BattleText, module: (d: BattleData) => Battle<S>['module']): BattleEntry<S> {
  return { id: data.id, battle: { data, module: module(data) }, text };
}

export const battles: readonly BattleEntry[] = [
  entry(battleDataList[0], alesiaText as unknown as BattleText, createAlesiaModule) as BattleEntry,
];

export function getBattle(id: string): BattleEntry {
  const found = battles.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown battle "${id}"`);
  return found;
}

/**
 * Whether a battle is open: once the player has reached any ending as its ruler (in any run, before
 * battles existed included, since it reads the profile's record), or with the testing switch.
 */
export function battleUnlocked(entry: BattleEntry, profile: Profile, unlockAll = false): boolean {
  return isUnlocked(getRuler(entry.battle.data.ruler).rules.ruler, profile, unlockAll);
}
