import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { getRuler } from '@/data/rulers';
import { chronicleBook } from '@/game/chronicle';
import { emptyRulerProfile } from '@/game/profile';
import { chronicleNote, optionText, sceneText } from '@/game/text';
import { GameButton } from '@/ui/GameButton';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';
import { useRulerProfile } from '@/ui/useProfile';

/** Every decision scene; the ruler's choice and its note appear only once the player has made it. */
export default function ChronicleScreen() {
  const { ruler: rulerId } = useLocalSearchParams<{ ruler?: string }>();
  const ruler = getRuler(rulerId);
  const profile = useRulerProfile(ruler.rules.ruler);
  const type = useSkinTextStyles();
  const book = chronicleBook(ruler.rules, profile ?? emptyRulerProfile);
  const { text } = ruler;

  return (
    <ScreenScaffold
      title={strings.chronicle}
      subtitle={profile ? format(strings.discoveredCount, { discovered: book.discovered, total: book.total }) : ''}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      {profile &&
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
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: spacing.xs },
});
