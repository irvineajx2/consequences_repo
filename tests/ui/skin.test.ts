import fs from 'fs';
import path from 'path';
import { fontAssets } from '../../src/ui/fonts';
import { textSizes } from '../../src/ui/theme';
import { rulers } from '../../src/data/rulers';
import { visibleMeters } from '../../src/game/meters';
import { progression as progressionConfig } from '../../src/game/progression';
import { tudorSkin } from '../../src/ui/skin/tudor';
import { isBalanceArt, meterImageNames, progressionImageMetrics, skinImageNames } from '../../src/ui/skin/types';

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
    const { images, meters, screen, progression, ...values } = tudorSkin;
    const { note, ...json } = tudorJson;
    expect(images).toBeDefined();
    expect(progression).toBeDefined();
    expect(meters).toBeDefined();
    expect(screen).toBeDefined();
    expect(note).toEqual(expect.any(String));
    expect(values).toEqual(json);
  });

  it('uses only fonts that are loaded at startup', () => {
    for (const family of Object.values(tudorSkin.fonts)) expect(Object.keys(fontAssets)).toContain(family);
  });
});

describe('Tudor progression art', () => {
  const dir = path.join(skinDir, 'progression');
  const layout = JSON.parse(fs.readFileSync(path.join(dir, 'progression_ui.json'), 'utf8'));
  const art = fs
    .readdirSync(dir)
    .filter((f) => /^[a-z_]+\.png$/.test(f) && !f.startsWith('_'))
    .map((f) => f.replace('.png', ''));

  const ranks = JSON.parse(fs.readFileSync(path.join(dir, 'rank_ui.json'), 'utf8'));
  const exists = (name: string) =>
    ['', '@2x', '@3x'].every((suffix) => fs.existsSync(path.join(dir, `${name}${suffix}.png`)));
  // The single medallion was replaced by the rank medallions; progression_ui.json still sizes it.
  const superseded = ['medallion'];
  const fromLayout = [...Object.keys(progressionImageMetrics(layout)), ...Object.values<string>(layout.gems)];
  const fromRanks = [
    ...Object.values<{ image: string }>(ranks.tiers).map((t) => t.image),
    ranks.laurel.normal,
    ranks.laurel.major,
  ];

  it('has every file progression_ui.json and rank_ui.json name, at @1x, @2x and @3x', () => {
    expect(new Set(fromLayout)).toEqual(
      new Set(['coin', 'medallion', 'laurel', 'bar_left', 'bar_mid', 'bar_right', 'gem_common', 'gem_uncommon', 'gem_rare', 'gem_legendary']),
    );
    expect(new Set(fromRanks)).toEqual(
      new Set(['medallion_blue', 'medallion_green', 'medallion_red', 'medallion_purple', 'medallion_gold', 'laurel', 'laurel_major']),
    );
    for (const name of [...fromLayout, ...fromRanks]) expect(exists(name)).toBe(true);
  });

  it('registers exactly the images in use: not the old medallion, nor the previews', () => {
    const used = [...new Set([...fromLayout, ...fromRanks])].filter((n) => !superseded.includes(n));
    expect(Object.keys(tudorSkin.progression.images).sort()).toEqual(used.sort());
    expect(art.filter((n) => !used.includes(n))).toEqual(superseded);
  });

  it('does not bundle the previews', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/ui/skin/tudor.ts'), 'utf8');
    expect(source).not.toMatch(/progression\/_preview/);
    expect(fs.existsSync(path.join(dir, '_preview_ranks.png'))).toBe(true);
  });

  it('uses the rank art from rank_ui.json', () => {
    const { _note, ...rankArt } = ranks;
    expect(_note).toEqual(expect.any(String));
    expect(tudorSkin.progression.ranks).toEqual(rankArt);
  });

  it('has a medallion for every rank in progression.json', () => {
    for (const { title } of progressionConfig.ranks) {
      const tier = tudorSkin.progression.ranks.ranks[title];
      expect([title, tier && tudorSkin.progression.ranks.tiers[tier]?.image]).toEqual([title, expect.any(String)]);
      expect(tudorSkin.progression.images[tudorSkin.progression.ranks.tiers[tier].image]).toBeDefined();
    }
  });

  it('uses the layout from progression_ui.json', () => {
    expect(tudorSkin.progression.layout).toEqual(layout);
  });

  it('has a gem for every ending band, registered as an image', () => {
    for (const band of ['common', 'uncommon', 'rare', 'legendary']) {
      expect(tudorSkin.progression.images[tudorSkin.progression.layout.gems[band]]).toBeDefined();
    }
  });
});

describe('Tudor meters', () => {
  const meterDir = path.join(skinDir, 'meters');
  const names = meterImageNames(tudorSkin.meters);

  it("maps Elizabeth's five visible meters to art", () => {
    expect(tudorSkin.meters.art['elizabeth-i']).toEqual({
      tr: { full: 'treasury', empty: 'treasury_empty' },
      auth: { full: 'authority', empty: 'authority_empty' },
      navy: { full: 'navy', empty: 'navy_empty' },
      succ: { full: 'succession', empty: 'succession_empty' },
      rel: { marker: 'religion_church', left: 'religion_keys', right: 'religion_bible' },
    });
  });

  // Elizabeth's art sits at the top of meters/; later rulers' art in meters/<ruler-id>/.
  const rulerMeterDir = (rulerId: string) =>
    fs.existsSync(path.join(meterDir, rulerId)) ? path.join(meterDir, rulerId) : meterDir;

  test.each(Object.keys(tudorSkin.meters.art))(
    '%s: has every image it names, and every variant, at @1x, @2x and @3x',
    (rulerId) => {
      const dir = rulerMeterDir(rulerId);
      for (const name of meterImageNames({ art: { [rulerId]: tudorSkin.meters.art[rulerId] } })) {
        for (const density of ['', '@2x', '@3x']) {
          expect(fs.existsSync(path.join(dir, `${name}${density}.png`))).toBe(true);
        }
        expect(tudorSkin.meters.images[name]).toBeDefined();
      }
    },
  );

  it('registers exactly the meter images it names', () => {
    expect(names).toHaveLength(23 + 20);
    expect(Object.keys(tudorSkin.meters.images).sort()).toEqual([...names].sort());
  });

  it("maps Caesar's five fill meters to their art, and sizes them from his meters.json", () => {
    const caesarFile = JSON.parse(fs.readFileSync(path.join(meterDir, 'julius-caesar', 'meters.json'), 'utf8'));
    for (const id of ['fortune', 'legions', 'people', 'senate', 'glory']) {
      expect(tudorSkin.meters.art['julius-caesar'][id]).toEqual({ full: id, empty: `${id}_empty` });
      expect(tudorSkin.meters.metrics[id]).toEqual(caesarFile[id]);
    }
  });

  it('has a size for every icon, glowing marker and track end', () => {
    for (const art of Object.values(tudorSkin.meters.art).flatMap((byMeter) => Object.values(byMeter))) {
      const sized = isBalanceArt(art) ? [art.marker, art.left, art.right] : [art.full];
      for (const name of sized) expect(tudorSkin.meters.metrics[name]).toEqual({
        heightPt: expect.any(Number),
        aspect: expect.any(Number),
        effectPadPt: expect.any(Number),
      });
    }
  });

  it('has art for every visible meter of every ruler, so no placeholder medal is drawn', () => {
    const missing: string[] = [];
    for (const ruler of rulers) {
      for (const meter of visibleMeters(ruler.ui)) {
        if (!tudorSkin.meters.art[ruler.id]?.[meter.id]) missing.push(`${ruler.id}/${meter.id}`);
      }
    }
    expect(missing).toEqual([]);
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
