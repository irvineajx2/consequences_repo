import fs from 'fs';
import path from 'path';
import { getRuler, rulers } from '../../src/data/rulers';
import { referencedImageIds } from '../../src/game/images';
import { uiImageIds } from '../../src/game/rulerUi';
import { imageRegistries } from '../../src/ui/imageRegistry';
import { getImage, placeholderImage } from '../../src/ui/images';

describe('image registry', () => {
  it('has a registry for every ruler folder', () => {
    const folders = fs
      .readdirSync(path.join(__dirname, '../../assets/rulers'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect(Object.keys(imageRegistries).sort()).toEqual(folders);
    for (const ruler of rulers) expect(folders).toContain(ruler.id);
  });

  test.each(rulers.map((r) => [r.id, r] as const))(
    '%s: only contains ids its rules.json or ui.json use (unknown ids are usually filename typos)',
    (_id, ruler) => {
      const used = new Set([...referencedImageIds(ruler.rules), ...uiImageIds(ruler.ui)]);
      const unknown = Object.keys(imageRegistries[ruler.id] ?? {}).filter((id) => !used.has(id));
      expect(unknown).toEqual([]);
    },
  );

  it('has every image Elizabeth uses, so no placeholder shows in her game', () => {
    const { rules, ui } = getRuler('elizabeth-i');
    const registry = imageRegistries['elizabeth-i'];
    expect([...uiImageIds(ui)].sort()).toEqual(['ERA1', 'ERA2', 'ERA3', 'ERA4', 'P1', 'R1', 'TITLE']);
    const missing = [...referencedImageIds(rules), ...uiImageIds(ui)].filter((id) => registry[id] === undefined);
    expect(missing).toEqual([]);
  });

  it("knows every image id in Caesar's manifest, and no others (59 in all)", () => {
    const { rules, ui } = getRuler('julius-caesar');
    const manifest = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../src/data/rulers/julius-caesar/image_manifest.json'), 'utf8'),
    );
    const listed = [
      ...Object.values(manifest.scenes as Record<string, string>),
      ...Object.values(manifest.beats as Record<string, string>),
      ...Object.values(manifest.endings as Record<string, string>),
      manifest.ui.prologue,
      ...manifest.ui.eras,
      manifest.ui.rulerCard,
    ];
    const used = new Set([...referencedImageIds(rules), ...uiImageIds(ui)]);
    expect(listed).toHaveLength(59);
    expect([...used].sort()).toEqual([...new Set(listed)].sort());
  });

  it('shows the placeholder for an image a ruler does not have yet', () => {
    expect(getImage('julius-caesar', 'C01')).toBe(imageRegistries['julius-caesar']?.C01 ?? placeholderImage);
    expect(getImage('elizabeth-i', 'no-such-image')).toBe(placeholderImage);
    expect(getImage('no-such-ruler', '01')).toBe(placeholderImage);
  });

  it("keeps rulers' images apart", () => {
    expect(getImage('julius-caesar', '01')).toBe(placeholderImage);
    expect(getImage('elizabeth-i', '01')).toBe(imageRegistries['elizabeth-i']['01']);
  });
});
