import fs from 'fs';
import path from 'path';
import { achievementList } from '../../src/game/achievements';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';
import { tudorSkin } from '../../src/ui/skin/tudor';

const dir = path.join(__dirname, '../../assets/ui/skins/tudor/achievements');
const listed = JSON.parse(fs.readFileSync(path.join(dir, 'badges.json'), 'utf8'));
const all = [...achievementList(allRulerFacts).map((a) => a.id), 'badge_base'];
/** Badges whose art is still to come: they show the placeholder badge. */
const PENDING = [
  'cleopatra_history',
  'cleopatra_outdone',
  'cleopatra_every_road',
  'sea_dog',
  'royalist_victory',
  'love_older_than_rome',
  'beware_the_ides',
];
const ids = all.filter((id) => !PENDING.includes(id));

describe('achievement badges', () => {
  it('has art for every achievement but those pending, and the empty base, at @1x, @2x and @3x, listed in badges.json', () => {
    expect(Object.keys(listed.badges).sort()).toEqual([...ids].sort());
    for (const id of PENDING) expect(tudorSkin.profile.badges[id]).toBeUndefined();
    for (const id of ids) {
      expect(tudorSkin.profile.badges[id]).toBeDefined();
      for (const suffix of ['', '@2x', '@3x']) expect(fs.existsSync(path.join(dir, `${id}${suffix}.png`))).toBe(true);
      expect(listed.badges[id].file).toBe(`${id}.png`);
    }
    expect(listed.sizePt).toBe(56);
  });
});
