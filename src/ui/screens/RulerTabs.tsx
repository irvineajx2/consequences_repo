import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { Ruler } from '../../data/rulers';
import { useSkin } from '../skin/SkinProvider';
import { spacing, textSizes } from '../theme';

interface Props {
  readonly rulers: readonly Ruler[];
  readonly selected: string;
  readonly onSelect: (id: string) => void;
}

/** One tab per ruler, for the chronicle and endings screens. Hidden when there is only one. */
export function RulerTabs({ rulers, selected, onSelect }: Props) {
  const skin = useSkin();
  if (rulers.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={styles.row}>
      {rulers.map((r) => {
        const active = r.id === selected;
        return (
          <Pressable
            key={r.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => onSelect(r.id)}
            style={[
              styles.tab,
              { borderColor: active ? skin.screen.highlight : skin.screen.mutedText },
              active && { backgroundColor: skin.screen.highlightFill },
            ]}
          >
            <Text
              style={[
                textSizes.caption,
                { fontFamily: skin.fonts.caption, color: active ? skin.screen.text : skin.screen.mutedText },
              ]}
            >
              {r.text.ruler.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  tab: { borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
});
