// One pool bin's slider: a track of whole steps, set by dragging or tapping anywhere along it (the
// whole row height is the touch target, so it is comfortable with a thumb). Screen readers adjust it
// a step at a time.
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';

interface Props {
  readonly label: string;
  /** Steps in this bin. */
  readonly value: number;
  /** Steps in the whole pool. */
  readonly steps: number;
  /** Shown at the right, e.g. "30%". */
  readonly valueText: string;
  /** For screen readers. */
  readonly accessibilityLabel: string;
  /** Absent: shown but not set directly (the reserve). */
  readonly onChange?: (value: number) => void;
  readonly height: number;
}

export function StepSlider({ label, value, steps, valueText, accessibilityLabel, onChange, height }: Props) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  const [width, setWidth] = useState(0);
  const start = useRef(0);
  // The latest handler and width, read by the responder (created once).
  const latest = useRef({ onChange, width, steps });
  latest.current = { onChange, width, steps };

  const responder = useMemo(() => {
    const set = (x: number) => {
      const { onChange: change, width: w, steps: n } = latest.current;
      if (!change || w <= 0) return;
      change(Math.max(0, Math.min(n, Math.round((x / w) * n))));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.onChange !== undefined,
      onMoveShouldSetPanResponder: () => latest.current.onChange !== undefined,
      // Keep the drag when the finger strays vertically (a parent ScrollView would steal it).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        start.current = e.nativeEvent.locationX;
        set(start.current);
      },
      onPanResponderMove: (_e, g) => set(start.current + g.dx),
    });
  }, []);

  const filled = skin.colors.panelCaption;
  const empty = 'rgba(42, 29, 16, 0.18)';
  return (
    <View style={[styles.row, { height }]}>
      {/* Long sector names wrap onto a second line rather than being cut. */}
      <Text style={[text.body, styles.label, !onChange && styles.dim]} numberOfLines={2}>
        {label}
      </Text>
      <View
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: steps, now: value, text: valueText }}
        accessibilityActions={onChange ? [{ name: 'increment' }, { name: 'decrement' }] : []}
        onAccessibilityAction={(e) => {
          if (!onChange) return;
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(steps, value + 1));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(0, value - 1));
        }}
        {...responder.panHandlers}
      >
        <View style={styles.cells} pointerEvents="none">
          {Array.from({ length: steps }, (_, i) => (
            <View
              key={i}
              style={[styles.cell, { backgroundColor: i < value ? filled : empty, opacity: onChange ? 1 : 0.6 }]}
            />
          ))}
        </View>
      </View>
      <Text style={[text.body, styles.value, !onChange && styles.dim]}>{valueText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: '32%', fontSize: 13, lineHeight: 16 },
  track: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  cells: { flexDirection: 'row', gap: 3, height: 14 },
  cell: { flex: 1, borderRadius: 2 },
  value: { width: 44, textAlign: 'right', fontSize: 14 },
  dim: { opacity: 0.7 },
});
