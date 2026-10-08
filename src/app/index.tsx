import { Image as BackgroundImage } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Image, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Ruler, rulers } from '@/data/rulers';
import { loadRun } from '@/game/persistence';
import { appStorage } from '@/ui/appStorage';
import { titleBackground, wordmark, wordmarkAspectRatio } from '@/ui/branding';
import { GameButton } from '@/ui/GameButton';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { strings } from '@/ui/strings';
import { colors, spacing, type } from '@/ui/theme';

type SaveStatus = 'loading' | 'none' | 'saved' | 'discarded';

/** Share of the screen width the wordmark spans. */
const WORDMARK_WIDTH = 0.85;

export default function TitleScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wordmarkWidth = Math.round(width * WORDMARK_WIDTH);
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}>
      <BackgroundImage source={titleBackground} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient
        colors={colors.titleScrim}
        locations={colors.titleScrimStops}
        style={styles.scrimGradient}
        pointerEvents="none"
      />
      {/* The wordmark sits at the top, over the dark band of the backdrop. */}
      <Image
        source={wordmark}
        accessibilityRole="image"
        accessibilityLabel={strings.gameTitle}
        resizeMode="contain"
        style={[styles.wordmark, { width: wordmarkWidth, height: wordmarkWidth / wordmarkAspectRatio() }]}
      />
      {/* The sword hangs well below the letters; the throne room shows between it and the menu. */}
      <View style={styles.spacer} />
      <View>
        <Text style={[type.muted, styles.tagline]}>{strings.tagline}</Text>
        <Text style={type.caption}>{strings.chooseRuler}</Text>
        {rulers.map((ruler) => (
          <RulerMenu key={ruler.id} ruler={ruler} />
        ))}
      </View>
    </View>
  );
}

function RulerMenu({ ruler }: { ruler: Ruler }) {
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [confirming, setConfirming] = useState(false);
  const params = { ruler: ruler.id };

  // Check for a run in progress whenever the title comes back into view. A save that cannot be
  // restored is deleted by loadRun and reported once.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      loadRun(appStorage, ruler.rules).then((loaded) => {
        if (cancelled) return;
        setStatus(loaded.status === 'resumed' ? 'saved' : loaded.status === 'discarded' ? 'discarded' : 'none');
      });
      return () => {
        cancelled = true;
      };
    }, [ruler]),
  );

  const newReign = () => {
    setConfirming(false);
    router.push({ pathname: '/play', params: { ...params, mode: 'new' } });
  };

  return (
    <View style={styles.ruler}>
      <Text style={type.heading}>{ruler.text.ruler.name}</Text>
      {status === 'discarded' && <Text style={[type.muted, styles.notice]}>{strings.restoreFailed}</Text>}
      {status === 'saved' && (
        <GameButton
          label={strings.continueReign}
          onPress={() => router.push({ pathname: '/play', params: { ...params, mode: 'continue' } })}
        />
      )}
      <GameButton
        label={strings.newReign}
        disabled={status === 'loading'}
        onPress={() => (status === 'saved' ? setConfirming(true) : newReign())}
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <GameButton label={strings.chronicle} onPress={() => router.push({ pathname: '/chronicle', params })} />
        </View>
        <View style={styles.half}>
          <GameButton label={strings.endings} onPress={() => router.push({ pathname: '/endings', params })} />
        </View>
      </View>
      <ConfirmNewReign visible={confirming} onConfirm={newReign} onCancel={() => setConfirming(false)} />
    </View>
  );
}

function ConfirmNewReign({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: skin.screen.lockedOverlay }]}>
        <SkinPanel style={styles.dialog}>
          <Text style={text.body}>{strings.confirmNewReign}</Text>
          <GameButton label={strings.confirmDiscard} onPress={onConfirm} />
          <GameButton label={strings.keepReign} onPress={onCancel} />
        </SkinPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  wordmark: { alignSelf: 'center' },
  scrimGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  tagline: { marginBottom: spacing.md },
  spacer: { flexGrow: 1, minHeight: spacing.xl },
  ruler: { marginTop: spacing.md },
  notice: { marginTop: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  scrim: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  dialog: { alignSelf: 'stretch' },
});
