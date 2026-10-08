import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Rules } from '../../core';
import { runChronicle, type RunChronicleRow } from '../../game/chronicle';
import type { EndingViewModel } from '../../game/session';
import { chronicleNote, endingText, optionText, type RulerText, sceneText } from '../../game/text';
import { GameButton } from '../GameButton';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import { categoryLabel, format, strings } from '../strings';
import { spacing } from '../theme';
import { ScreenScaffold } from './ScreenScaffold';

interface Props {
  readonly rules: Rules;
  readonly text: RulerText;
  readonly ending: EndingViewModel;
  readonly newlyDiscovered: readonly string[];
  readonly onNewReign: () => void;
  readonly onBackToTitle: () => void;
}

/**
 * The run's decisions in order. Matched ones are highlighted and can open their chronicle note;
 * unmatched ones show only the player's choice, never what the ruler did instead.
 */
export function RunChronicleScreen({ rules, text, ending, newlyDiscovered, onNewReign, onBackToTitle }: Props) {
  const type = useSkinTextStyles();
  const chronicle = runChronicle(rules, ending.decisions, newlyDiscovered);
  const title = endingText(text, ending.ending).title;
  const category = rules.endings[ending.ending]?.category ?? '';
  return (
    <ScreenScaffold
      title={strings.chronicle}
      footer={
        <>
          <GameButton label={strings.newReign} onPress={onNewReign} />
          <GameButton label={strings.backToTitle} onPress={onBackToTitle} />
        </>
      }
    >
      <SkinPanel>
        <Text style={type.heading}>{title}</Text>
        <Text style={type.caption}>{categoryLabel(category)}</Text>
        <Text style={[type.muted, styles.gapTop]}>
          {format(strings.decisionsMatched, {
            matched: chronicle.matched,
            total: chronicle.total,
            ruler: text.ruler.short_name,
          })}
        </Text>
      </SkinPanel>
      {chronicle.rows.map((row) => (
        <RowCard key={row.sceneId} row={row} text={text} />
      ))}
    </ScreenScaffold>
  );
}

function RowCard({ row, text }: { row: RunChronicleRow; text: RulerText }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const [open, setOpen] = useState(false);
  const choice = optionText(text, row.sceneId, row.variant, row.optionId);
  return (
    <SkinPanel>
      <View
        style={[
          styles.row,
          row.matched && { backgroundColor: screen.highlightFill, borderLeftColor: screen.highlight },
        ]}
      >
        <Text style={type.caption}>{sceneText(text, row.sceneId).caption}</Text>
        <Text style={[type.body, styles.gapTop]}>{choice}</Text>
        {row.matched && (
          <>
            <View style={styles.badges}>
              <Text style={[type.caption, { color: screen.highlight }]}>
                {format(strings.asRulerChose, { ruler: text.ruler.short_name })}
              </Text>
              {row.newlyDiscovered && (
                <Text style={[type.caption, styles.newBadge, { borderColor: screen.highlight, color: screen.highlight }]}>
                  {strings.newlyDiscovered}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen(!open)}
              style={styles.toggle}
            >
              <Text style={[type.muted, styles.toggleText]}>{open ? strings.hideNote : strings.showNote}</Text>
            </Pressable>
            {open && <Text style={[type.body, styles.gapTop]}>{chronicleNote(text, row.sceneId)}</Text>}
          </>
        )}
      </View>
    </SkinPanel>
  );
}

const styles = StyleSheet.create({
  gapTop: { marginTop: spacing.xs },
  row: { borderLeftWidth: 3, borderLeftColor: 'transparent', paddingLeft: spacing.sm, paddingVertical: 2, borderRadius: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  newBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4 },
  toggle: { alignSelf: 'flex-start', marginTop: spacing.xs, paddingVertical: 2 },
  toggleText: { textDecorationLine: 'underline' },
});
