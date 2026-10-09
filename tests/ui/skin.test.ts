import fs from 'fs';
import path from 'path';
import { fontAssets } from '../../src/ui/fonts';
import { textSizes } from '../../src/ui/theme';
import { tudorSkin } from '../../src/ui/skin/tudor';
import { isBalanceArt, meterImageNames, skinImageNames } from '../../src/ui/skin/types';

const skinDir = path.join(__dirname, '../../assets/ui/skins/tudor');
const tudorJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../docs/skins/tudor/tudor.skin.json'), 'utf8'),
);

describe('Tudor skin', () => {
  it('has every image it names, both registered and on disk', () => {
    const names = skinImageNames(tudorSkin);
    expect(names).toHaveLength(20);
    for (const name of names) {
      expect(tudorSkin.images[name]).toBeDefined();
      expect(fs.existsSync(path.join(skinDir, `${name}.png`))).toBe(true);
    }
  });

  it('registers no images it does not use', () => {
    expect(Object.keys(tudorSkin.images).sort()).toEqual(skinImageNames(tudorSkin).sort());
  });

  it('matches the values in tudor.skin.json', () => {
    const { images, meters, screen, ...values } = tudorSkin;
    const { note, ...json } = tudorJson;
    expect(images).toBeDefined();
    expect(meters).toBeDefined();
    expect(screen).toBeDefined();
    expect(note).toEqual(expect.any(String));
    expect(values).toEqual(json);
  });

  it('uses only fonts that are loaded at startup', () => {
    for (const family of Object.values(tudorSkin.fonts)) expect(Object.keys(fontAssets)).toContain(family);
  });
});

describe('Tudor meters', () => {
  const meterDir = path.join(skinDir, 'meters');
  const names = meterImageNames(tudorSkin.meters);

  it('maps the five visible meters to art', () => {
    expect(tudorSkin.meters.art).toEqual({
      tr: { full: 'treasury', empty: 'treasury_empty' },
      auth: { full: 'authority', empty: 'authority_empty' },
      navy: { full: 'navy', empty: 'navy_empty' },
      succ: { full: 'succession', empty: 'succession_empty' },
      rel: { marker: 'religion_church', left: 'religion_keys', right: 'religion_bible' },
    });
  });

  it('has every image it names, and every variant, at @1x, @2x and @3x', () => {
    expect(names).toHaveLength(23);
    for (const name of names) {
      for (const density of ['', '@2x', '@3x']) {
        expect(fs.existsSync(path.join(meterDir, `${name}${density}.png`))).toBe(true);
      }
      expect(tudorSkin.meters.images[name]).toBeDefined();
    }
    expect(Object.keys(tudorSkin.meters.images).sort()).toEqual([...names].sort());
  });

  it('has a size for every icon, glowing marker and track end', () => {
    for (const art of Object.values(tudorSkin.meters.art)) {
      const sized = isBalanceArt(art) ? [art.marker, art.left, art.right] : [art.full];
      for (const name of sized) expect(tudorSkin.meters.metrics[name]).toEqual({
        heightPt: expect.any(Number),
        aspect: expect.any(Number),
        effectPadPt: expect.any(Number),
      });
    }
  });

  it('no longer uses placeholder vector icons', () => {
    expect(JSON.stringify(tudorSkin.meters)).not.toMatch(/treasure-chest|circle-outline|iconSize/);
  });

  it('does not bundle the preview image', () => {
    expect(Object.keys(tudorSkin.meters.images)).not.toContain('_preview');
  });
});

describe('panel text sizes', () => {
  it('keeps every line height at least 1.3x its font size so wrapped text is never squashed', () => {
    for (const size of Object.values(textSizes)) {
      expect(size.lineHeight / size.fontSize).toBeGreaterThanOrEqual(1.3);
    }
  });
});
