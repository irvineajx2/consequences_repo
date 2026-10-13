// A ruler's presentation data (ui.json): no rules, only how the reign is shown.
import type { Condition } from '../core';
import type { MeterDisplay } from './meters';

/**
 * An era card shown instead of the usual one when its condition holds as the card appears (e.g. a
 * reign that reached the era by another road). Its id keys the era text.
 */
export interface EraVariant {
  readonly id: string;
  readonly if: Condition;
  readonly image: string;
}

/** An era begins at its `startsAt` scene; a scene belongs to the last era starting at or before it. */
export interface Era {
  readonly id: string;
  readonly startsAt: string;
  readonly image: string;
  /** Alternative cards for this era; the first whose condition holds is shown. */
  readonly variants?: readonly EraVariant[];
}

export interface RulerUi {
  readonly meters: readonly MeterDisplay[];
  /** The slide before the first era card of a new run. */
  readonly prologue?: { readonly image: string };
  /** In scene order. */
  readonly eras?: readonly Era[];
  /** The title screen backdrop, when this ruler is featured there. */
  readonly title?: { readonly background: string };
  /** The portrait on the ruler-select card. */
  readonly rulerCard?: { readonly image: string };
}

/** Every image id ui.json refers to. */
export function uiImageIds(ui: RulerUi): ReadonlySet<string> {
  const ids = new Set<string>();
  if (ui.prologue) ids.add(ui.prologue.image);
  for (const era of ui.eras ?? []) {
    ids.add(era.image);
    for (const v of era.variants ?? []) ids.add(v.image);
  }
  if (ui.title) ids.add(ui.title.background);
  if (ui.rulerCard) ids.add(ui.rulerCard.image);
  return ids;
}
