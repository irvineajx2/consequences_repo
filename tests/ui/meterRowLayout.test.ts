import { getRuler } from '../../src/data/rulers';
import { visibleMeters } from '../../src/game/meters';
import { meterRowLayout, meterSlots } from '../../src/ui/meters/meterRowLayout';
import { tudorSkin } from '../../src/ui/skin/tudor';

const { ui } = getRuler('elizabeth-i');
const { layout } = tudorSkin.meters;
const slots = meterSlots(visibleMeters(ui), tudorSkin.meters, 'elizabeth-i');
const natural = slots.reduce((s, x) => s + x.width * layout.iconScale, 0) + layout.gap * (slots.length - 1);

describe('meter row slots', () => {
  it('are, in order, Treasury, Religion, Authority, Navy and Succession, without Spanish Hostility', () => {
    expect(slots.map((s) => s.id)).toEqual(['tr', 'rel', 'auth', 'navy', 'succ']);
  });

  it('give fill icons 40 pt at their natural aspect and Religion a 130 pt slot', () => {
    const metrics = tudorSkin.meters.metrics;
    expect(slots.find((s) => s.id === 'rel')?.width).toBe(130);
    expect(slots.find((s) => s.id === 'tr')?.width).toBeCloseTo(40 * metrics.treasury.aspect, 9);
    expect(slots.find((s) => s.id === 'auth')?.width).toBeCloseTo(40 * metrics.authority.aspect, 9);
  });
});

describe('meterRowLayout', () => {
  test.each([320, 375, 390, 430])('fits a %p pt screen with at least 12 pt margins, centred', (width) => {
    const row = meterRowLayout(width, slots, layout);
    expect(row.left).toBeGreaterThanOrEqual(12 - 1e-9);
    expect(row.left + row.width).toBeLessThanOrEqual(width - 12 + 1e-9);
    expect(row.left).toBeCloseTo(width - (row.left + row.width), 9);
    // Slots in order, separated by the scaled gap, spanning the row exactly.
    row.slots.forEach((s, i) => {
      if (i > 0) {
        const prev = row.slots[i - 1];
        expect(s.x - (prev.x + prev.width)).toBeCloseTo((layout.gap * row.scale) / layout.iconScale, 9);
      }
    });
    const last = row.slots[row.slots.length - 1];
    expect(last.x + last.width).toBeCloseTo(row.left + row.width, 9);
  });

  it('draws every icon 20% larger, shrinking proportionally only where the row does not fit', () => {
    expect(layout.iconScale).toBe(1.2);
    expect(natural).toBeGreaterThan(390 - 24);
    expect(natural).toBeLessThanOrEqual(430 - 24);
    expect(meterRowLayout(430, slots, layout).scale).toBe(1.2);
    const small = meterRowLayout(320, slots, layout);
    expect(small.scale).toBeCloseTo((1.2 * (320 - 24)) / natural, 9);
    expect(small.left).toBeCloseTo(12, 9);
    // Everything shrinks by the same factor.
    small.slots.forEach((s, i) => expect(s.width).toBeCloseTo(slots[i].width * small.scale, 9));
  });

  it('handles an empty row', () => {
    expect(meterRowLayout(390, [], layout)).toEqual({ scale: 1.2, left: 195, width: 0, slots: [] });
  });
});

describe("Caesar's meter row", () => {
  const caesar = getRuler('julius-caesar');
  const caesarSlots = meterSlots(visibleMeters(caesar.ui), tudorSkin.meters, 'julius-caesar');

  it('gives his five illustrated fill meters 40 pt at their natural aspect, in order', () => {
    expect(caesarSlots.map((s) => s.id)).toEqual(['fortune', 'legions', 'people', 'senate', 'glory']);
    for (const slot of caesarSlots) {
      expect(slot.width).toBeCloseTo(layout.fillHeight * tudorSkin.meters.metrics[slot.id].aspect, 9);
    }
  });

  test.each([320, 375, 390, 430])('fits a %p pt screen at full (1.2x) size, centred', (width) => {
    const row = meterRowLayout(width, caesarSlots, layout);
    expect(row.scale).toBe(1.2);
    expect(row.left).toBeGreaterThanOrEqual(12 - 1e-9);
    expect(row.left).toBeCloseTo(width - (row.left + row.width), 9);
  });
});

describe('meter row for a ruler without illustrated art', () => {
  it('falls back to placeholder medals, one fill-height circle each', () => {
    const caesar = getRuler('julius-caesar');
    const medals = meterSlots(visibleMeters(caesar.ui), tudorSkin.meters, 'no-art-ruler');
    expect(medals).toEqual(
      ['fortune', 'legions', 'people', 'senate', 'glory'].map((id) => ({ id, width: layout.fillHeight })),
    );
  });
});
