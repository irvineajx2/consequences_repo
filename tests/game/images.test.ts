import { getRuler } from '../../src/data/rulers';
import { referencedImageIds } from '../../src/game/images';
import { uiImageIds } from '../../src/game/rulerUi';
import { imageRegistry } from '../../src/ui/imageRegistry';
import { getImage } from '../../src/ui/images';

const { rules, ui } = getRuler('elizabeth-i');

describe('image registry', () => {
  it('only contains image ids that rules.json or ui.json use (unknown ids are usually filename typos)', () => {
    const used = new Set([...referencedImageIds(rules), ...uiImageIds(ui)]);
    const unknown = Object.keys(imageRegistry).filter((id) => !used.has(id));
    expect(unknown).toEqual([]);
  });

  it('has every image ui.json refers to (prologue, eras, title, ruler card)', () => {
    const ids = [...uiImageIds(ui)];
    expect(ids.sort()).toEqual(['ERA1', 'ERA2', 'ERA3', 'ERA4', 'P1', 'R1', 'TITLE']);
    for (const id of ids) expect(imageRegistry[id]).toBeDefined();
  });

  it('has every image rules.json refers to, so no placeholder shows in play', () => {
    const missing = [...referencedImageIds(rules)].filter((id) => imageRegistry[id] === undefined);
    expect(missing).toEqual([]);
  });

  it('falls back to the placeholder for a missing image', () => {
    expect(getImage('no-such-image')).toBeDefined();
    expect(getImage('no-such-image')).toBe(getImage('another-missing-image'));
  });
});
