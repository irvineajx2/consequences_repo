import { type ReactNode, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  PixelRatio,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { assetSize } from './assetSize';
import { nineSliceLayout, type Rect, type SliceName } from './nineSliceLayout';
import type { Ornament, Padding, SliceFrame } from './types';

interface Props {
  readonly frame: SliceFrame;
  readonly scale: number;
  readonly images: Readonly<Record<string, ImageSourcePropType>>;
  readonly fill?: { readonly image: string; readonly inset: number };
  readonly ornaments?: readonly Ornament[];
  readonly contentPadding: Padding;
  /** Colour drawn over the frame in the frame's own shape, e.g. a pressed-state overlay. */
  readonly tint?: string;
  readonly style?: StyleProp<ViewStyle>;
  readonly children?: ReactNode;
}

const EDGES: readonly SliceName[] = ['t', 'l', 'r', 'b'];
const CORNERS: readonly SliceName[] = ['tl', 'tr', 'bl', 'br'];

function sliceImage(images: Props['images'], name: string): ImageSourcePropType {
  const image = images[name];
  if (image === undefined) throw new Error(`Missing skin image "${name}"`);
  return image;
}

function Piece({ source, rect, tint }: { source: ImageSourcePropType; rect: Rect; tint?: string }) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return (
    <Image
      source={source}
      resizeMode="stretch"
      fadeDuration={0}
      style={[
        styles.piece,
        { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
        tint !== undefined && { tintColor: tint },
      ]}
    />
  );
}

/**
 * A frame drawn from separate slice images (the same on iOS, Android and web). Layers, bottom to
 * top: fill, edges (and centre), corners, ornaments, then the children inside the content padding.
 * The frame measures itself, so its height follows its content.
 */
export function NineSlice({
  frame,
  scale,
  images,
  fill,
  ornaments,
  contentPadding,
  tint,
  style,
  children,
}: Props) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (size?.width !== width || size?.height !== height) setSize({ width, height });
  };

  const pixelRatio = PixelRatio.get();
  const round = (v: number) => PixelRatio.roundToNearestPixel(v);
  const image = (slice: string) => sliceImage(images, `${frame.prefix}_${slice}`);
  const middle: readonly SliceName[] = frame.hasCentre ? ['c', ...EDGES] : EDGES;

  let layers: ReactNode = null;
  if (size) {
    const layout = nineSliceLayout(size.width, size.height, frame.inset, scale, { pixelRatio });
    const shrink = layout.shrink;
    const fillInset = fill ? round(fill.inset * scale * shrink) : 0;
    // Overlays must not overlap themselves, or seams would show twice as dark.
    const tintLayout =
      tint !== undefined
        ? nineSliceLayout(size.width, size.height, frame.inset, scale, { pixelRatio, overlap: false })
        : null;

    layers = (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {fill && (
          <Piece
            source={sliceImage(images, fill.image)}
            rect={{
              x: fillInset,
              y: fillInset,
              width: Math.max(0, round(size.width) - 2 * fillInset),
              height: Math.max(0, round(size.height) - 2 * fillInset),
            }}
          />
        )}
        {middle.map((s) => (
          <Piece key={s} source={image(s)} rect={layout.slices[s]} />
        ))}
        {CORNERS.map((s) => (
          <Piece key={s} source={image(s)} rect={layout.slices[s]} />
        ))}
        {(ornaments ?? []).map((o) => {
          const source = sliceImage(images, o.image);
          const natural = assetSize(source);
          const width = round((natural?.width ?? 0) * scale * shrink);
          const height = round((natural?.height ?? 0) * scale * shrink);
          const x = round((size.width - width) / 2);
          const y = o.anchor === 'top-center' ? 0 : round(size.height) - height;
          return <Piece key={o.image} source={source} rect={{ x, y, width, height }} />;
        })}
        {tintLayout &&
          [...middle, ...CORNERS].map((s) => (
            <Piece key={`tint-${s}`} source={image(s)} rect={tintLayout.slices[s]} tint={tint} />
          ))}
      </View>
    );
  }

  return (
    <View
      onLayout={onLayout}
      style={[
        { paddingHorizontal: contentPadding.horizontal, paddingVertical: contentPadding.vertical },
        style,
      ]}
    >
      {layers}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute' },
});
