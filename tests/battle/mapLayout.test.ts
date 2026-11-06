import placeholder from '../../content/battles/alesia/map_sectors.placeholder.json';
import { battleIcons, battleImages, battleSectorFiles } from '../../src/ui/battle/battleArt';
import { BATTLEFIELD, fitMap, parseSectorMap, toScreen } from '../../src/ui/battle/mapLayout';
import { getImage, placeholderImage } from '../../src/ui/images';
import { alesia } from './helpers';

const { data } = alesia.battle;
const MAP = { width: 941, height: 1672 };

describe('sector positions', () => {
  it('the placeholder gives every sector and the camp a point on the map, roughly where the task puts them', () => {
    const map = parseSectorMap(placeholder);
    expect(map.placeholder).toBe(true);
    expect(Object.keys(map.sectors).sort()).toEqual([...data.sectors].sort());
    const { inner, plain, rea, north, camp } = map.sectors;
    // inner: centre; plain: left; rea: top left; north: top and right; camp: bottom right.
    expect(plain.anchor.x).toBeLessThan(inner.anchor.x);
    expect(rea.anchor.x).toBeLessThan(inner.anchor.x);
    expect(rea.anchor.y).toBeLessThan(inner.anchor.y);
    expect(north.anchor.x).toBeGreaterThan(inner.anchor.x);
    expect(camp.anchor.x).toBeGreaterThan(inner.anchor.x);
    expect(camp.anchor.y).toBeGreaterThan(inner.anchor.y);
    for (const s of Object.values(map.sectors)) {
      expect(s.anchor.y).toBeGreaterThanOrEqual(BATTLEFIELD.top);
      expect(s.anchor.y).toBeLessThanOrEqual(BATTLEFIELD.bottom);
    }
  });

  it("reads the art chat's file in other likely shapes: a list, {x, y} points, an outline without an anchor", () => {
    const map = parseSectorMap({
      sectors: [
        { id: 'inner', anchor: { x: 0.5, y: 0.3 } },
        { id: 'plain', outline: [[0.1, 0.4], [0.3, 0.4], [0.3, 0.6], [0.1, 0.6]] },
        { id: 'broken' },
      ],
    });
    expect(map.placeholder).toBe(false);
    expect(map.sectors.inner.anchor).toEqual({ x: 0.5, y: 0.3 });
    expect(map.sectors.plain.anchor.x).toBeCloseTo(0.2, 9);
    expect(map.sectors.plain.anchor.y).toBeCloseTo(0.5, 9);
    expect(map.sectors.broken).toBeUndefined();
    expect(parseSectorMap(null).sectors).toEqual({});
  });

  it('the app reads the generated file for each battle (the placeholder until the real one is added)', () => {
    expect(Object.keys(parseSectorMap(battleSectorFiles.alesia).sectors).sort()).toEqual([...data.sectors].sort());
  });
});

describe('fitting the map', () => {
  it('fits the whole battlefield between the header and the panel, centred across', () => {
    for (const [w, top, bottom] of [
      [360, 90, 330],
      [430, 110, 560],
      [768, 100, 700],
    ]) {
      const fit = fitMap(MAP, w, top, bottom);
      expect(fit.top + BATTLEFIELD.top * fit.height).toBeCloseTo(top, 6);
      expect(fit.top + BATTLEFIELD.bottom * fit.height).toBeCloseTo(bottom, 6);
      expect(fit.left + fit.width / 2).toBeCloseTo(w / 2, 6);
      expect(fit.width / fit.height).toBeCloseTo(MAP.width / MAP.height, 9);
    }
  });

  it('keeps markers inside the screen', () => {
    const fit = fitMap(MAP, 360, 90, 600);
    expect(toScreen(fit, { x: 0, y: 0.3 }, 360, 40).x).toBe(40);
    expect(toScreen(fit, { x: 1, y: 0.3 }, 360, 40).x).toBe(320);
  });
});

describe('battle art', () => {
  it("registers every image battle.json names, and runs with any missing (placeholder)", () => {
    const im = data.images;
    for (const id of [im.card, ...Object.values(im.maps), ...Object.values(im.scenes), ...Object.values(im.endings), ...Object.values(im.unlockables)]) {
      expect(battleImages.alesia[id]).toBeDefined();
      expect(getImage('alesia', id)).toBe(battleImages.alesia[id]);
    }
    expect(getImage('alesia', 'NOT_DRAWN')).toBe(placeholderImage);
  });

  it('has an icon for every move, medal, the commander and each sector state', () => {
    const moves = Object.values(data.phases).flatMap((p) => p.moves);
    const names = [...moves, 'medal_gold', 'medal_silver', 'medal_bronze', 'medal_none', 'commander', 'roman_sector', 'enemy_pressure', 'breach', 'held', 'strained'];
    for (const n of names) expect(battleIcons[n]).toBeDefined();
  });
});
