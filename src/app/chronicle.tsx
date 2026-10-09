import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRuler, rulerUnlocked, rulers } from '@/data/rulers';
import { chronicleBook } from '@/game/chronicle';
import { emptyProfile, rulerProfile } from '@/game/profile';
import { chronicleNote, optionText, sceneText } from '@/game/text';
import { GameButton } from '@/ui/GameButton';
import { RulerTabs } from '@/ui/screens/RulerTabs';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, strings } from '@/ui/strings';
import { spacing, textSizes } from '@/ui/theme';
import { useProfile, useUnlockAll } from '@/ui/useProfile';

/**
 * Each unlocked ruler's decision scenes, revealing the ruler's choice and its note only once the
 * player has made it, then the uncharted paths (branch scenes) found so far.
 */
export default function ChronicleScreen() {
  const { ruler: requested } = useLocalSearchParams<{ ruler?: string }>();
  const stored = useProfile();
  const [unlockAll] = useUnlockAll();
  const skin = useSkin();
  const type = useSkinTextStyles();
  const profile = stored ?? emptyProfile;
  const open = rulers.filter((r) => rulerUnlocked(r, profile, unlockAll));
  const [selected, setSelected] = useState(requested ?? rulers[0].id);
  const ruler = open.find((r) => r.id === selected) ?? getRuler(open[0]?.id);
  const book = chronicleBook(ruler.rules, rulerProfile(profile, ruler.rules.ruler));
  const { text } = ruler;
  const titleOf = (id: string) => ruler.rules.scenes.find((s) => s.id === id)?.title ?? id;

  return (
    <ScreenScaffold
      title={strings.chronicle}
      subtitle={stored ? format(strings.discoveredCount, { discovered: book.discovered, total: book.total }) : ''}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      <RulerTabs rulers={open} selected={ruler.id} onSelect={setSelected} />
      {stored &&
        book.entries.map((entry) => (
          <SkinPanel key={entry.sceneId}>
            <Text style={type.caption}>{sceneText(text, entry.sceneId).caption}</Text>
            {entry.choice ? (
              <>
                <Text style={[type.body, styles.gap]}>
                  {optionText(text, entry.sceneId, entry.choice.variant, entry.choice.optionId)}
                </Text>
                <Text style={[type.muted, styles.gap]}>{chronicleNote(text, entry.sceneId)}</Text>
              </>
            ) : (
              <Text style={[type.muted, styles.gap]}>{strings.undiscovered}</Text>
            )}
          </SkinPanel>
        ))}
      {stored && book.uncharted.total > 0 && (
        <View style={styles.section}>
          <Text style={[textSizes.heading, { fontFamily: skin.fonts.caption, color: skin.screen.text }]}>
            {strings.unchartedPaths}
          </Text>
          <Text style={[textSizes.muted, { fontFamily: skin.fonts.body, color: skin.screen.mutedText }]}>
            {format(strings.unchartedFound, { count: book.uncharted.found.length, total: book.uncharted.total })}
          </Text>
          <SkinPanel style={styles.gap}>
            {book.uncharted.found.length === 0 ? (
              <Text style={type.muted}>{strings.noneFound}</Text>
            ) : (
              book.uncharted.found.map((id) => (
                <Text key={id} style={type.body}>
                  {titleOf(id)}
                </Text>
              ))
            )}
          </SkinPanel>
        </View>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: spacing.xs },
  section: { marginTop: spacing.md, paddingHorizontal: spacing.sm },
});
