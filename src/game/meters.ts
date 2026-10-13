// Display maths for meters. Pure TypeScript: values are shown visually, never as numbers.
import { type Condition, type GameState, matches } from '../core';

export type MeterStyle = 'fill' | 'balance';

/** One entry of a ruler's ui.json `meters` list. Presentation only. */
export interface MeterDisplay {
  readonly id: string;
  readonly visible: boolean;
  readonly style?: MeterStyle;
  readonly warnBelow?: number;
  readonly warnAbove?: number;
  /** The warnings apply only while this holds (e.g. an army that can only fail in wartime). */
  readonly warnIf?: Condition;
}

/** The meter as it should show for the run's state: without its warnings while `warnIf` fails. */
export function meterForState(meter: MeterDisplay, state: GameState): MeterDisplay {
  if (meter.warnIf === undefined || matches(state, meter.warnIf)) return meter;
  const { warnBelow: _below, warnAbove: _above, ...rest } = meter;
  return rest;
}

/** Meters to show, in display order. Hidden meters are never shown. */
export function visibleMeters(ui: { readonly meters: readonly MeterDisplay[] }): readonly MeterDisplay[] {
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

/** The state word a fill meter shows (tooltip and accessibility label). Never a number. */
export type FillState = 'critical' | 'low' | 'steady' | 'strong' | 'formidable';

/** The state word a balance meter shows; `left` and `right` are the track's two ends. */
export type BalanceState = 'dangerouslyLeft' | 'leaningLeft' | 'balanced' | 'leaningRight' | 'dangerouslyRight';

/** Fill bands, inclusive upper bounds: 0-15, 16-35, 36-65, 66-85, 86-100. */
const FILL_BANDS: readonly [number, FillState][] = [
  [15, 'critical'],
  [35, 'low'],
  [65, 'steady'],
  [85, 'strong'],
];

/** Inside the warn thresholds, a balance meter leans below 45 and above 55. */
const BALANCE_LEAN_BELOW = 45;
const BALANCE_LEAN_ABOVE = 55;

export function fillState(value: number): FillState {
  return FILL_BANDS.find(([max]) => value <= max)?.[1] ?? 'formidable';
}

/**
 * Balance bands: past `warnBelow`/`warnAbove` (25 and 75 for Religion) is dangerous; 25-44 and
 * 56-75 lean; 45-55 is balanced.
 */
export function balanceState(meter: MeterDisplay, value: number): BalanceState {
  if (meter.warnBelow !== undefined && value < meter.warnBelow) return 'dangerouslyLeft';
  if (meter.warnAbove !== undefined && value > meter.warnAbove) return 'dangerouslyRight';
  if (value < BALANCE_LEAN_BELOW) return 'leaningLeft';
  if (value > BALANCE_LEAN_ABOVE) return 'leaningRight';
  return 'balanced';
}

/** Visible height of a fill icon's full-colour copy: the colour drains downward as the meter falls. */
export function fillHeight(value: number, range: readonly [number, number], iconHeight: number): number {
  return fillFraction(value, range) * iconHeight;
}

/** Distance of a balance marker's centre from the start of its track. */
export function markerOffset(value: number, range: readonly [number, number], trackLength: number): number {
  return fillFraction(value, range) * trackLength;
}

export interface TrackSegment {
  /** 0..1 along the track. */
  readonly from: number;
  readonly to: number;
  readonly danger: boolean;
}

/** The balance track: danger beyond the warn thresholds, safe between them. */
export function trackSegments(meter: MeterDisplay, range: readonly [number, number]): TrackSegment[] {
  const low = meter.warnBelow !== undefined ? fillFraction(meter.warnBelow, range) : 0;
  const high = meter.warnAbove !== undefined ? fillFraction(meter.warnAbove, range) : 1;
  return [
    { from: 0, to: low, danger: true },
    { from: low, to: high, danger: false },
    { from: high, to: 1, danger: true },
  ].filter((s) => s.to > s.from);
}
