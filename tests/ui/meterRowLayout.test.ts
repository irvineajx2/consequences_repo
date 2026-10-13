import { getRuler, rulers } from '../../src/data/rulers';
import { visibleMeters } from '../../src/game/meters';
import { meterRowLayout, meterSlots, type MeterRowLayout, type MeterSlot } from '../../src/ui/meters/meterRowLayout';
import { tudorSkin } from '../../src/ui/skin/tudor';

const { layout } = tudorSkin.meters;
const slotsFor = (rulerId: string) => meterSlots(visibleMeters(getRuler(rulerId).ui), tudorSkin.meters, rulerId);
// Charles as he will be once his planned art arrives (his Church gauge then takes two units).
const charlesWithArt = meterSlots(visibleMeters(getRuler('charles-i').ui), { ...tudorSkin.meters, art: { ...tudorSkin.meters.pending } }, 'charles-i');

const ROWS: [string, MeterSlot[]][] = [
  ...rulers.map((r) => [r.id, slotsFor(r.id)] as [string, MeterSlot[]]),
  ['charles-i (planned art)', charlesWithArt],
];
const SE = 320;
const WIDE = 430;
const centre = (s: { x: number; width: number }) => s.x + s.width / 2;

/** Where a slot's centre should be: the middle of its units on an even grid across the row. */
function expectOnUnitGrid(row: MeterRowLayout, slots: readonly MeterSlot[]) {
  const units = slots.reduce((n, s) => n + s.units, 0);
  const unit = row.width / units;
  let used = 0;
  row.slots.forEach((placed, i) => {
    expect(centre(placed)).toBeCloseTo(row.left + (used + slots[i].units / 2) * unit, 9);
    used += slots[i].units;
  });
}

describe('meter row slots', () => {
  it("are Elizabeth's Treasury, Religion, Authority, Navy and Succession, without Spanish Hostility", () => {
    expect(slotsFor('elizabeth-i').map((s) => s.id)).toEqual(['tr', 'rel', 'auth', 'navy', 'succ']);
  });

  it('give fill icons and placeholders one unit and two-sided gauges two', () => {
    expect(slotsFor('elizabeth-i').map((s) => s.units)).toEqual([1, 2, 1, 1, 1]);
    expect(slotsFor('julius-caesar').map((s) => s.units)).toEqual([1, 1, 1, 1, 1]);
    expect(slotsFor('charles-i').map((s) => s.units)).toEqual([1, 1, 1, 1, 1]);
    expect(charlesWithArt.map((s) => [s.id, s.units])).toEqual([
      ['treasury', 1],
      ['parliament', 1],
      ['church', 2],
      ['army', 1],
      ['majesty', 1],
    ]);
  });
});

describe('the meter row, the same for every ruler', () => {
  describe.each(ROWS)('%s', (_name, slots) => {
    test.each([SE, 375, 390, WIDE])('spans a %p pt screen inside the margins, centres evenly spaced', (width) => {
      const row = meterRowLayout(width, slots, layout);
      expect(row.left).toBeCloseTo(layout.margin, 9);
      expect(row.left + row.width).toBeCloseTo(width - layout.margin, 9);
      // Slots tile the row exactly, in order.
      expect(row.slots[0].x).toBeCloseTo(row.left, 9);
      const last = row.slots[row.slots.length - 1];
      expect(last.x + last.width).toBeCloseTo(row.left + row.width, 9);
      expectOnUnitGrid(row, slots);
      // The first and last meters sit the same distance from their screen edges.
      expect(centre(row.slots[0])).toBeCloseTo(width - centre(last), 9);
    });

    test.each([SE, WIDE])('keeps at least the gap between neighbouring icons on a %p pt screen', (width) => {
      const row = meterRowLayout(width, slots, layout);
      row.slots.forEach((s, i) => {
        if (i === 0) return;
        const prev = row.slots[i - 1];
        const space = centre(s) - centre(prev) - (s.iconWidth + prev.iconWidth) / 2;
        expect(space).toBeGreaterThanOrEqual(layout.gap - 1e-9);
      });
    });

    it('draws icons at 1.2x where they fit, every icon shrinking by the same factor where not', () => {
      const wide = meterRowLayout(WIDE, slots, layout);
      const small = meterRowLayout(SE, slots, layout);
      expect(small.scale).toBeLessThanOrEqual(wide.scale);
      expect(wide.scale).toBeLessThanOrEqual(layout.iconScale);
      for (const row of [wide, small]) {
        row.slots.forEach((s, i) => {
          if (slots[i].units === 1) expect(s.iconWidth).toBeCloseTo(slots[i].width * row.scale, 9);
        });
      }
    });
  });

  it('spaces neighbouring centres equally when every meter takes one unit (Caesar, Charles today)', () => {
    for (const rulerId of ['julius-caesar', 'charles-i']) {
      for (const width of [SE, WIDE]) {
        const row = meterRowLayout(width, slotsFor(rulerId), layout);
        const gaps = row.slots.slice(1).map((s, i) => centre(s) - centre(row.slots[i]));
        for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 9);
      }
    }
  });

  it('draws the full 1.2x on 390 pt phones and up, and on smaller ones still larger than before', () => {
    for (const rulerId of ['elizabeth-i', 'julius-caesar', 'charles-i']) {
      for (const width of [390, WIDE]) expect(meterRowLayout(width, slotsFor(rulerId), layout).scale).toBeCloseTo(1.2, 9);
    }
    expect(meterRowLayout(375, slotsFor('elizabeth-i'), layout).scale).toBeGreaterThan(1.15);
    // Before: Elizabeth's row shrank to 0.906 on an iPhone SE; Caesar's and Charles's drew at 1.
    expect(meterRowLayout(SE, slotsFor('elizabeth-i'), layout).scale).toBeGreaterThan(0.906);
    expect(meterRowLayout(SE, slotsFor('julius-caesar'), layout).scale).toBeGreaterThan(1.1);
    expect(meterRowLayout(SE, slotsFor('charles-i'), layout).scale).toBeCloseTo(1.2, 9);
  });

  it("keeps Elizabeth's Religion gauge about as wide as before (130 pt), within its double slot", () => {
    for (const width of [375, 390, WIDE]) {
      const rel = meterRowLayout(width, slotsFor('elizabeth-i'), layout).slots[1];
      expect(rel.iconWidth).toBeGreaterThan(100);
      expect(rel.iconWidth).toBeLessThanOrEqual(rel.width - layout.gap + 1e-9);
    }
  });

  it('stays inside the safe area', () => {
    const row = meterRowLayout(844, slotsFor('julius-caesar'), layout, { left: 47, right: 47 });
    expect(row.left).toBeCloseTo(47 + layout.margin, 9);
    expect(row.left + row.width).toBeCloseTo(844 - 47 - layout.margin, 9);
  });

  it('handles an empty row', () => {
    expect(meterRowLayout(390, [], layout)).toEqual({ scale: 1.2, left: layout.margin, width: 390 - 2 * layout.margin, slots: [] });
  });
});

describe('meter row for a ruler without illustrated art', () => {
  it('falls back to placeholder medals, one fill-height circle each', () => {
    const caesar = getRuler('julius-caesar');
    const medals = meterSlots(visibleMeters(caesar.ui), tudorSkin.meters, 'no-art-ruler');
    expect(medals).toEqual(
      ['fortune', 'legions', 'people', 'senate', 'glory'].map((id) => ({ id, width: layout.fillHeight, units: 1 })),
    );
  });
});
