import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Ruler, rulers } from '@/data/rulers';
import { loadRun } from '@/game/persistence';
import { appStorage } from '@/ui/appStorage';
import { GameButton } from '@/ui/GameButton';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { strings } from '@/ui/strings';
import { colors, spacing, type } from '@/ui/theme';

type SaveStatus = 'loading' | 'none' | 'saved' | 'discarded';

export default function TitleScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <View style={styles.header}>
        <Text style={type.title}>{strings.gameTitle}</Text>
        <Text style={[type.muted, styles.tagline]}>{strings.tagline}</Text>
      </View>
      <View>
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
    justifyContent: 'space-between',
  },
  header: { marginTop: spacing.xl },
  tagline: { marginTop: spacing.sm },
  ruler: { marginTop: spacing.md },
  notice: { marginTop: spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  scrim: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  dialog: { alignSelf: 'stretch' },
});
