// Fixture players for the profile tests: new, mid-game and completionist.
import { getRuler } from '../../src/data/rulers';
import { awardAchievements } from '../../src/game/achievements';
import { emptyProfile, type Profile, type RulerProfile } from '../../src/game/profile';
import { xpAtLevel } from '../../src/game/progression';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';

export const AT = '2026-10-13T12:00:00.000Z';

const reached = (ids: readonly string[]) =>
  Object.fromEntries(ids.map((id) => [id, { firstReached: AT, timesReached: 1 }]));

const mainScenes = (rulerId: string) => getRuler(rulerId).rules.scenes.filter((s) => !s.branch).map((s) => s.id);
const branchScenes = (rulerId: string) => getRuler(rulerId).rules.scenes.filter((s) => s.branch).map((s) => s.id);

/** Awards the achievements a profile qualifies for, as the app does on load. */
const withAchievements = (p: Profile) => awardAchievements(p, allRulerFacts, AT).profile;

export const newPlayer: Profile = emptyProfile;

/**
 * Six Elizabeth reigns: Gloriana (her historical ending), assassinated and the Habsburg marriage,
 * one reign matching all 17 decisions; 12 chronicle entries; 1,000 XP (level 4). Caesar is
 * unlocked but unplayed; Charles is locked.
 */
export const midGame: Profile = withAchievements({
  ...emptyProfile,
  rulers: {
    elizabeth_i: {
      discovered: mainScenes('elizabeth-i').slice(0, 12),
      endings: reached(['gloriana', 'assassinated', 'habsburg_queen']),
      runsCompleted: 6,
      uncharted: [],
      bestMatch: { matched: 17, finishedAt: AT },
    },
  },
  progression: { totalXp: 1000, gold: 140, awardedRunIds: [], achievements: {} },
});

/** Every ending, branch scene and chronicle entry of every ruler; level 30. */
export const completionist: Profile = withAchievements({
  ...emptyProfile,
  rulers: Object.fromEntries(
    ['elizabeth-i', 'julius-caesar', 'charles-i'].map((id) => {
      const ruler = getRuler(id);
      const record: RulerProfile = {
        discovered: mainScenes(id),
        endings: reached(Object.keys(ruler.rules.endings)),
        runsCompleted: 40,
        uncharted: branchScenes(id),
        bestMatch: { matched: mainScenes(id).length, finishedAt: AT },
      };
      return [ruler.rules.ruler, record];
    }),
  ),
  progression: { totalXp: xpAtLevel(30), gold: 2000, awardedRunIds: [], achievements: {} },
});
