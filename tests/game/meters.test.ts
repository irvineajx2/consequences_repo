import { getRuler } from '../../src/data/rulers';
import {
  chevronCount,
  fillFraction,
  isWarning,
  type MeterDisplay,
  meterLevel,
  visibleMeters,
} from '../../src/game/meters';

const { rules, ui, text } = getRuler('elizabeth-i');
const range = rules.meter_range;

describe('meter display maths', () => {
  it('maps values to a 0..1 fill fraction, clamped', () => {
    expect(fillFraction(0, range)).toBe(0);
    expect(fillFraction(50, range)).toBe(0.5);
    expect(fillFraction(100, range)).toBe(1);
    expect(fillFraction(-5, range)).toBe(0);
    expect(fillFraction(130, range)).toBe(1);
    expect(fillFraction(30, [20, 40])).toBe(0.5);
    expect(fillFraction(5, [10, 10])).toBe(0);
  });

  it.each([
    [0, 0],
    [1, 1],
    [5, 1],
    [-5, 1],
    [6, 2],
    [10, 2],
    [-10, 2],
    [11, 3],
    [-30, 3],
  ])('shows %p as %p chevrons', (delta, count) => {
    expect(chevronCount(delta)).toBe(count);
  });

  it('warns past either threshold, but not at it', () => {
    const balance: MeterDisplay = { id: 'x', visible: true, style: 'balance', warnBelow: 25, warnAbove: 75 };
    expect(isWarning(balance, 24)).toBe(true);
    expect(isWarning(balance, 25)).toBe(false);
    expect(isWarning(balance, 75)).toBe(false);
    expect(isWarning(balance, 76)).toBe(true);
    const plain: MeterDisplay = { id: 'y', visible: true, style: 'fill' };
    expect(isWarning(plain, 0)).toBe(false);
    expect(isWarning(plain, 100)).toBe(false);
  });

  it('describes values in words', () => {
    const fill: MeterDisplay = { id: 'f', visible: true, style: 'fill' };
    expect(meterLevel(fill, 10, range)).toBe('low');
    expect(meterLevel(fill, 50, range)).toBe('steady');
    expect(meterLevel(fill, 90, range)).toBe('strong');
    const balance: MeterDisplay = { id: 'b', visible: true, style: 'balance' };
    expect(meterLevel(balance, 20, range)).toBe('left');
    expect(meterLevel(balance, 50, range)).toBe('balanced');
    expect(meterLevel(balance, 80, range)).toBe('right');
  });
});

describe('ui.json', () => {
  it('lists every meter in rules.json, and nothing else', () => {
    expect(ui.meters.map((m) => m.id).sort()).toEqual(Object.keys(rules.meters).sort());
  });

  it('shows five meters and hides the rest', () => {
    const shown = visibleMeters(ui).map((m) => m.id);
    expect(shown).toHaveLength(5);
    for (const hidden of ui.meters.filter((m) => !m.visible)) expect(shown).not.toContain(hidden.id);
  });

  it('gives every visible meter a style, and every balance meter both ends in the text', () => {
    for (const meter of visibleMeters(ui)) {
      expect(['fill', 'balance']).toContain(meter.style);
      if (meter.style === 'balance') {
        expect(text.meters[meter.id]?.left).toEqual(expect.any(String));
        expect(text.meters[meter.id]?.right).toEqual(expect.any(String));
      }
    }
  });

  it('names every visible meter and no hidden one, so a hidden meter cannot be shown', () => {
    for (const meter of ui.meters) {
      if (meter.visible) expect(text.meters[meter.id]?.name).toEqual(expect.any(String));
      else expect(text.meters[meter.id]).toBeUndefined();
    }
    for (const id of Object.keys(text.meters)) expect(Object.keys(rules.meters)).toContain(id);
  });
});
