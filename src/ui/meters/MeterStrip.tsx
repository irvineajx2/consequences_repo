import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
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
  meterLevel,
  type RulerUi,
  visibleMeters,
} from '../../game/meters';
import type { RulerText } from '../../game/text';
import { useSkin } from '../skin/SkinProvider';
import type { MeterSkin } from '../skin/types';
import { format, strings } from '../strings';
import { spacing } from '../theme';

const CHANGE_MS = 600;
const CHEVRON_FADE_MS = 500;
const PULSE_MS = 700;

interface Props {
  readonly state: GameState;
  readonly ui: RulerUi;
  readonly text: RulerText;
  readonly range: readonly [number, number];
}

/** The visible meters in a compact row at the top of the screen. No numbers are ever shown. */
export function MeterStrip({ state, ui, text, range }: Props) {
  const insets = useSafeAreaInsets();
  const { meters: skin } = useSkin();
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + spacing.xs }]}>
      <View style={[styles.strip, { backgroundColor: skin.colors.strip }]}>
        {visibleMeters(ui).map((meter) => (
          <Meter
            key={meter.id}
            meter={meter}
            value={state.meters[meter.id] ?? range[0]}
            range={range}
            text={text}
            skin={skin}
          />
        ))}
      </View>
    </View>
  );
}

function accessibleLabel(meter: MeterDisplay, value: number, range: readonly [number, number], text: RulerText) {
  const names = text.meters[meter.id];
  const level = meterLevel(meter, value, range);
  const word = {
    low: strings.meterLow,
    steady: strings.meterSteady,
    strong: strings.meterStrong,
    balanced: strings.meterBalanced,
    left: format(strings.meterLeaning, { side: names?.left ?? '' }),
    right: format(strings.meterLeaning, { side: names?.right ?? '' }),
  }[level];
  const label = format(strings.meterLabel, { name: names?.name ?? meter.id, level: word });
  return isWarning(meter, value) ? format(strings.meterWarning, { label }) : label;
}

interface MeterProps {
  readonly meter: MeterDisplay;
  readonly value: number;
  readonly range: readonly [number, number];
  readonly text: RulerText;
  readonly skin: MeterSkin;
}

function Meter({ meter, value, range, text, skin }: MeterProps) {
  const size = skin.iconSize;
  const icon = skin.icons[meter.id] ?? skin.fallbackIcon;
  const warn = isWarning(meter, value);

  // Animated value shown, chevron visibility and warning pulse.
  const shown = useSharedValue(fillFraction(value, range));
  const chevronOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);
  const previous = useRef(value);
  const [change, setChange] = useState<{ count: number; up: boolean }>({ count: 0, up: true });

  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    shown.set(withTiming(fillFraction(value, range), { duration: CHANGE_MS, easing: Easing.out(Easing.cubic) }));
    const count = chevronCount(delta);
    if (count > 0) {
      setChange({ count, up: delta > 0 });
      chevronOpacity.set(1);
      chevronOpacity.set(withDelay(CHANGE_MS, withTiming(0, { duration: CHEVRON_FADE_MS })));
    }
  }, [value, range, shown, chevronOpacity]);

  useEffect(() => {
    if (warn) {
      pulse.set(
        withRepeat(withSequence(withTiming(0.4, { duration: PULSE_MS }), withTiming(1, { duration: PULSE_MS })), -1),
      );
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(1, { duration: 200 }));
    }
  }, [warn, pulse]);

  const fillStyle = useAnimatedStyle(() => ({ height: shown.get() * size }));
  const markerStyle = useAnimatedStyle(() => ({ left: shown.get() * TRACK_WIDTH - MARKER / 2 }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  const chevronStyle = useAnimatedStyle(() => ({ opacity: chevronOpacity.get() }));
  const bright = warn ? skin.colors.warning : skin.colors.iconBright;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibleLabel(meter, value, range, text)} style={styles.meter}>
      <Animated.View style={[{ width: size, height: size }, pulseStyle]}>
        {meter.style === 'balance' ? (
          <MaterialCommunityIcons name={icon} size={size} color={bright} />
        ) : (
          <>
            <MaterialCommunityIcons name={icon} size={size} color={skin.colors.iconDim} style={StyleSheet.absoluteFill} />
            {/* The bright copy, clipped from the bottom up to the value: the icon "fills up". */}
            <Animated.View style={[styles.fillClip, fillStyle]}>
              <MaterialCommunityIcons name={icon} size={size} color={bright} style={styles.fillIcon} />
            </Animated.View>
          </>
        )}
      </Animated.View>
      {meter.style === 'balance' && (
        <View style={[styles.track, { backgroundColor: skin.colors.track }]}>
          <View style={[styles.centreTick, { backgroundColor: skin.colors.track }]} />
          <Animated.View style={[styles.marker, { backgroundColor: skin.colors.marker }, markerStyle]} />
        </View>
      )}
      <Animated.View style={[styles.chevrons, chevronStyle]}>
        {Array.from({ length: change.count }, (_, i) => (
          <MaterialCommunityIcons
            key={i}
            name={change.up ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={skin.colors.chevron}
            style={styles.chevron}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const TRACK_WIDTH = 28;
const MARKER = 6;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 14,
  },
  meter: { alignItems: 'center', minWidth: TRACK_WIDTH },
  fillClip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  fillIcon: { position: 'absolute', left: 0, bottom: 0 },
  track: { width: TRACK_WIDTH, height: 3, borderRadius: 2, marginTop: 3 },
  centreTick: { position: 'absolute', left: TRACK_WIDTH / 2 - 0.5, top: -2, width: 1, height: 7 },
  marker: { position: 'absolute', top: -1.5, width: MARKER, height: MARKER, borderRadius: MARKER / 2 },
  chevrons: { position: 'absolute', right: -12, top: 0, alignItems: 'center' },
  chevron: { marginVertical: -4 },
});
