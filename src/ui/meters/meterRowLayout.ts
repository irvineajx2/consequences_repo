// Geometry for the meter row. Pure TypeScript so it can be unit-tested.
import type { MeterDisplay } from '../../game/meters';
import { isBalanceArt, type MeterSkin } from '../skin/types';

/** A meter's place in the row before layout. */
export interface MeterSlot {
  readonly id: string;
  /** The icon's width at the skin's base size (before `iconScale`). */
  readonly width: number;
  /** How many equal units of the row it takes: 2 for a two-sided gauge, 1 otherwise. */
  readonly units: number;
}

export interface PlacedSlot {
  readonly id: string;
  /** Left edge of the slot, in screen points. */
  readonly x: number;
  /** The slot's width; the icon is centred in it. */
  readonly width: number;
  /** The icon's drawn width (a gauge stretches to its slot, less the gap). */
  readonly iconWidth: number;
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
 * The one meter row, for every ruler: it spans the screen inside `margin` and the safe area, split
 * into equal units, one per meter (two per gauge), each icon centred in its slot, so neighbouring
 * centres are evenly spaced. Icons are drawn at `iconScale`; where neighbours would come closer than
 * `gap`, every icon shrinks by the same factor.
 */
export function meterRowLayout(
  screenWidth: number,
  slots: readonly MeterSlot[],
  { gap, margin, iconScale }: { readonly gap: number; readonly margin: number; readonly iconScale: number },
  insets: { readonly left: number; readonly right: number } = { left: 0, right: 0 },
): MeterRowLayout {
  const left = margin + insets.left;
  const width = Math.max(0, screenWidth - left - margin - insets.right);
  const units = slots.reduce((sum, s) => sum + s.units, 0);
  const unit = units > 0 ? width / units : 0;
  // How far icons may grow (as a share of iconScale) before neighbours come closer than `gap`, or
  // the outermost icons leave the row. A gauge stretches to its slot less the gap, so beside one an
  // icon may use only its own slot less half the gap on that side.
  const limits: number[] = [];
  const size = (s: MeterSlot) => s.width * iconScale;
  const ends = [slots[0], slots[slots.length - 1]].filter((s) => s !== undefined && s.units === 1 && s.width > 0);
  for (const s of ends) limits.push((s.units * unit) / size(s));
  slots.forEach((b, i) => {
    const a = slots[i - 1];
    if (a === undefined) return;
    if (a.units === 1 && b.units === 1) limits.push(Math.max(0, unit - gap) / ((size(a) + size(b)) / 2));
    else {
      const icon = a.units === 1 ? a : b.units === 1 ? b : undefined;
      if (icon && icon.width > 0) limits.push(Math.max(0, unit - gap) / size(icon));
    }
  });
  const fit = Math.min(1, ...limits);
  const scale = iconScale * fit;
  let used = 0;
  const placed = slots.map((s) => {
    const slotWidth = s.units * unit;
    const slot = {
      id: s.id,
      x: left + used * unit,
      width: slotWidth,
      iconWidth: s.units > 1 ? Math.max(0, Math.min(slotWidth - gap, s.width * scale)) : s.width * scale,
    };
    used += s.units;
    return slot;
  });
  return { scale, left, width, slots: placed };
}

/**
 * Slots for a ruler's visible meters: fill icons at their natural aspect, gauges (balance art) two
 * units at their base width, and placeholder medals (meters without art) as circles of the fill
 * height.
 */
export function meterSlots(
  meters: readonly MeterDisplay[],
  skin: Pick<MeterSkin, 'art' | 'metrics' | 'layout'>,
  rulerId: string,
): MeterSlot[] {
  return meters.flatMap((m) => {
    const art = skin.art[rulerId]?.[m.id];
    if (!art) return [{ id: m.id, width: skin.layout.fillHeight, units: 1 }];
    if (isBalanceArt(art)) return [{ id: m.id, width: skin.layout.balanceWidth, units: 2 }];
    const aspect = skin.metrics[art.full]?.aspect ?? 1;
    return [{ id: m.id, width: skin.layout.fillHeight * aspect, units: 1 }];
  });
}
