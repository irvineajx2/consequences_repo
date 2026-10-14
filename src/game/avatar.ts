// The living avatar's data and its render plan: which art layers to draw, in which order, with which
// erase masks and cut-offs. A port of render() in tools/avatar/render_reference.py, which is the
// source of truth: the app's output must match it. Pure TypeScript (drawing is in src/ui/avatar).
import catalogueJson from '../../assets/avatar/avatar.catalogue.json';

export interface PieceRef {
  /** Null where an item has no such piece (the legionary has no shirt strip). */
  readonly piece: string | null;
  readonly layer: number;
}

export interface AvatarBase {
  readonly thighs: PieceRef;
  readonly body: PieceRef;
  readonly eyesClosed: PieceRef;
  readonly arms: PieceRef;
  readonly frontHair?: PieceRef;
  readonly hands: PieceRef;
  readonly bandHideMask: string;
  readonly label: string;
}

export type ItemUnlock =
  | { readonly type: 'free' }
  | { readonly type: 'gold'; readonly price: number | null }
  | { readonly type: 'achievement'; readonly rule: string };

export interface AvatarItem {
  readonly name: string;
  /** "set": head, top and bottoms can each be worn; "full": one piece replacing top and bottoms. */
  readonly slot: 'set' | 'full';
  readonly slots: readonly AvatarSlot[];
  /** Canvas row of the waistband: decides whether a top's extension shows over other bottoms. */
  readonly waist?: number;
  /** Canvas row of the top of an overlay (the sash): bottoms layered above the top stop here. */
  readonly overlayTop?: number;
  readonly pieces: Readonly<Record<string, PieceRef>>;
  readonly topBodyHide?: string;
  readonly topArmsHide?: string;
  readonly bottomsBodyHide?: string;
  readonly bottomsArmsHide?: string;
  /** By base id: the mask erasing the hair under this head piece (null: that base needs none). */
  readonly hairHide?: Readonly<Record<string, string | null>>;
  readonly unlock: ItemUnlock;
  /** A historical note, shown in the dressing room. */
  readonly note: string;
  readonly rulerSet: string | null;
}

export type AvatarSlot = 'head' | 'top' | 'bottoms';

export interface AvatarCatalogue {
  readonly version: number;
  readonly canvas: readonly [number, number];
  readonly bases: Readonly<Record<string, AvatarBase>>;
  readonly items: Readonly<Record<string, AvatarItem>>;
  /** Every image by name: its file and where its top-left corner sits on the canvas. */
  readonly files: Readonly<Record<string, { readonly file: string; readonly x: number; readonly y: number }>>;
  readonly anchors: {
    readonly groundLineY: number;
    readonly feetCentreX: number;
    readonly neckPivot: readonly [number, number];
    readonly eyeLineY: number;
    readonly waistBandY: number;
    readonly bustCrop: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  };
  readonly backgroundColour: string;
}

export const avatarCatalogue = catalogueJson as unknown as AvatarCatalogue;

/** What the player wears. A `full` item worn as the top replaces the bottoms. */
export interface Outfit {
  readonly base: string;
  readonly head?: string;
  readonly top?: string;
  readonly bottoms?: string;
}

export const DEFAULT_OUTFIT: Outfit = { base: 'b1', top: 'starter', bottoms: 'starter' };

/** One layer to draw: an image, erased by masks (alpha x (1 - mask)), keeping only some rows. */
export interface DrawOp {
  readonly layer: number;
  readonly image: string;
  readonly masks: readonly string[];
  /** Keep only canvas rows from `fromY` (inclusive) to `toY` (exclusive). */
  readonly fromY?: number;
  readonly toY?: number;
}

/**
 * The layers for an outfit, in drawing order (ascending layer; ties keep the order added, as the
 * reference does). Steps mirror render() in tools/avatar/render_reference.py.
 */
export function renderPlan(outfit: Outfit, eyesClosed: boolean, cat: AvatarCatalogue = avatarCatalogue): DrawOp[] {
  const B = cat.bases[outfit.base];
  if (!B) throw new Error(`Unknown avatar base "${outfit.base}"`);
  const T = outfit.top !== undefined ? cat.items[outfit.top] : undefined;
  // A full item replaces the bottoms.
  const bottomsId = T?.slot === 'full' ? undefined : outfit.bottoms;
  const Bt = bottomsId !== undefined ? cat.items[bottomsId] : undefined;
  const H = outfit.head !== undefined ? cat.items[outfit.head] : undefined;
  const ops: DrawOp[] = [];
  const add = (layer: number, image: string | null, masks: readonly (string | null | undefined)[] = [], rows: Pick<DrawOp, 'fromY' | 'toY'> = {}) => {
    // A piece an item doesn't have is simply not drawn.
    if (image !== null) ops.push({ layer, image, masks: masks.filter((m): m is string => typeof m === 'string'), ...rows });
  };

  // 1. Body erase masks: under a top, and under bottoms (with the base's waistband mask).
  const bodyMasks: (string | undefined)[] = [];
  const armMasks: (string | undefined)[] = [];
  if (T) {
    bodyMasks.push(T.topBodyHide);
    armMasks.push(T.topArmsHide);
  }
  if (Bt) {
    bodyMasks.push(Bt.bottomsBodyHide, B.bandHideMask);
    armMasks.push(Bt.bottomsArmsHide);
  }
  // 2. Hair under the head item.
  const hair = H?.hairHide?.[outfit.base];

  add(-1, B.thighs.piece);
  add(0, B.body.piece, [...bodyMasks, hair]);
  if (eyesClosed) add(1, B.eyesClosed.piece);
  add(65, B.arms.piece, armMasks);
  if (B.frontHair) add(80, B.frontHair.piece, [hair]);
  add(90, B.hands.piece);

  if (T) {
    const P = T.pieces;
    if (T.slot === 'full') add(P.full.layer, P.full.piece);
    else {
      add(P.top.layer, P.top.piece);
      // 3. The top's extension shows when other bottoms sit lower, cut just below their waist.
      if (Bt && bottomsId !== outfit.top && (Bt.waist ?? 0) > (T.waist ?? 0) + 4) {
        add(P.topExtension.layer, P.topExtension.piece, [], { toY: (Bt.waist ?? 0) + 6 });
      }
      add(70, P.sleeves.piece);
      if (P.overlay) add(75, P.overlay.piece);
      if (P.back) add(-5, P.back.piece);
    }
  }
  if (Bt) {
    const bp = Bt.pieces.bottoms;
    // 4. Bottoms layered above the top stop under its overlay (the sash).
    const clip = T && T.overlayTop !== undefined && bp.layer > T.pieces.top.layer ? { fromY: T.overlayTop } : {};
    add(bp.layer, bp.piece, [], clip);
    // 5. The shirt strip only shows with bottoms and no top.
    if (!T) add(10, Bt.pieces.shirtStrip.piece);
  }
  if (H?.pieces.head) add(H.pieces.head.layer, H.pieces.head.piece);

  return ops.map((op, i) => ({ op, i })).sort((a, b) => a.op.layer - b.op.layer || a.i - b.i).map((x) => x.op);
}

/** Every image a plan needs (pieces and masks). */
export function planImages(plan: readonly DrawOp[]): string[] {
  return [...new Set(plan.flatMap((op) => [op.image, ...op.masks]))];
}

/** Equips an item in a slot, keeping the outfit consistent: a full item clears the bottoms, a top or
 * bottoms clears a worn full item. */
export function equip(outfit: Outfit, slot: AvatarSlot, itemId: string | undefined, cat: AvatarCatalogue = avatarCatalogue): Outfit {
  const { [slot]: _old, ...rest } = outfit;
  const next: Outfit = itemId === undefined ? rest : { ...rest, [slot]: itemId };
  const worn = next.top !== undefined ? cat.items[next.top] : undefined;
  if (slot === 'top' && cat.items[itemId ?? '']?.slot === 'full') {
    const { bottoms: _b, ...withoutBottoms } = next;
    return withoutBottoms;
  }
  if (slot === 'bottoms' && itemId !== undefined && worn?.slot === 'full') {
    const { top: _t, ...withoutTop } = next;
    return withoutTop;
  }
  return next;
}
