// Every registered ruler's facts for achievements and the profile, built once.
import { rulerFacts, rulers } from '../../data/rulers';
import type { RulerFacts } from '../../game/achievements';

export const allRulerFacts: readonly RulerFacts[] = rulers.map(rulerFacts);
