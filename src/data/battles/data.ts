// Every battle's data file, on its own (no game code), for the registry and for achievements.
import alesiaData from '../../../content/battles/alesia/battle.json';
import type { BattleData } from '../../battle/types';

export const battleDataList: readonly BattleData[] = [alesiaData as unknown as BattleData];
