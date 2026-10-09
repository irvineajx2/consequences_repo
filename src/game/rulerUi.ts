// A ruler's presentation data (ui.json): no rules, only how the reign is shown.
import type { MeterDisplay } from './meters';

/** An era begins at its `startsAt` scene; a scene belongs to the last era starting at or before it. */
export interface Era {
  readonly id: string;
  readonly startsAt: string;
  readonly image: string;
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
  for (const era of ui.eras ?? []) ids.add(era.image);
  if (ui.title) ids.add(ui.title.background);
  if (ui.rulerCard) ids.add(ui.rulerCard.image);
  return ids;
}
