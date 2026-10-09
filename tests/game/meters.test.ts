import { getRuler } from '../../src/data/rulers';
import {
  balanceState,
  chevronCount,
  fillFraction,
  fillHeight,
  fillState,
  isWarning,
  markerOffset,
  type MeterDisplay,
  trackSegments,
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

  it.each([
    [0, 'critical'], [15, 'critical'],
    [16, 'low'], [35, 'low'],
    [36, 'steady'], [65, 'steady'],
    [66, 'strong'], [85, 'strong'],
    [86, 'formidable'], [100, 'formidable'],
  ] as const)('reads a fill meter at %p as %p', (value, state) => {
    expect(fillState(value)).toBe(state);
  });

  const religion: MeterDisplay = { id: 'rel', visible: true, style: 'balance', warnBelow: 25, warnAbove: 75 };
  it.each([
    [0, 'dangerouslyLeft'], [24, 'dangerouslyLeft'],
    [25, 'leaningLeft'], [44, 'leaningLeft'],
    [45, 'balanced'], [55, 'balanced'],
    [56, 'leaningRight'], [75, 'leaningRight'],
    [76, 'dangerouslyRight'], [100, 'dangerouslyRight'],
  ] as const)('reads a balance meter at %p as %p', (value, state) => {
    expect(balanceState(religion, value)).toBe(state);
  });

  it('says "dangerously" exactly when the meter warns', () => {
    for (let v = 0; v <= 100; v++) {
      expect(balanceState(religion, v).startsWith('dangerously')).toBe(isWarning(religion, v));
    }
  });

  it('fills a 40 pt icon in proportion to the value', () => {
    expect(fillHeight(0, range, 40)).toBe(0);
    expect(fillHeight(50, range, 40)).toBe(20);
    expect(fillHeight(100, range, 40)).toBe(40);
    expect(fillHeight(130, range, 40)).toBe(40);
    expect(fillHeight(-10, range, 40)).toBe(0);
  });

  it('places the balance marker along the track', () => {
    expect(markerOffset(0, range, 60)).toBe(0);
    expect(markerOffset(25, range, 60)).toBe(15);
    expect(markerOffset(50, range, 60)).toBe(30);
    expect(markerOffset(100, range, 60)).toBe(60);
  });

  it('colours the track crimson beyond the warn thresholds and gold between them', () => {
    expect(trackSegments(religion, range)).toEqual([
      { from: 0, to: 0.25, danger: true },
      { from: 0.25, to: 0.75, danger: false },
      { from: 0.75, to: 1, danger: true },
    ]);
    const plain: MeterDisplay = { id: 'x', visible: true, style: 'balance' };
    expect(trackSegments(plain, range)).toEqual([{ from: 0, to: 1, danger: false }]);
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

  it('has a state word for every fill and balance state', () => {
    for (const key of ['critical', 'low', 'steady', 'strong', 'formidable'] as const) {
      expect(text.meterStates.fill[key]).toEqual(expect.any(String));
    }
    expect(text.meterStates.balance).toEqual({
      dangerouslyLeft: 'Dangerously Catholic',
      leaningLeft: 'Leaning Catholic',
      balanced: 'Balanced',
      leaningRight: 'Leaning Protestant',
      dangerouslyRight: 'Dangerously Protestant',
    });
    for (const word of [...Object.values(text.meterStates.fill), ...Object.values(text.meterStates.balance)]) {
      expect(word).not.toMatch(/\d/);
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
