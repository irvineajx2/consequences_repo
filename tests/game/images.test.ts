import { getRuler } from '../../src/data/rulers';
import { referencedImageIds } from '../../src/game/images';
import { imageRegistry } from '../../src/ui/imageRegistry';
import { getImage } from '../../src/ui/images';

const { rules } = getRuler('elizabeth-i');

describe('image registry', () => {
  it('only contains image ids that rules.json uses (unknown ids are usually filename typos)', () => {
    const used = referencedImageIds(rules);
    const unknown = Object.keys(imageRegistry).filter((id) => !used.has(id));
    expect(unknown).toEqual([]);
  });

  it('falls back to the placeholder for a missing image', () => {
    expect(getImage('no-such-image')).toBeDefined();
    expect(getImage('no-such-image')).toBe(getImage('another-missing-image'));
  });
});
