// A cosmetic skin: everything the panel and buttons draw with. Insets are in source pixels;
// `scale` is display points per source pixel. Paddings and heights are in points.
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';

/** A placeholder icon name; illustrated icons can replace these later. */
export type MeterIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface MeterSkin {
  /** Icon for each meter id, with a fallback for meters the skin does not know. */
  readonly icons: Readonly<Record<string, MeterIconName>>;
  readonly fallbackIcon: MeterIconName;
  readonly iconSize: number;
  readonly colors: {
    /** The translucent strip behind the meters. */
    readonly strip: string;
    /** The unfilled copy of a fill icon. */
    readonly iconDim: string;
    readonly iconBright: string;
    /** Icon colour while a meter is past a warning threshold. */
    readonly warning: string;
    readonly chevron: string;
    readonly track: string;
    readonly marker: string;
  };
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
