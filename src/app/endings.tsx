import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getRuler } from '@/data/rulers';
import { endingsGallery, type GalleryEnding } from '@/game/chronicle';
import { emptyRulerProfile } from '@/game/profile';
import { endingText, type RulerText } from '@/game/text';
import { GameButton } from '@/ui/GameButton';
import { getImage, placeholderImage } from '@/ui/images';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { categoryLabel, format, strings } from '@/ui/strings';
import { spacing, textSizes } from '@/ui/theme';
import { useRulerProfile } from '@/ui/useProfile';

/** Every ending, grouped by category. Locked endings reveal only their category. */
export default function EndingsScreen() {
  const { ruler: rulerId } = useLocalSearchParams<{ ruler?: string }>();
  const ruler = getRuler(rulerId);
  const profile = useRulerProfile(ruler.rules.ruler);
  const skin = useSkin();
  const groups = endingsGallery(ruler.rules, profile ?? emptyRulerProfile);
  const unlocked = groups.flatMap((g) => g.endings).filter((e) => e.record).length;
  const total = groups.reduce((n, g) => n + g.endings.length, 0);

  return (
    <ScreenScaffold
      title={strings.endings}
      subtitle={profile ? `${unlocked} / ${total}` : ''}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      {profile &&
        groups.map((group) => (
          <View key={group.category}>
            <Text style={[textSizes.caption, styles.groupTitle, { fontFamily: skin.fonts.caption, color: skin.screen.mutedText }]}>
              {categoryLabel(group.category).toUpperCase()}
            </Text>
            <View style={styles.grid}>
              {group.endings.map((ending) => (
                <View key={ending.id} style={styles.cell}>
                  <EndingCard ending={ending} text={ruler.text} />
                </View>
              ))}
            </View>
          </View>
        ))}
    </ScreenScaffold>
  );
}

function EndingCard({ ending, text }: { ending: GalleryEnding; text: RulerText }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const record = ending.record;
  return (
    <SkinPanel style={styles.card}>
      <View style={styles.imageBox}>
        {/* A locked ending never shows its real image. */}
        <Image source={record ? getImage(ending.image) : placeholderImage} style={StyleSheet.absoluteFill} contentFit="cover" />
        {!record && <View style={[StyleSheet.absoluteFill, { backgroundColor: screen.lockedOverlay }]} />}
      </View>
      {record ? (
        <>
          <Text style={[type.body, styles.title]}>{endingText(text, ending.id).title}</Text>
          <Text style={type.muted}>{format(strings.timesReached, { count: record.timesReached })}</Text>
          {record.bestScore !== undefined && (
            <Text style={type.muted}>{format(strings.bestScore, { score: Math.round(record.bestScore * 10) / 10 })}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={[type.body, styles.title]}>{strings.locked}</Text>
          <Text style={type.caption}>{categoryLabel(ending.category)}</Text>
        </>
      )}
    </SkinPanel>
  );
}

const styles = StyleSheet.create({
  groupTitle: { marginTop: spacing.sm, marginBottom: spacing.xs, marginLeft: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs / 2 },
  cell: { width: '50%', padding: spacing.xs / 2 },
  card: { flexGrow: 1 },
  // Cropped thumbnails keep the grid compact; the full 9:16 image is shown at the end of a run.
  imageBox: { aspectRatio: 4 / 5, borderRadius: 3, overflow: 'hidden', marginBottom: spacing.xs },
  title: { marginBottom: 2 },
});
