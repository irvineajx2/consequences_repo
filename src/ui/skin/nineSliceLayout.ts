// Geometry for a nine-slice frame. Pure TypeScript so it can be unit-tested without React Native.

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type SliceName = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';

export interface NineSliceLayout {
  readonly slices: Readonly<Record<SliceName, Rect>>;
  /** Display size of one corner after clamping. */
  readonly corner: number;
  /** How much corners were shrunk to fit (1 = full size). Use it to scale ornaments too. */
  readonly shrink: number;
}

export interface NineSliceOptions {
  /** Device pixels per point. Positions and sizes are rounded to whole device pixels. */
  readonly pixelRatio?: number;
  /**
   * Extend edge and centre slices by one device pixel under their neighbours so no hairline
   * appears where they meet. Turn it off for translucent overlays, where overlaps would show.
   */
  readonly overlap?: boolean;
}

/**
 * Rectangles for the nine pieces of a frame of the given size.
 *
 * `inset` is the corner size in source pixels and `scale` the display points per source pixel.
 * Corners keep a fixed size; edges stretch along their length and the centre fills the rest. When
 * the frame is smaller than two corners, corners shrink uniformly rather than overlap.
 */
export function nineSliceLayout(
  width: number,
  height: number,
  inset: number,
  scale: number,
  { pixelRatio = 1, overlap = true }: NineSliceOptions = {},
): NineSliceLayout {
  // Work in whole device pixels so pieces meet exactly, then convert back to points.
  const w = Math.round(Math.max(0, width) * pixelRatio);
  const h = Math.round(Math.max(0, height) * pixelRatio);
  const full = inset * scale * pixelRatio;
  const shrink = full > 0 ? Math.min(1, w / (2 * full), h / (2 * full)) : 1;
  // Never let rounding push two corners past the frame's size.
  const corner = Math.min(Math.round(full * shrink), Math.floor(w / 2), Math.floor(h / 2));

  // Column and row boundaries; every piece spans between two of them, so nothing can gap.
  const xs = [0, corner, w - corner, w];
  const ys = [0, corner, h - corner, h];
  const px = overlap ? 1 : 0;
  const pt = (v: number) => v / pixelRatio;

  const piece = (col: number, row: number): Rect => {
    // Edges and the centre extend under their neighbours; corners never move or stretch.
    const growX = col === 1 ? px : 0;
    const growY = row === 1 ? px : 0;
    const x = Math.max(0, xs[col] - growX);
    const y = Math.max(0, ys[row] - growY);
    const right = Math.min(w, xs[col + 1] + growX);
    const bottom = Math.min(h, ys[row + 1] + growY);
    return { x: pt(x), y: pt(y), width: pt(Math.max(0, right - x)), height: pt(Math.max(0, bottom - y)) };
  };

  return {
    corner: pt(corner),
    shrink,
    slices: {
      tl: piece(0, 0),
      t: piece(1, 0),
      tr: piece(2, 0),
      l: piece(0, 1),
      c: piece(1, 1),
      r: piece(2, 1),
      bl: piece(0, 2),
      b: piece(1, 2),
      br: piece(2, 2),
    },
  };
}
