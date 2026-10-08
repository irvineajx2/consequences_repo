// Display maths for meters. Pure TypeScript: values are shown visually, never as numbers.

export type MeterStyle = 'fill' | 'balance';

/** One entry of a ruler's ui.json `meters` list. Presentation only. */
export interface MeterDisplay {
  readonly id: string;
  readonly visible: boolean;
  readonly style?: MeterStyle;
  readonly warnBelow?: number;
  readonly warnAbove?: number;
}

export interface RulerUi {
  readonly meters: readonly MeterDisplay[];
}

/** Meters to show, in display order. Hidden meters are never shown. */
export function visibleMeters(ui: RulerUi): readonly MeterDisplay[] {
  return ui.meters.filter((m) => m.visible);
}

/** A value as a 0..1 fraction of the meter range. */
export function fillFraction(value: number, [lo, hi]: readonly [number, number]): number {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
}

/** Chevrons for a change: none for no change, one up to 5, two up to 10, three beyond. */
export function chevronCount(delta: number): 0 | 1 | 2 | 3 {
  const size = Math.abs(delta);
  if (size === 0) return 0;
  if (size <= 5) return 1;
  if (size <= 10) return 2;
  return 3;
}

/** Whether the value is past one of the meter's warning thresholds. */
export function isWarning(meter: MeterDisplay, value: number): boolean {
  return (
    (meter.warnBelow !== undefined && value < meter.warnBelow) ||
    (meter.warnAbove !== undefined && value > meter.warnAbove)
  );
}

/** A word-sized reading of a meter for accessibility labels. */
export type MeterLevel = 'low' | 'steady' | 'strong' | 'left' | 'balanced' | 'right';

export function meterLevel(meter: MeterDisplay, value: number, range: readonly [number, number]): MeterLevel {
  const f = fillFraction(value, range);
  if (meter.style === 'balance') {
    if (f < 0.4) return 'left';
    if (f > 0.6) return 'right';
    return 'balanced';
  }
  if (f < 1 / 3) return 'low';
  if (f < 2 / 3) return 'steady';
  return 'strong';
}
