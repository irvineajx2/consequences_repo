import fs from 'fs';
import path from 'path';
import { fontAssets } from '../../src/ui/fonts';
import { textSizes } from '../../src/ui/theme';
import { tudorSkin } from '../../src/ui/skin/tudor';
import { skinImageNames } from '../../src/ui/skin/types';

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
    const { images, ...values } = tudorSkin;
    const { note, ...json } = tudorJson;
    expect(images).toBeDefined();
    expect(note).toEqual(expect.any(String));
    expect(values).toEqual(json);
  });

  it('uses only fonts that are loaded at startup', () => {
    for (const family of Object.values(tudorSkin.fonts)) expect(Object.keys(fontAssets)).toContain(family);
  });
});

describe('panel text sizes', () => {
  it('keeps every line height at least 1.3x its font size so wrapped text is never squashed', () => {
    for (const size of Object.values(textSizes)) {
      expect(size.lineHeight / size.fontSize).toBeGreaterThanOrEqual(1.3);
    }
  });
});
