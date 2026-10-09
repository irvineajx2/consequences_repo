import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GameState } from '../../core';
import {
  chevronCount,
  fillFraction,
  isWarning,
  type MeterDisplay,
  trackSegments,
  visibleMeters,
} from '../../game/meters';
import { assetSize } from '../skin/assetSize';
import { useRuler } from '../RulerContext';
import { useSkin } from '../skin/SkinProvider';
import { type BalanceMeterArt, type FillMeterArt, isBalanceArt, type MeterSkin } from '../skin/types';
import { format, strings } from '../strings';
import { spacing, textSizes } from '../theme';
import { meterRowLayout, meterSlots } from './meterRowLayout';
import { stateWord } from './stateWord';

const CHANGE_MS = 600;
const CHEVRON_FADE_MS = 500;
const BOUNCE_MS = 250;
/** A full glow cycle (dim and back) takes about 1.2 s. */
const PULSE_HALF_MS = 600;
const PULSE_MIN = 0.35;
const TOOLTIP_MS = 2500;
const TOOLTIP_WIDTH = 180;

interface Props {
  readonly state: GameState;
}

/**
 * The visible meters as one centred row of illustrated icons floating over the scene, just below
 * the top safe area. Tapping a meter shows its name and state word. No numbers are ever shown.
 */
export function MeterStrip({ state }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { meters: skin } = useSkin();
  const ruler = useRuler();
  const { text, ui } = ruler;
  const range = ruler.rules.meter_range;
  const meters = visibleMeters(ui);
  const layout = meterRowLayout(screenWidth, meterSlots(meters, skin, ruler.id), skin.layout);
  const rowHeight = skin.layout.fillHeight * layout.scale;
  const [tooltip, setTooltip] = useState<string | null>(null);

  // A tooltip fades after 2.5 s, or on the next tap.
  useEffect(() => {
    if (tooltip === null) return;
    const timer = setTimeout(() => setTooltip(null), TOOLTIP_MS);
    return () => clearTimeout(timer);
  }, [tooltip]);

  const tapped = tooltip !== null ? meters.find((m) => m.id === tooltip) : undefined;
  const tappedSlot = layout.slots.find((s) => s.id === tooltip);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + spacing.xs }]}>
      <View pointerEvents="box-none" style={{ height: rowHeight }}>
        {layout.slots.map((slot) => {
          const meter = meters.find((m) => m.id === slot.id);
          const art = skin.art[ruler.id]?.[slot.id];
          if (!meter) return null;
          const name = text.meters[meter.id]?.name ?? meter.id;
          const value = state.meters[meter.id] ?? range[0];
          const label = format(strings.meterLabel, {
            name,
            level: stateWord(meter, value, text),
          });
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => setTooltip(tooltip === slot.id ? null : slot.id)}
              style={[styles.slot, { left: slot.x, width: slot.width, height: rowHeight }]}
            >
              {art === undefined ? (
                <PlaceholderMedal
                  meter={meter}
                  initial={name.charAt(0)}
                  value={value}
                  range={range}
                  skin={skin}
                  scale={layout.scale}
                />
              ) : isBalanceArt(art) ? (
                <BalanceMeter
                  meter={meter}
                  art={art}
                  value={value}
                  range={range}
                  skin={skin}
                  scale={layout.scale}
                  width={slot.width}
                />
              ) : (
                <FillMeter meter={meter} art={art} value={value} range={range} skin={skin} scale={layout.scale} />
              )}
            </Pressable>
          );
        })}
      </View>
      {tapped && tappedSlot && (
        <Tooltip
          key={tapped.id}
          name={text.meters[tapped.id]?.name ?? tapped.id}
          word={stateWord(tapped, state.meters[tapped.id] ?? range[0], text)}
          left={Math.min(
            Math.max(spacing.sm, tappedSlot.x + tappedSlot.width / 2 - TOOLTIP_WIDTH / 2),
            screenWidth - spacing.sm - TOOLTIP_WIDTH,
          )}
        />
      )}
    </View>
  );
}

interface MeterProps {
  readonly meter: MeterDisplay;
  readonly value: number;
  readonly range: readonly [number, number];
  readonly skin: MeterSkin;
  readonly scale: number;
}

/**
 * Animates a meter's changes: the 0..1 level eases to its new value, chevrons show the direction
 * and size of the change before fading, and the icon bounces. Past a warn threshold the glow pulses.
 */
function useMeterAnimation(meter: MeterDisplay, value: number, range: readonly [number, number]) {
  const level = useSharedValue(fillFraction(value, range));
  const chevronOpacity = useSharedValue(0);
  const bounce = useSharedValue(1);
  const glow = useSharedValue(0);
  const previous = useRef(value);
  const [change, setChange] = useState<{ count: number; up: boolean }>({ count: 0, up: true });
  const warn = isWarning(meter, value);

  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    level.set(withTiming(fillFraction(value, range), { duration: CHANGE_MS, easing: Easing.out(Easing.cubic) }));
    const count = chevronCount(delta);
    if (count > 0) {
      setChange({ count, up: delta > 0 });
      chevronOpacity.set(1);
      chevronOpacity.set(withDelay(CHANGE_MS, withTiming(0, { duration: CHEVRON_FADE_MS })));
      bounce.set(withSequence(withTiming(1.12, { duration: BOUNCE_MS / 2 }), withTiming(1, { duration: BOUNCE_MS / 2 })));
    }
  }, [value, range, level, chevronOpacity, bounce]);

  useEffect(() => {
    if (warn) {
      glow.set(1);
      glow.set(
        withRepeat(
          withSequence(withTiming(PULSE_MIN, { duration: PULSE_HALF_MS }), withTiming(1, { duration: PULSE_HALF_MS })),
          -1,
        ),
      );
    } else {
      cancelAnimation(glow);
      glow.set(withTiming(0, { duration: 200 }));
    }
  }, [warn, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));
  const chevronStyle = useAnimatedStyle(() => ({ opacity: chevronOpacity.get() }));
  return { level, change, glowStyle, bounceStyle, chevronStyle };
}

type AnimatedStyle = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

function MeterImage({ source, style }: { source: ImageSourcePropType | undefined; style: object }) {
  if (source === undefined) return null;
  return <Image source={source} fadeDuration={0} resizeMode="stretch" style={[styles.abs, style]} />;
}

/**
 * An image with its soft shadow beneath (offset down) and, optionally, its pulsing danger glow.
 * Shadow and glow are larger than the image by `pad` on every side. `children` replaces the image.
 */
function Layered({
  images,
  name,
  width,
  height,
  pad,
  shadowOffset,
  glowStyle,
  children,
}: {
  images: MeterSkin['images'];
  name: string;
  width: number;
  height: number;
  pad: number;
  shadowOffset: number;
  glowStyle?: AnimatedStyle;
  children?: ReactNode;
}) {
  const effect = { left: -pad, width: width + 2 * pad, height: height + 2 * pad };
  return (
    <>
      <MeterImage source={images[`${name}_shadow`]} style={{ ...effect, top: -pad + shadowOffset }} />
      {glowStyle && (
        <Animated.View pointerEvents="none" style={[styles.abs, { ...effect, top: -pad }, glowStyle]}>
          <MeterImage source={images[`${name}_glow`]} style={{ left: 0, top: 0, width: effect.width, height: effect.height }} />
        </Animated.View>
      )}
      {children ?? <MeterImage source={images[name]} style={{ left: 0, top: 0, width, height }} />}
    </>
  );
}

/** The full-colour icon over its greyed copy, clipped from the bottom: the colour drains downward. */
function FillMeter({ meter, art, value, range, skin, scale }: MeterProps & { art: FillMeterArt }) {
  const anim = useMeterAnimation(meter, value, range);
  const metrics = skin.metrics[art.full];
  const height = skin.layout.fillHeight * scale;
  const width = height * (metrics?.aspect ?? 1);
  const pad = (metrics?.effectPadPt ?? 0) * (height / (metrics?.heightPt ?? height));
  const fill = useAnimatedStyle(() => ({ height: anim.level.get() * height }));

  return (
    <View style={{ width, height }}>
      <Animated.View style={[styles.abs, { left: 0, top: 0, width, height }, anim.bounceStyle]}>
        <Layered
          images={skin.images}
          name={art.full}
          width={width}
          height={height}
          pad={pad}
          shadowOffset={skin.layout.shadowOffset * scale}
          glowStyle={anim.glowStyle}
        >
          <MeterImage source={skin.images[art.empty]} style={{ left: 0, top: 0, width, height }} />
          {/* Anchored to the bottom, holding the full image aligned to the bottom. */}
          <Animated.View style={[styles.clip, { width }, fill]}>
            <MeterImage source={skin.images[art.full]} style={{ left: 0, bottom: 0, width, height }} />
          </Animated.View>
        </Layered>
      </Animated.View>
      <Chevrons change={anim.change} chevronStyle={anim.chevronStyle} skin={skin} style={{ left: width - 2, top: -6 }} />
    </View>
  );
}

/** A marker standing on a track between two ends, sliding with the meter's value. */
function BalanceMeter({
  meter,
  art,
  value,
  range,
  skin,
  scale,
  width,
}: MeterProps & { art: BalanceMeterArt; width: number }) {
  const anim = useMeterAnimation(meter, value, range);
  const height = skin.layout.fillHeight * scale;
  const sizeOf = (name: string) => {
    const m = skin.metrics[name];
    const h = (m?.heightPt ?? 24) * scale;
    return { h, w: h * (m?.aspect ?? 1), pad: (m?.effectPadPt ?? 0) * scale };
  };
  const left = sizeOf(art.left);
  const right = sizeOf(art.right);
  const marker = sizeOf(art.marker);
  const trackY = height * 0.65;
  const trackStart = left.w + 2 * scale;
  const trackLength = Math.max(0, width - right.w - 2 * scale - trackStart);
  const backing = 6 * scale;
  const line = 3 * scale;
  const shadowOffset = skin.layout.shadowOffset * scale;
  // The marker stands on the track, its base just below the line.
  const markerTop = trackY + 2 * scale - marker.h;
  const markerStyle = useAnimatedStyle(() => ({
    left: trackStart + anim.level.get() * trackLength - marker.w / 2,
  }));

  return (
    <View style={{ width, height }}>
      {[
        { name: art.left, x: 0, s: left },
        { name: art.right, x: width - right.w, s: right },
      ].map(({ name, x, s }) => (
        <View key={name} style={[styles.abs, { left: x, top: trackY - s.h / 2, width: s.w, height: s.h }]}>
          <Layered images={skin.images} name={name} width={s.w} height={s.h} pad={s.pad} shadowOffset={shadowOffset} />
        </View>
      ))}
      <View
        style={[
          styles.abs,
          {
            left: trackStart,
            width: trackLength,
            top: trackY - backing / 2,
            height: backing,
            borderRadius: backing / 2,
            backgroundColor: skin.colors.trackBacking,
          },
        ]}
      />
      {trackSegments(meter, range).map((seg) => (
        <View
          key={seg.from}
          style={[
            styles.abs,
            {
              left: trackStart + seg.from * trackLength,
              width: (seg.to - seg.from) * trackLength,
              top: trackY - line / 2,
              height: line,
              backgroundColor: seg.danger ? skin.colors.trackDanger : skin.colors.trackSafe,
            },
          ]}
        />
      ))}
      <Animated.View style={[styles.abs, { top: markerTop, width: marker.w, height: marker.h }, markerStyle]}>
        <Animated.View style={[styles.abs, { left: 0, top: 0, width: marker.w, height: marker.h }, anim.bounceStyle]}>
          <Layered
            images={skin.images}
            name={art.marker}
            width={marker.w}
            height={marker.h}
            pad={marker.pad}
            shadowOffset={shadowOffset}
            glowStyle={anim.glowStyle}
          />
        </Animated.View>
        <Chevrons
          change={anim.change}
          chevronStyle={anim.chevronStyle}
          skin={skin}
          style={{ left: marker.w - 2, top: -6 }}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Stand-in for a meter whose illustrated icon does not exist yet: a gold disc with the meter's
 * initial over a drained copy, filling and draining (and glowing, bouncing, showing chevrons) like
 * the real icons.
 */
function PlaceholderMedal({ meter, initial, value, range, skin, scale }: MeterProps & { initial: string }) {
  const anim = useMeterAnimation(meter, value, range);
  const size = skin.layout.fillHeight * scale;
  const rim = Math.max(1, 2 * scale);
  const fill = useAnimatedStyle(() => ({ height: anim.level.get() * size }));
  const disc = (color: string) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: rim,
    borderColor: skin.colors.medalRim,
    backgroundColor: color,
  });
  const letter = (
    <Text
      style={[
        styles.medalInitial,
        { width: size, lineHeight: size, fontSize: size * 0.5, color: skin.colors.medalText },
      ]}
    >
      {initial}
    </Text>
  );
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.abs,
          { left: -4 * scale, top: -4 * scale, width: size + 8 * scale, height: size + 8 * scale },
          { borderRadius: size, backgroundColor: skin.colors.medalGlow },
          anim.glowStyle,
        ]}
      />
      <Animated.View style={[styles.abs, { left: 0, top: 0, width: size, height: size }, anim.bounceStyle]}>
        <View style={[styles.abs, disc(skin.colors.medalEmpty)]}>{letter}</View>
        {/* Anchored to the bottom: the gold drains downward as the meter falls. */}
        <Animated.View style={[styles.clip, { width: size }, fill]}>
          <View style={[styles.abs, { left: 0, bottom: 0 }, disc(skin.colors.medalFull)]}>{letter}</View>
        </Animated.View>
      </Animated.View>
      <Chevrons change={anim.change} chevronStyle={anim.chevronStyle} skin={skin} style={{ left: size - 2, top: -6 }} />
    </View>
  );
}

/** One to three chevrons, gold for up and crimson for down, fading after the change. */
function Chevrons({
  change,
  chevronStyle,
  skin,
  style,
}: {
  change: { count: number; up: boolean };
  chevronStyle: AnimatedStyle;
  skin: MeterSkin;
  style: object;
}) {
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, styles.chevrons, style, chevronStyle]}>
      {Array.from({ length: change.count }, (_, i) => (
        <MaterialCommunityIcons
          key={i}
          name={change.up ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={change.up ? skin.colors.chevronUp : skin.colors.chevronDown}
          style={styles.chevron}
        />
      ))}
    </Animated.View>
  );
}

/** The panel fill has frame ornaments at its edges; a tooltip shows only its plain centre. */
const FILL_ZOOM = 2;

/** A small parchment note under the tapped meter: its name and state word, never a number. */
function Tooltip({ name, word, left }: { name: string; word: string; left: number }) {
  const skin = useSkin();
  const fill = skin.panel.fill ? skin.images[skin.panel.fill.image] : undefined;
  const natural = fill !== undefined ? assetSize(fill) : null;
  const fillWidth = TOOLTIP_WIDTH * FILL_ZOOM;
  const fillHeight = natural ? fillWidth * (natural.height / natural.width) : fillWidth / 2;
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(250)}
      pointerEvents="none"
      style={[styles.tooltip, { left, borderColor: skin.colors.panelCaption }]}
    >
      {fill !== undefined && (
        <Image
          source={fill}
          resizeMode="stretch"
          style={[
            styles.abs,
            {
              width: fillWidth,
              height: fillHeight,
              left: (TOOLTIP_WIDTH - fillWidth) / 2,
              top: '50%',
              marginTop: -fillHeight / 2,
            },
          ]}
        />
      )}
      <Text style={[textSizes.caption, { fontFamily: skin.fonts.caption, color: skin.colors.panelCaption }]}>{name}</Text>
      <Text style={[textSizes.body, { fontFamily: skin.fonts.body, color: skin.colors.panelText }]}>{word}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0 },
  slot: { position: 'absolute', top: 0, alignItems: 'center' },
  abs: { position: 'absolute' },
  clip: { position: 'absolute', left: 0, bottom: 0, overflow: 'hidden' },
  chevrons: { alignItems: 'center' },
  chevron: { marginVertical: -5 },
  medalInitial: { position: 'absolute', left: 0, top: 0, textAlign: 'center', fontWeight: '700' },
  tooltip: {
    position: 'absolute',
    top: '100%',
    marginTop: spacing.sm,
    width: TOOLTIP_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
