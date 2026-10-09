import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Ruler, rulers } from '@/data/rulers';
import { chronicleBook } from '@/game/chronicle';
import { emptyRulerProfile } from '@/game/profile';
import { ConfirmNewReign } from '@/ui/ConfirmNewReign';
import { GameButton } from '@/ui/GameButton';
import { getImage } from '@/ui/images';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';
import { useRulerProfile } from '@/ui/useProfile';
import { useRunSave } from '@/ui/useRunSave';

/** Every registered ruler, then a card promising more. Adding a ruler adds a card here. */
export default function RulerSelectScreen() {
  return (
    <ScreenScaffold
      title={strings.chooseRuler}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      {rulers.map((ruler) => (
        <RulerCard key={ruler.id} ruler={ruler} />
      ))}
      <ComingSoonCard />
    </ScreenScaffold>
  );
}

function RulerCard({ ruler }: { ruler: Ruler }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const save = useRunSave(ruler);
  const profile = useRulerProfile(ruler.rules.ruler) ?? emptyRulerProfile;
  const [confirming, setConfirming] = useState(false);
  const book = chronicleBook(ruler.rules, profile);
  const endingIds = Object.keys(ruler.rules.endings);
  const endingsReached = endingIds.filter((id) => profile.endings[id] !== undefined).length;
  const portrait = ruler.ui.rulerCard?.image;

  const begin = () => {
    setConfirming(false);
    router.push({ pathname: '/play', params: { ruler: ruler.id, mode: 'new' } });
  };

  return (
    <SkinPanel>
      <View style={styles.cardBody}>
        {portrait !== undefined && (
          <View style={[styles.portraitFrame, { borderColor: screen.highlight }]}>
            <Image source={getImage(portrait)} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        )}
        <View style={styles.details}>
          <Text style={type.heading}>{ruler.text.ruler.name}</Text>
          <Text style={type.caption}>{ruler.text.ruler.subtitle}</Text>
          <Text style={[type.body, styles.gap]}>{ruler.text.ruler.tagline}</Text>
          <Text style={[type.muted, styles.gap]}>
            {format(strings.discovered, { count: book.discovered, total: book.total })}
          </Text>
          <Text style={type.muted}>
            {format(strings.endingsReached, { count: endingsReached, total: endingIds.length })}
          </Text>
        </View>
      </View>
      <GameButton
        label={strings.beginReign}
        disabled={save === 'loading'}
        onPress={() => (save === 'saved' ? setConfirming(true) : begin())}
      />
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
