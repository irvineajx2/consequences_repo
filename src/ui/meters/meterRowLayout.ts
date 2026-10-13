// Geometry for the meter row. Pure TypeScript so it can be unit-tested.
import type { MeterDisplay } from '../../game/meters';
import { isBalanceArt, type MeterSkin } from '../skin/types';

/** A meter's slot in the row at full size. */
export interface MeterSlot {
  readonly id: string;
  readonly width: number;
}

export interface PlacedSlot extends MeterSlot {
  /** Left edge, in screen points. */
  readonly x: number;
}

export interface MeterRowLayout {
  /** What every icon size in the skin is multiplied by: `iconScale`, less any shrink to fit. */
  readonly scale: number;
  /** Left edge of the row, in screen points. */
  readonly left: number;
  readonly width: number;
  readonly slots: readonly PlacedSlot[];
}

/**
 * One centred row of slots separated by `gap`, icons drawn at `iconScale`. On narrow screens the
 * whole row (slots and gaps) scales down proportionally so it keeps at least `margin` either side.
 */
export function meterRowLayout(
  screenWidth: number,
  slots: readonly MeterSlot[],
  { gap, margin, iconScale }: { readonly gap: number; readonly margin: number; readonly iconScale: number },
): MeterRowLayout {
  const natural = slots.reduce((sum, s) => sum + s.width * iconScale, 0) + gap * Math.max(0, slots.length - 1);
  const available = Math.max(0, screenWidth - 2 * margin);
  const fit = natural > 0 ? Math.min(1, available / natural) : 1;
  const scale = iconScale * fit;
  const width = natural * fit;
  const left = (screenWidth - width) / 2;
  let x = left;
  const placed = slots.map((s) => {
    const slot = { id: s.id, width: s.width * scale, x };
    x += slot.width + gap * fit;
    return slot;
  });
  return { scale, left, width, slots: placed };
}

/**
 * Full-size slots for a ruler's visible meters: fill icons at their natural aspect, balance meters
 * fixed, and placeholder medals (meters without art) as circles of the fill height.
 */
export function meterSlots(
  meters: readonly MeterDisplay[],
  skin: Pick<MeterSkin, 'art' | 'metrics' | 'layout'>,
  rulerId: string,
): MeterSlot[] {
  return meters.flatMap((m) => {
    const art = skin.art[rulerId]?.[m.id];
    if (!art) return [{ id: m.id, width: skin.layout.fillHeight }];
    if (isBalanceArt(art)) return [{ id: m.id, width: skin.layout.balanceWidth }];
    const aspect = skin.metrics[art.full]?.aspect ?? 1;
    return [{ id: m.id, width: skin.layout.fillHeight * aspect }];
  });
}
