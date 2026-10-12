// The level plate's art: the XP bar, the level medallion, the gold coin and the ending-band gem.
import { useEffect, useState } from 'react';
import { Image, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSkin } from '../skin/SkinProvider';

/**
 * The XP bar: two end caps at their natural width and a stretched middle, with the fill drawn in
 * code over the bar's interior as a rounded bar inside the fill insets. `fraction` (0..1) animates over `durationMs`.
 */
export function XpBar({ fraction, durationMs = 0, scale = 1 }: { fraction: number; durationMs?: number; scale?: number }) {
  const { progression } = useSkin();
  const { bar } = progression.layout;
  const [width, setWidth] = useState(0);
  const level = useSharedValue(fraction);
  const height = bar.heightPt * scale;
  const inset = {
    left: bar.fillInsetPt.left * scale,
    right: bar.fillInsetPt.right * scale,
    top: bar.fillInsetPt.top * scale,
    bottom: bar.fillInsetPt.bottom * scale,
  };
  const track = Math.max(0, width - inset.left - inset.right);
  const fillHeight = height - inset.top - inset.bottom;

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
      <View style={[styles.row, StyleSheet.absoluteFill, styles.passThrough]}>
        <Image source={progression.images.bar_left} resizeMode="stretch" style={{ width: bar.capLeftWidthPt * scale, height }} />
        <Image source={progression.images.bar_mid} resizeMode="stretch" style={{ flex: 1, height }} />
        <Image source={progression.images.bar_right} resizeMode="stretch" style={{ width: bar.capRightWidthPt * scale, height }} />
      </View>
      <Animated.View
        style={[
          styles.fill,
          {
            left: inset.left,
            top: inset.top,
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

/** The level medallion, with the level number centred inside its rim. */
export function Medallion({ level, size }: { level: number; size?: number }) {
  const skin = useSkin();
  const { medallion, medallion_text: centre } = skin.progression.layout;
  const height = size ?? medallion.heightPt;
  const width = height * medallion.aspect;
  const inner = width * centre.interiorRadiusFraction * 2;
  const digits = String(level).length;
  return (
    <View style={{ width, height }} accessibilityRole="image" accessibilityLabel={`Level ${level}`}>
      <Image source={skin.progression.images.medallion} resizeMode="contain" style={{ width, height }} />
      <Text
        style={[
          styles.levelNumber,
          {
            left: width * centre.centreX - inner / 2,
            top: height * centre.centreY - inner / 2,
            width: inner,
            height: inner,
            lineHeight: inner,
            fontSize: inner * (digits > 2 ? 0.48 : digits > 1 ? 0.62 : 0.8),
            fontFamily: skin.fonts.caption,
            color: skin.progression.colors.level,
          },
        ]}
      >
        {level}
      </Text>
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

/** The gem for an ending band (common, uncommon, rare, legendary). */
export function BandGem({ band, size = 14 }: { band: string; size?: number }) {
  const { progression } = useSkin();
  const name = progression.layout.gems[band];
  const source = name !== undefined ? progression.images[name] : undefined;
  if (source === undefined) return null;
  return <Image source={source} resizeMode="contain" style={{ width: size, height: size }} />;
}

const styles = StyleSheet.create({
  bar: { justifyContent: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { position: 'absolute' },
  passThrough: { pointerEvents: 'none' },
  levelNumber: { position: 'absolute', textAlign: 'center' },
});
