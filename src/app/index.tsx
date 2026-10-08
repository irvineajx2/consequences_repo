import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rulers } from '@/data/rulers';
import { GameButton } from '@/ui/GameButton';
import { strings } from '@/ui/strings';
import { colors, spacing, type } from '@/ui/theme';

export default function TitleScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.header}>
        <Text style={type.title}>{strings.gameTitle}</Text>
        <Text style={[type.muted, styles.tagline]}>{strings.tagline}</Text>
      </View>
      <View>
        <Text style={type.caption}>{strings.chooseRuler}</Text>
        {rulers.map((ruler) => (
          <View key={ruler.id} style={styles.ruler}>
            <Text style={type.heading}>{ruler.text.ruler.name}</Text>
            <GameButton
              label={strings.play}
              onPress={() => router.push({ pathname: '/play', params: { ruler: ruler.id } })}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
  },
  header: { marginTop: spacing.xl },
  tagline: { marginTop: spacing.sm },
  ruler: { marginTop: spacing.md },
});
