import { nineSliceLayout, type Rect } from '../../src/ui/skin/nineSliceLayout';

const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
const onGrid = (v: number, pixelRatio: number) => Math.abs(v * pixelRatio - Math.round(v * pixelRatio)) < 1e-9;

const SIZES = [
  [343, 180],
  [375, 812],
  [320, 56],
  [411.4, 97.3],
  [1024, 60],
] as const;
const RATIOS = [1, 2, 2.625, 3] as const;

describe('nineSliceLayout', () => {
  it('gives corners their full size when there is room', () => {
    const { slices, corner, shrink } = nineSliceLayout(300, 200, 110, 0.27, { pixelRatio: 3 });
    expect(shrink).toBe(1);
    expect(corner).toBeCloseTo(Math.round(110 * 0.27 * 3) / 3, 9);
    expect(slices.tl).toEqual({ x: 0, y: 0, width: corner, height: corner });
    expect(slices.tr).toEqual({ x: 300 - corner, y: 0, width: corner, height: corner });
    expect(slices.bl).toEqual({ x: 0, y: 200 - corner, width: corner, height: corner });
    expect(slices.br).toEqual({ x: 300 - corner, y: 200 - corner, width: corner, height: corner });
  });

  describe.each(RATIOS)('at pixel ratio %p', (pixelRatio) => {
    test.each(SIZES)('tiles %p x %p with no gaps', (width, height) => {
      const { slices } = nineSliceLayout(width, height, 112, 0.2, { pixelRatio });
      const w = Math.round(width * pixelRatio) / pixelRatio;
      const h = Math.round(height * pixelRatio) / pixelRatio;
      for (const [a, b, c] of [
        [slices.tl, slices.t, slices.tr],
        [slices.l, slices.c, slices.r],
        [slices.bl, slices.b, slices.br],
      ]) {
        expect(a.x).toBe(0);
        expect(b.x).toBeLessThanOrEqual(right(a));
        expect(c.x).toBeLessThanOrEqual(right(b));
        expect(right(c)).toBeCloseTo(w, 9);
      }
      for (const [a, b, c] of [
        [slices.tl, slices.l, slices.bl],
        [slices.t, slices.c, slices.b],
        [slices.tr, slices.r, slices.br],
      ]) {
        expect(a.y).toBe(0);
        expect(b.y).toBeLessThanOrEqual(bottom(a));
        expect(c.y).toBeLessThanOrEqual(bottom(b));
        expect(bottom(c)).toBeCloseTo(h, 9);
      }
    });

    test.each(SIZES)('places every piece on whole device pixels at %p x %p', (width, height) => {
      const { slices } = nineSliceLayout(width, height, 110, 0.27, { pixelRatio });
      for (const r of Object.values(slices)) {
        for (const v of [r.x, r.y, r.width, r.height]) expect(onGrid(v, pixelRatio)).toBe(true);
      }
    });

    test.each(SIZES)('extends edges one pixel under the corners at %p x %p', (width, height) => {
      const { slices, corner } = nineSliceLayout(width, height, 110, 0.27, { pixelRatio });
      expect(slices.t.x).toBeCloseTo(corner - 1 / pixelRatio, 9);
      expect(right(slices.t)).toBeCloseTo(slices.tr.x + 1 / pixelRatio, 9);
      expect(slices.l.y).toBeCloseTo(corner - 1 / pixelRatio, 9);
    });

    test.each(SIZES)('abuts exactly without overlap when asked, at %p x %p', (width, height) => {
      const { slices } = nineSliceLayout(width, height, 110, 0.27, { pixelRatio, overlap: false });
      expect(slices.t.x).toBe(right(slices.tl));
      expect(slices.tr.x).toBeCloseTo(right(slices.t), 9);
      expect(slices.c.y).toBe(bottom(slices.t));
      expect(slices.b.y).toBeCloseTo(bottom(slices.c), 9);
    });
  });

  it('shrinks corners proportionally instead of overlapping when the frame is small', () => {
    const full = 110 * 0.27;
    const { slices, corner, shrink } = nineSliceLayout(20, 40, 110, 0.27, { pixelRatio: 2 });
    expect(shrink).toBeCloseTo(20 / (2 * full), 9);
    expect(corner).toBeLessThanOrEqual(10);
    expect(slices.tl.width).toBe(slices.tl.height);
    expect(right(slices.tl)).toBeLessThanOrEqual(slices.tr.x);
    expect(bottom(slices.tl)).toBeLessThanOrEqual(slices.bl.y);
    expect(right(slices.tr)).toBe(20);
  });

  it('never lets rounding overlap corners on odd pixel sizes', () => {
    const { slices } = nineSliceLayout(5, 5, 110, 0.27, { pixelRatio: 1 });
    expect(right(slices.tl)).toBeLessThanOrEqual(slices.tr.x);
    expect(bottom(slices.tl)).toBeLessThanOrEqual(slices.bl.y);
  });

  it('handles an empty frame', () => {
    const { slices } = nineSliceLayout(0, 0, 110, 0.27);
    for (const r of Object.values(slices)) {
      expect(r.width).toBe(0);
      expect(r.height).toBe(0);
    }
  });
});
