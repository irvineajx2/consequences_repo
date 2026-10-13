import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRuler, type Ruler, rulerUnlocked, rulers } from '@/data/rulers';
import { chronicleBook } from '@/game/chronicle';
import { type Profile, rulerProfile } from '@/game/profile';
import { ConfirmNewReign } from '@/ui/ConfirmNewReign';
import { GameButton } from '@/ui/GameButton';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';
import { useProfile, useUnlockAll } from '@/ui/useProfile';
import { useRunSave } from '@/ui/useRunSave';
import { RulerImage } from '@/ui/RulerImage';

/**
 * Every registered ruler, locked or open, then a card promising more. Adding a ruler adds a card
 * here; a locked ruler shows how to unlock it.
 */
export default function RulerSelectScreen() {
  const profile = useProfile();
  const [unlockAll] = useUnlockAll();
  return (
    <ScreenScaffold
      title={strings.chooseRuler}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      {profile &&
        rulers.map((ruler) => (
          <RulerCard key={ruler.id} ruler={ruler} profile={profile} unlocked={rulerUnlocked(ruler, profile, unlockAll)} />
        ))}
      {/* Always after the last real ruler. */}
      {profile && <ComingSoonCard />}
    </ScreenScaffold>
  );
}

function RulerCard({ ruler, profile, unlocked }: { ruler: Ruler; profile: Profile; unlocked: boolean }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const save = useRunSave(ruler);
  const record = rulerProfile(profile, ruler.rules.ruler);
  const [confirming, setConfirming] = useState(false);
  const book = chronicleBook(ruler.rules, record);
  const endingIds = Object.keys(ruler.rules.endings);
  const endingsReached = endingIds.filter((id) => record.endings[id] !== undefined).length;
  const portrait = ruler.ui.rulerCard?.image;
  const prerequisite = ruler.unlockedBy !== undefined ? getRuler(ruler.unlockedBy) : null;

  const begin = () => {
    setConfirming(false);
    router.push({ pathname: '/play', params: { ruler: ruler.id, mode: 'new' } });
  };

  return (
    <SkinPanel>
      <View style={styles.cardBody}>
        {portrait !== undefined && (
          <View style={[styles.portraitFrame, { borderColor: unlocked ? screen.highlight : screen.mutedText }]}>
            <RulerImage rulerId={ruler.id} imageId={portrait} style={StyleSheet.absoluteFill} contentFit="cover" />
            {/* Locked: the portrait is darkened. */}
            {!unlocked && <View style={[StyleSheet.absoluteFill, { backgroundColor: screen.lockedOverlay }]} />}
          </View>
        )}
        <View style={styles.details}>
          <Text style={type.heading}>{ruler.text.ruler.name}</Text>
          <Text style={type.caption}>{ruler.text.ruler.subtitle}</Text>
          <Text style={[type.body, styles.gap]}>{ruler.text.ruler.tagline}</Text>
          {unlocked ? (
            <>
              <Text style={[type.muted, styles.gap]}>
                {format(strings.discovered, { count: book.discovered, total: book.total })}
              </Text>
              <Text style={type.muted}>
                {format(strings.endingsReached, { count: endingsReached, total: endingIds.length })}
              </Text>
            </>
          ) : (
            <Text style={[type.muted, styles.gap]}>
              {format(strings.unlockHint, { ruler: prerequisite?.text.ruler.name ?? '' })}
            </Text>
          )}
        </View>
      </View>
      {unlocked && save === 'saved' && (
        <GameButton
          label={strings.continue_short}
          onPress={() => router.push({ pathname: '/play', params: { ruler: ruler.id, mode: 'continue' } })}
        />
      )}
      {unlocked && (
        <GameButton
          label={strings.beginReign}
          disabled={save === 'loading'}
          onPress={() => (save === 'saved' ? setConfirming(true) : begin())}
        />
      )}
      <ConfirmNewReign visible={confirming} onConfirm={begin} onCancel={() => setConfirming(false)} />
    </SkinPanel>
  );
}

/** A promise of more rulers. Not tappable, and never names one. */
function ComingSoonCard() {
  const type = useSkinTextStyles();
  const { colors } = useSkin();
  return (
    <SkinPanel>
      <View style={styles.cardBody} accessible accessibilityLabel={`${strings.comingSoon}. ${strings.moreRulers}`}>
        {/* A dark figure on a dimmed backdrop: no face, no name. */}
        <View style={[styles.portraitFrame, styles.silhouette, { borderColor: colors.panelCaption }]}>
          <View style={[StyleSheet.absoluteFill, styles.silhouetteBackdrop, { backgroundColor: colors.panelCaption }]} />
          <MaterialCommunityIcons name="account" size={150} color={colors.screenBackground} style={styles.silhouetteIcon} />
        </View>
        <View style={styles.details}>
          <Text style={type.heading}>{strings.comingSoon}</Text>
          <Text style={[type.body, styles.gap]}>{strings.moreRulers}</Text>
        </View>
      </View>
    </SkinPanel>
  );
}

const styles = StyleSheet.create({
  cardBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  portraitFrame: { width: '38%', aspectRatio: 3 / 4, borderWidth: 2, borderRadius: 3, overflow: 'hidden' },
  details: { flex: 1 },
  gap: { marginTop: spacing.xs },
  silhouette: { alignItems: 'center', justifyContent: 'flex-end' },
  silhouetteBackdrop: { opacity: 0.45 },
  silhouetteIcon: { marginBottom: -30 },
});
