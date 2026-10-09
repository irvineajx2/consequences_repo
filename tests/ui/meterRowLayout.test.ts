import { getRuler } from '../../src/data/rulers';
import { visibleMeters } from '../../src/game/meters';
import { meterRowLayout, meterSlots } from '../../src/ui/meters/meterRowLayout';
import { tudorSkin } from '../../src/ui/skin/tudor';

const { ui } = getRuler('elizabeth-i');
const { layout } = tudorSkin.meters;
const slots = meterSlots(visibleMeters(ui), tudorSkin.meters, 'elizabeth-i');
const natural = slots.reduce((s, x) => s + x.width, 0) + layout.gap * (slots.length - 1);

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
        expect(s.x - (prev.x + prev.width)).toBeCloseTo(layout.gap * row.scale, 9);
      }
    });
    const last = row.slots[row.slots.length - 1];
    expect(last.x + last.width).toBeCloseTo(row.left + row.width, 9);
  });

  it('keeps full size where the row fits, and scales proportionally only where it does not', () => {
    expect(natural).toBeGreaterThan(320 - 24);
    expect(natural).toBeLessThanOrEqual(375 - 24);
    for (const width of [375, 390, 430]) expect(meterRowLayout(width, slots, layout).scale).toBe(1);
    const small = meterRowLayout(320, slots, layout);
    expect(small.scale).toBeCloseTo((320 - 24) / natural, 9);
    expect(small.left).toBeCloseTo(12, 9);
    // Everything shrinks by the same factor.
    small.slots.forEach((s, i) => expect(s.width).toBeCloseTo(slots[i].width * small.scale, 9));
  });

  it('handles an empty row', () => {
    expect(meterRowLayout(390, [], layout)).toEqual({ scale: 1, left: 195, width: 0, slots: [] });
  });
});

describe('meter row for a ruler without illustrated art', () => {
  it("draws Caesar's five meters as placeholder medals, one fill-height circle each", () => {
    const caesar = getRuler('julius-caesar');
    const medals = meterSlots(visibleMeters(caesar.ui), tudorSkin.meters, 'julius-caesar');
    expect(medals).toEqual(
      ['fortune', 'legions', 'people', 'senate', 'glory'].map((id) => ({ id, width: layout.fillHeight })),
    );
    for (const width of [320, 375, 390, 430]) {
      const row = meterRowLayout(width, medals, layout);
      expect(row.left).toBeGreaterThanOrEqual(12 - 1e-9);
    }
  });
});
