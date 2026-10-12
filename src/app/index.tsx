import Constants from 'expo-constants';
import { Image as BackgroundImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rulers } from '@/data/rulers';
import { wordmark, wordmarkAspectRatio } from '@/ui/branding';
import { GameButton } from '@/ui/GameButton';
import { getImage } from '@/ui/images';
import { LevelPlate } from '@/ui/progression/LevelPlate';
import { format, strings } from '@/ui/strings';
import { colors, spacing, type } from '@/ui/theme';
import { useProfile, useUnlockAll } from '@/ui/useProfile';
import { useLatestSave } from '@/ui/useRunSave';

/** Share of the screen width the wordmark spans. */
const WORDMARK_WIDTH = 0.85;

/** The ruler whose art and progress the title screen shows. */
const featured = rulers[0];

export default function TitleScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const save = useLatestSave(rulers);
  // Reloaded once the saves are checked: that may record a run finished before the app closed.
  const profile = useProfile(save.loading);
  const [unlockAll, toggleUnlockAll] = useUnlockAll();
  const wordmarkWidth = Math.round(width * WORDMARK_WIDTH);
  const background = featured.ui.title?.background;
  const params = { ruler: featured.id };
  const version = Constants.expoConfig?.version;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.sm }]}>
      {background !== undefined && (
        <BackgroundImage source={getImage(featured.id, background)} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      <LinearGradient
        colors={colors.titleScrim}
        locations={colors.titleScrimStops}
        style={styles.scrimGradient}
        pointerEvents="none"
      />
      {/* Top just below the safe area; the sword may overlap the top of the throne canopy. */}
      <Image
        source={wordmark}
        accessibilityRole="image"
        accessibilityLabel={strings.gameTitle}
        resizeMode="contain"
        style={[styles.wordmark, { width: wordmarkWidth, height: wordmarkWidth / wordmarkAspectRatio() }]}
      />
      <View style={styles.spacer} />
      <View>
        {profile !== null && (
          <View style={styles.plate}>
            <LevelPlate progression={profile.progression} />
          </View>
        )}
        {save.discarded && <Text style={[type.muted, styles.notice]}>{strings.restoreFailed}</Text>}
        {save.ruler !== null && (
          <GameButton
            label={strings.continueReign}
            onPress={() =>
              router.push({ pathname: '/play', params: { ruler: save.ruler?.id ?? featured.id, mode: 'continue' } })
            }
          />
        )}
        <GameButton label={strings.newReign} onPress={() => router.push('/rulers')} />
        <View style={styles.pair}>
          <View style={styles.half}>
            <GameButton label={strings.chronicle} onPress={() => router.push({ pathname: '/chronicle', params })} />
          </View>
          <View style={styles.half}>
            <GameButton label={strings.endings} onPress={() => router.push({ pathname: '/endings', params })} />
          </View>
        </View>
        {version !== undefined && (
          // Long-press: the hidden testing switch that unlocks every ruler.
          <Pressable onLongPress={toggleUnlockAll} delayLongPress={800} accessible={false}>
            <Text style={[type.muted, styles.version]}>
              {format(strings.version, { version })}
              {unlockAll ? ` · ${strings.debugUnlocked}` : ''}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  scrimGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  wordmark: { alignSelf: 'center' },
  spacer: { flexGrow: 1, minHeight: spacing.xl },
  plate: { marginBottom: spacing.md },
  notice: { textAlign: 'center', marginBottom: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  version: { textAlign: 'center', fontSize: 11, lineHeight: 15, marginTop: spacing.sm, opacity: 0.7 },
});
