// Where the battle map sits on screen and where each sector is on it. Sector positions come from the
// art chat's <battle>_map_sectors.json (or the placeholder in the same shape) as fractions of the map
// image; the map is drawn so its battlefield fills the space between the header and the phase panel.

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface SectorPosition {
  /** Where the sector's marker sits, as fractions of the map image. */
  readonly anchor: Point;
  /** Its rough shape, as fractions of the map image (may be empty). */
  readonly outline: readonly Point[];
}

export interface SectorMap {
  readonly sectors: Readonly<Record<string, SectorPosition>>;
  /** The placeholder file, not the art chat's. */
  readonly placeholder: boolean;
}

const point = (v: unknown): Point | null => {
  if (Array.isArray(v) && typeof v[0] === 'number' && typeof v[1] === 'number') return { x: v[0], y: v[1] };
  if (v && typeof v === 'object' && typeof (v as Point).x === 'number' && typeof (v as Point).y === 'number') {
    return { x: (v as Point).x, y: (v as Point).y };
  }
  return null;
};

/**
 * Reads a sector positions file. Accepts sectors keyed by id or as a list with ids, points as [x, y]
 * or {x, y}, and an anchor from `anchor` (or the outline's centre). Unreadable sectors are left out.
 */
export function parseSectorMap(file: unknown): SectorMap {
  const raw = file && typeof file === 'object' ? (file as Record<string, unknown>) : {};
  const list = raw.sectors;
  const entries: [string, unknown][] = Array.isArray(list)
    ? list.map((s): [string, unknown] => [String((s as { id?: unknown })?.id ?? ''), s])
    : list && typeof list === 'object'
      ? Object.entries(list as Record<string, unknown>)
      : [];
  const sectors: Record<string, SectorPosition> = {};
  for (const [id, s] of entries) {
    if (!id || !s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    const outline = (Array.isArray(o.outline) ? o.outline : Array.isArray(o.polygon) ? o.polygon : []).map(point).filter((p): p is Point => p !== null);
    const centre = outline.length
      ? { x: outline.reduce((a, p) => a + p.x, 0) / outline.length, y: outline.reduce((a, p) => a + p.y, 0) / outline.length }
      : null;
    const anchor = point(o.anchor) ?? point(o.center) ?? point(o.centre) ?? centre;
    if (anchor) sectors[id] = { anchor, outline };
  }
  return { sectors, placeholder: raw.placeholder === true };
}

/** The battlefield's band of the map image (fractions of its height): what must stay in view. */
export const BATTLEFIELD = { top: 0.02, bottom: 0.58 } as const;

export interface MapFit {
  /** The image's drawn size and top-left corner on screen. */
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly top: number;
}

/**
 * Sizes the map so its whole battlefield band fits the area from `areaTop` to `areaBottom` (screen
 * points), centred across: on a tall screen the sides are cropped; on a short one (a small phone,
 * where the phase panel takes much of the height) the map is narrower than the screen and a dimmed
 * copy fills the sides, so every sector stays in view.
 */
export function fitMap(image: { width: number; height: number }, screenWidth: number, areaTop: number, areaBottom: number): MapFit {
  const band = (BATTLEFIELD.bottom - BATTLEFIELD.top) * image.height;
  const scale = (areaBottom - areaTop) / band;
  const width = image.width * scale;
  const height = image.height * scale;
  // The band's centre sits at the area's centre.
  const bandCentre = ((BATTLEFIELD.top + BATTLEFIELD.bottom) / 2) * height;
  return { width, height, left: (screenWidth - width) / 2, top: (areaTop + areaBottom) / 2 - bandCentre };
}

/** A point on the map image (fractions) on screen, kept `margin` inside the screen's sides. */
export function toScreen(fit: MapFit, p: Point, screenWidth: number, margin = 0): Point {
  const x = fit.left + p.x * fit.width;
  return { x: Math.min(Math.max(x, margin), screenWidth - margin), y: fit.top + p.y * fit.height };
}
