// The battle map: the phase's painted map with each sector marked (its name, a men bar and a works
// bar, its result once fought, and the commander's token), under a header with the phase and the
// army's resources. After a phase the attacked sectors glow (dust by day, torchlight by night) and
// the bars settle to their new values; with Reduce Motion everything is still.
import { Image } from 'expo-image';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SectorResult } from '../../battle';
import type { BattleText } from '../../data/battles';
import { getImage } from '../images';
import { bundledCachePolicy } from '../RulerImage';
import { assetSize } from '../skin/assetSize';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import { format, formatNumber, strings } from '../strings';
import { battleIcons } from './battleArt';
import { fitMap, type SectorMap, toScreen } from './mapLayout';

export interface SectorMarkerData {
  readonly id: string;
  /** Share of the starting army here, 0 to 1 (the camp: the reserve). */
  readonly men: number;
  readonly menBefore?: number;
  /** Cohorts here, for screen readers. */
  readonly cohorts: number;
  /** Fortification, 0 to 1 of the bar; undefined for the camp. */
  readonly works?: number;
  readonly worksBefore?: number;
  readonly worksValue?: number;
  readonly result?: SectorResult;
}

interface Props {
  readonly battleId: string;
  readonly mapImage: string;
  /** "night" maps glow with torchlight; others with dust. */
  readonly lighting: string;
  readonly text: BattleText;
  readonly sectorMap: SectorMap;
  readonly markers: readonly SectorMarkerData[];
  readonly commander: string;
  readonly title: string;
  readonly subtitle: string;
  readonly resources: readonly { readonly label: string; readonly value: number }[];
  /** The space the phase panel takes at the bottom (points). */
  readonly panelHeight: number;
  /** Tapping a marker places the commander there; absent while reporting. */
  readonly onSectorPress?: (id: string) => void;
  readonly children?: ReactNode;
}

/** The map's natural size when its file can't say (the art is 941 x 1672). */
const FALLBACK_SIZE = { width: 941, height: 1672 };
const MARKER_WIDTH = 92;
const SETTLE_MS = 900;

export function BattleMap(props: Props) {
  const { battleId, mapImage, lighting, text, sectorMap, markers, commander, panelHeight, onSectorPress } = props;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  const reduceMotion = useReducedMotion();
  const source = getImage(battleId, mapImage);
  const size = assetSize(source) ?? FALLBACK_SIZE;
  const [headerHeight, setHeaderHeight] = useState(insets.top + 64);
  // A little room under the header and above the panel, so markers never touch them.
  const fit = useMemo(
    () => fitMap(size, width, headerHeight + 22, height - panelHeight - 18),
    [size, width, height, headerHeight, panelHeight],
  );
  const glow = lighting === 'night' ? 'rgba(255, 140, 40, 0.55)' : 'rgba(214, 190, 140, 0.6)';

  return (
    <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]}>
      {fit.width < width && (
        // The map, dimmed, behind the fitted map: fills the sides on a short screen.
        <>
          <Image source={source} cachePolicy={bundledCachePolicy} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
        </>
      )}
      <Image
        source={source}
        cachePolicy={bundledCachePolicy}
        style={{ position: 'absolute', left: fit.left, top: fit.top, width: fit.width, height: fit.height }}
        contentFit="fill"
        transition={reduceMotion ? 0 : 300}
        accessible={false}
      />
      {markers.map((m) => {
        const pos = sectorMap.sectors[m.id];
        if (!pos) return null;
        const at = toScreen(fit, pos.anchor, width, MARKER_WIDTH / 2 + 4);
        const attacked = m.result !== undefined && m.result !== 'none';
        return (
          <View key={m.id} style={[styles.markerSpot, { left: at.x - MARKER_WIDTH / 2, top: at.y - 24 }]} pointerEvents="box-none">
            {attacked && <Glow colour={glow} still={reduceMotion} />}
            <Marker
              marker={m}
              name={text.sectors[m.id]?.name ?? m.id}
              resultLine={m.result ? format(text.results[m.result] ?? '{sector}', { sector: text.sectors[m.id]?.name ?? m.id }) : undefined}
              commanderHere={commander === m.id}
              still={reduceMotion}
              onPress={onSectorPress ? () => onSectorPress(m.id) : undefined}
            />
          </View>
        );
      })}
      <Header title={props.title} subtitle={props.subtitle} resources={props.resources} top={insets.top} onHeight={setHeaderHeight} />
      {props.children}
    </View>
  );
}

function Header({
  title,
  subtitle,
  resources,
  top,
  onHeight,
}: {
  title: string;
  subtitle: string;
  resources: Props['resources'];
  top: number;
  onHeight: (h: number) => void;
}) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  return (
    <View
      style={[styles.header, { paddingTop: top + 6, backgroundColor: skin.progression.colors.plate }]}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.headerTitle} accessibilityRole="header">
        <Text style={[text.heading, styles.headerHeading, { color: skin.screen.text }]}>{title}</Text>
        <Text style={[text.caption, styles.headerSub, { color: skin.screen.mutedText }]}>{subtitle}</Text>
      </View>
      <View style={styles.resources}>
        {resources.map((r) => (
          <View key={r.label} style={styles.resource} accessible accessibilityLabel={`${r.label}: ${formatNumber(r.value)}`}>
            <Text style={[text.caption, styles.resourceLabel, { color: skin.screen.mutedText }]}>{r.label}</Text>
            <Text style={[text.body, styles.resourceValue, { color: skin.screen.text }]}>{formatNumber(r.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Marker({
  marker: m,
  name,
  resultLine,
  commanderHere,
  still,
  onPress,
}: {
  marker: SectorMarkerData;
  name: string;
  resultLine?: string;
  commanderHere: boolean;
  still: boolean;
  onPress?: () => void;
}) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  const icon = m.result === 'breach' ? 'breach' : m.result === 'strained' ? 'strained' : m.result === 'held' || m.result === 'easy' ? 'held' : null;
  const label = [
    resultLine ?? format(strings.battles.sectorLabel, { sector: name, men: formatNumber(m.cohorts), works: (m.worksValue ?? 0).toFixed(2) }),
    commanderHere ? strings.battles.commanderHere : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected: commanderHere }}
      hitSlop={10}
      style={[
        styles.marker,
        { backgroundColor: 'rgba(234, 217, 184, 0.92)', borderColor: commanderHere ? skin.colors.panelCaption : 'rgba(42, 29, 16, 0.5)' },
        commanderHere && styles.markerChosen,
      ]}
    >
      <Text style={[text.caption, styles.markerName]} numberOfLines={2}>
        {name}
      </Text>
      <Bar fraction={m.men} from={m.menBefore} colour="#7A1F1F" still={still} />
      {m.works !== undefined && <Bar fraction={m.works} from={m.worksBefore} colour="#5A4632" still={still} />}
      {icon && battleIcons[icon] && <Image source={battleIcons[icon]} style={styles.resultIcon} cachePolicy={bundledCachePolicy} accessible={false} />}
      {commanderHere && battleIcons.commander && (
        <Image source={battleIcons.commander} style={styles.commanderIcon} cachePolicy={bundledCachePolicy} accessible={false} />
      )}
    </Pressable>
  );
}

/** A thin bar that settles from its old value to its new one. */
function Bar({ fraction, from, colour, still }: { fraction: number; from?: number; colour: string; still: boolean }) {
  const value = useRef(new Animated.Value(still || from === undefined ? fraction : from)).current;
  useEffect(() => {
    if (still) {
      value.setValue(fraction);
      return;
    }
    const anim = Animated.timing(value, { toValue: fraction, duration: SETTLE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [fraction, still, value]);
  return (
    <View style={styles.barTrack} accessible={false}>
      <Animated.View
        style={[
          styles.barFill,
          { backgroundColor: colour, width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) },
        ]}
      />
    </View>
  );
}

/** A soft glow that breathes over an attacked sector (still with Reduce Motion). */
function Glow({ colour, still }: { colour: string; still: boolean }) {
  const pulse = useRef(new Animated.Value(still ? 0.8 : 0.35)).current;
  useEffect(() => {
    if (still) {
      pulse.setValue(0.8);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [still, pulse]);
  return <Animated.View pointerEvents="none" style={[styles.glow, { backgroundColor: colour, opacity: pulse }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  dim: { backgroundColor: 'rgba(13, 11, 9, 0.62)' },
  header: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 12, paddingBottom: 6, gap: 2 },
  headerTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  headerHeading: { fontSize: 17, lineHeight: 22 },
  headerSub: { fontSize: 10, lineHeight: 13 },
  resources: { flexDirection: 'row', justifyContent: 'space-around' },
  resource: { alignItems: 'center', minWidth: 38 },
  resourceLabel: { fontSize: 9, lineHeight: 12, letterSpacing: 0.5 },
  resourceValue: { fontSize: 15, lineHeight: 19 },
  markerSpot: { position: 'absolute', width: MARKER_WIDTH, alignItems: 'center' },
  marker: { width: MARKER_WIDTH, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, gap: 2 },
  markerChosen: { borderWidth: 2.5 },
  markerName: { fontSize: 9, lineHeight: 11, letterSpacing: 0.3, color: '#2A1D10' },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(42, 29, 16, 0.2)', overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  resultIcon: { position: 'absolute', right: -12, top: -12, width: 26, height: 27 },
  commanderIcon: { position: 'absolute', left: -14, top: -18, width: 26, height: 27 },
  glow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, top: -30 },
});
