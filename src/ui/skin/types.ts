// A cosmetic skin: everything the panel and buttons draw with. Insets are in source pixels;
// `scale` is display points per source pixel. Paddings and heights are in points.
import type { ImageSourcePropType } from 'react-native';

/** A fill meter: the full-colour icon drains down to its greyed `empty` copy. */
export interface FillMeterArt {
  readonly full: string;
  readonly empty: string;
}

/** A balance meter: a `marker` sliding along a track between a `left` and a `right` end. */
export interface BalanceMeterArt {
  readonly marker: string;
  readonly left: string;
  readonly right: string;
}

export type MeterArt = FillMeterArt | BalanceMeterArt;

/** Size of a meter image. Shadow and glow images are larger by `effectPadPt` on every side. */
export interface MeterImageMetrics {
  readonly heightPt: number;
  /** Width / height. */
  readonly aspect: number;
  readonly effectPadPt: number;
}

/**
 * Illustrated meters. Images are named by convention: `<name>`, `<name>_shadow`, `<name>_glow`
 * (fill icons and the marker) and `<name>_empty` (fill icons).
 */
export interface MeterSkin {
  /** Art for each meter id. */
  readonly art: Readonly<Record<string, MeterArt>>;
  readonly metrics: Readonly<Record<string, MeterImageMetrics>>;
  /** Every meter image by name, variants included. */
  readonly images: Readonly<Record<string, ImageSourcePropType>>;
  readonly layout: {
    /** Height of a fill icon in the row, before scaling. */
    readonly fillHeight: number;
    /** Width of a balance meter's slot, before scaling. */
    readonly balanceWidth: number;
    readonly gap: number;
    /** Minimum space either side of the row. */
    readonly margin: number;
    /** How far the soft shadow sits below its icon. */
    readonly shadowOffset: number;
  };
  readonly colors: {
    /** The dark line under a balance track. */
    readonly trackBacking: string;
    /** The track inside the safe band, and beyond it. */
    readonly trackSafe: string;
    readonly trackDanger: string;
    readonly chevronUp: string;
    readonly chevronDown: string;
  };
}

export const isBalanceArt = (art: MeterArt): art is BalanceMeterArt => 'marker' in art;

/** Every meter image name a skin uses, with the variants each kind of image has. */
export function meterImageNames(meters: Pick<MeterSkin, 'art'>): string[] {
  return Object.values(meters.art).flatMap((art) =>
    isBalanceArt(art)
      ? [
          art.marker, `${art.marker}_shadow`, `${art.marker}_glow`,
          art.left, `${art.left}_shadow`,
          art.right, `${art.right}_shadow`,
        ]
      : [art.full, `${art.full}_shadow`, `${art.full}_glow`, art.empty],
  );
}

/** Colours for screens drawn on the dark background (chronicle, endings, title). */
export interface ScreenSkin {
  readonly text: string;
  readonly mutedText: string;
  /** Matched decisions in the chronicle. */
  readonly highlight: string;
  readonly highlightFill: string;
  /** Darkens a locked ending's image. */
  readonly lockedOverlay: string;
}

export interface SliceFrame {
  /** Slice images are named `<prefix>_tl`, `<prefix>_t`, ... `<prefix>_br`. */
  readonly prefix: string;
  readonly inset: number;
  /** Whether a `<prefix>_c` centre slice exists. */
  readonly hasCentre?: boolean;
}

export interface Padding {
  readonly horizontal: number;
  readonly vertical: number;
}

export type OrnamentAnchor = 'top-center' | 'bottom-center';

export interface Ornament {
  readonly image: string;
  readonly anchor: OrnamentAnchor;
}

export interface PanelSkin {
  readonly frame: SliceFrame;
  /** Drawn underneath the frame, inset from the outer edge by `inset` source pixels. */
  readonly fill?: { readonly image: string; readonly inset: number };
  readonly ornaments?: readonly Ornament[];
  readonly scale: number;
  readonly contentPadding: Padding;
}

export interface ButtonSkin {
  readonly frame: SliceFrame;
  readonly scale: number;
  readonly minHeight: number;
  readonly contentPadding: Padding;
  readonly pressed: { readonly overlay: string; readonly scale: number };
  readonly disabledOpacity: number;
}

export interface Skin {
  readonly id: string;
  readonly name: string;
  readonly panel: PanelSkin;
  readonly button: ButtonSkin;
  readonly colors: {
    readonly panelText: string;
    readonly panelCaption: string;
    readonly buttonText: string;
    readonly screenBackground: string;
  };
  /** Font family names, as registered when fonts load. */
  readonly fonts: { readonly caption: string; readonly body: string; readonly button: string };
  /** Every image the skin names, by name. */
  readonly images: Readonly<Record<string, ImageSourcePropType>>;
  readonly meters: MeterSkin;
  readonly screen: ScreenSkin;
}

export const SLICE_NAMES = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'] as const;

/** Names of every image a skin refers to. */
export function skinImageNames(skin: Pick<Skin, 'panel' | 'button'>): string[] {
  const frame = (f: SliceFrame) => [
    ...SLICE_NAMES.map((s) => `${f.prefix}_${s}`),
    ...(f.hasCentre ? [`${f.prefix}_c`] : []),
  ];
  return [
    ...frame(skin.panel.frame),
    ...(skin.panel.fill ? [skin.panel.fill.image] : []),
    ...(skin.panel.ornaments ?? []).map((o) => o.image),
    ...frame(skin.button.frame),
  ];
}

export function skinImage(skin: Skin, name: string): ImageSourcePropType {
  const image = skin.images[name];
  if (image === undefined) throw new Error(`Skin "${skin.id}" has no image "${name}"`);
  return image;
}
