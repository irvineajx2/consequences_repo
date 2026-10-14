// The share card: the player's avatar, name, rank, level and featured achievement on parchment,
// captured as a still image. Exporting it (the share sheet) comes later; for now the still is shown.
import { Canvas, Image as SkiaImage, makeImageFromView, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import type { ProfileView } from '../../game/profileView';
import { GameButton } from '../GameButton';
import { AvatarView } from '../profile/AvatarView';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkinTextStyles } from '../skin/textStyles';
import { format, strings } from '../strings';
import { spacing } from '../theme';
import { usePlayerOutfit } from './playerOutfit';
import { renderAvatar } from './avatarRender';

const CARD_WIDTH = 280;

/** The card itself, as captured. */
function Card({ view }: { view: ProfileView }) {
  const text = useSkinTextStyles();
  return (
    <SkinPanel style={styles.card}>
      <View style={styles.cardBody}>
        <AvatarView size={110} variant="full" animate={false} />
        <View style={styles.details}>
          <Text style={text.heading}>{view.identity.nickname}</Text>
          <Text style={text.body}>{view.identity.rank}</Text>
          <Text style={text.muted}>{format(strings.levelLabel, { level: view.identity.level })}</Text>
          {view.featured && <Text style={text.muted}>{view.featured.achievement.title}</Text>}
          <Text style={[text.caption, styles.brand]}>{strings.gameTitle.toUpperCase()}</Text>
        </View>
      </View>
    </SkinPanel>
  );
}

/** Shows the share card, captured as a still once the avatar has rendered. */
export function ShareCardDialog({ view, visible, onClose }: { view: ProfileView; visible: boolean; onClose: () => void }) {
  const text = useSkinTextStyles();
  const outfit = usePlayerOutfit();
  const ref = useRef<View>(null);
  const [still, setStill] = useState<SkImage | null>(null);

  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    let cancelled = false;
    setStill(null);
    // Capture once the figure is drawn (its render is cached, so the card shows it at once).
    renderAvatar(outfit)
      .then(() => new Promise((r) => setTimeout(r, 120)))
      .then(() => makeImageFromView(ref))
      .then((image) => {
        if (!cancelled) setStill(image);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, outfit]);

  const height = still ? (CARD_WIDTH * still.height()) / still.width() : 0;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {still ? (
          <Canvas style={{ width: CARD_WIDTH, height }} accessibilityLabel={strings.shareCard}>
            <SkiaImage image={still} x={0} y={0} width={CARD_WIDTH} height={height} fit="contain" />
          </Canvas>
        ) : (
          // The live card, captured from here (and what the web build shows).
          <View ref={ref} collapsable={false}>
            <Card view={view} />
          </View>
        )}
        <SkinPanel style={styles.actions}>
          <Text style={[text.muted, styles.centre]}>{strings.shareSoon}</Text>
          <GameButton label={strings.close} onPress={onClose} />
        </SkinPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: 'rgba(8, 6, 10, 0.78)' },
  card: { width: CARD_WIDTH },
  cardBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  details: { flex: 1, gap: 2 },
  brand: { marginTop: spacing.sm },
  actions: { width: CARD_WIDTH },
  centre: { textAlign: 'center' },
});
