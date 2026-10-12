// The level plate's art: the XP bar, the rank-coloured level medallion, the gold coin and the ending-band gem.
import { useEffect, useState } from 'react';
import { Image, type LayoutChangeEvent, PixelRatio, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSkin } from '../skin/SkinProvider';
import { rankTitle } from '../../game/progression';
import { medallionBox, medallionTier, progressionImageMetrics } from '../skin/types';

/** Rounds a length to whole device pixels. */
const snap = (pt: number) => PixelRatio.roundToNearestPixel(pt);

/**
 * The XP bar: two end caps at their natural width and a stretched middle, with the fill drawn in
 * code over the bar's interior as a rounded bar inside the fill insets. Slice edges sit on whole
 * pixels and the middle overlaps each cap by one pixel, so no seam shows. `fraction` (0..1) animates over `durationMs`.
 */
export function XpBar({ fraction, durationMs = 0, scale = 1 }: { fraction: number; durationMs?: number; scale?: number }) {
  const { progression } = useSkin();
  const { bar } = progression.layout;
  const [width, setWidth] = useState(0);
  const level = useSharedValue(fraction);
  const height = snap(bar.heightPt * scale);
  const pixel = 1 / PixelRatio.get();
  const capLeft = snap(bar.capLeftWidthPt * scale);
  const capRight = snap(bar.capRightWidthPt * scale);
  const rightEdge = snap(width);
  const inset = {
    left: bar.fillInsetPt.left * scale,
    right: bar.fillInsetPt.right * scale,
    top: bar.fillInsetPt.top * scale,
    bottom: bar.fillInsetPt.bottom * scale,
  };
  const track = Math.max(0, width - inset.left - inset.right);
  const fillHeight = snap(height - inset.top - inset.bottom);

  useEffect(() => {
    level.set(
      durationMs > 0
        ? withTiming(Math.max(0, Math.min(1, fraction)), { duration: durationMs, easing: Easing.out(Easing.cubic) })
        : Math.max(0, Math.min(1, fraction)),
    );
  }, [fraction, durationMs, level]);

  const fillStyle = useAnimatedStyle(() => ({ width: level.get() * track }));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[styles.bar, { height }]}>
      {width > 0 && (
        <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
          <Image
            source={progression.images.bar_mid}
            resizeMode="stretch"
            style={[
              styles.slice,
              { left: capLeft - pixel, width: Math.max(0, rightEdge - capRight - capLeft + 2 * pixel), height },
            ]}
          />
          <Image source={progression.images.bar_left} resizeMode="stretch" style={[styles.slice, { left: 0, width: capLeft, height }]} />
          <Image
            source={progression.images.bar_right}
            resizeMode="stretch"
            style={[styles.slice, { left: rightEdge - capRight, width: capRight, height }]}
          />
        </View>
      )}
      <Animated.View
        style={[
          styles.fill,
          {
            left: snap(inset.left),
            top: snap(inset.top),
            height: fillHeight,
            borderRadius: fillHeight / 2,
            backgroundColor: progression.colors.xpFill,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

/**
 * The level medallion in its rank's colour, with the level number centred inside its rim. Higher
 * ranks' medallions are larger; `scale` scales them all alike.
 */
export function Medallion({ level, scale = 1 }: { level: number; scale?: number }) {
  const skin = useSkin();
  const tier = medallionTier(skin.progression.ranks, rankTitle(level));
  const height = tier.heightPt * scale;
  const width = height * tier.aspect;
  const inner = width * tier.text.interiorRadiusFraction * 2;
  const digits = String(level).length;
  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel={`Level ${level}`}>
      <Image source={skin.progression.images[tier.image]} resizeMode="contain" style={{ width, height }} />
      <Text
        style={[
          styles.levelNumber,
          {
            left: width * tier.text.centreX - inner / 2,
            top: height * tier.text.centreY - inner / 2,
            width: inner,
            height: inner,
            lineHeight: inner,
            fontSize: inner * (digits > 2 ? 0.5 : digits > 1 ? 0.64 : 0.8),
            fontFamily: skin.fonts.caption,
            color: tier.textColour === 'dark' ? skin.colors.panelText : skin.progression.colors.level,
          },
        ]}
      >
        {level}
      </Text>
    </View>
  );
}

/** A medallion in a box that fits every rank's, so what sits beside it never moves on rank-up. */
export function MedallionSlot({ level, scale = 1 }: { level: number; scale?: number }) {
  const { progression } = useSkin();
  return (
    <View style={[medallionBox(progression.ranks, scale), styles.centred]}>
      <Medallion level={level} scale={scale} />
    </View>
  );
}

/** The gold coin. */
export function Coin({ size }: { size?: number }) {
  const { progression } = useSkin();
  const height = size ?? progression.layout.coin.heightPt;
  return (
    <Image
      source={progression.images.coin}
      resizeMode="contain"
      style={{ width: height * progression.layout.coin.aspect, height }}
    />
  );
}

/** The gem for an ending band (common, uncommon, rare, legendary), at its layout size by default. */
export function BandGem({ band, size }: { band: string; size?: number }) {
  const { progression } = useSkin();
  const name = progression.layout.gems[band];
  const source = name !== undefined ? progression.images[name] : undefined;
  const metrics = name !== undefined ? progressionImageMetrics(progression.layout)[name] : undefined;
  if (source === undefined || metrics === undefined) return null;
  const height = size ?? metrics.heightPt;
  return <Image source={source} resizeMode="contain" style={{ width: height * metrics.aspect, height }} />;
}

const styles = StyleSheet.create({
  bar: { justifyContent: 'center', alignSelf: 'stretch' },
  slice: { position: 'absolute', top: 0 },
  fill: { position: 'absolute' },
  passThrough: { pointerEvents: 'none' },
  levelNumber: { position: 'absolute', textAlign: 'center' },
  centred: { alignItems: 'center', justifyContent: 'center' },
});
