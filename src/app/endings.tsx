import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRuler, rulerUnlocked, rulers } from '@/data/rulers';
import { endingsGallery, type GalleryEnding } from '@/game/chronicle';
import { emptyProfile, rulerProfile } from '@/game/profile';
import { endingBand, endingGold, progression } from '@/game/progression';
import { endingText, type RulerText } from '@/game/text';
import { GameButton } from '@/ui/GameButton';
import { BandGem } from '@/ui/progression/ProgressionArt';
import { RulerTabs } from '@/ui/screens/RulerTabs';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { bandLabel, categoryLabel, format, formatNumber, strings } from '@/ui/strings';
import { spacing, textSizes } from '@/ui/theme';
import { useProfile, useUnlockAll } from '@/ui/useProfile';
import { RulerImage } from '@/ui/RulerImage';

/** One tab per unlocked ruler: every ending, grouped by category; unreached ones show only their category. */
export default function EndingsScreen() {
  const { ruler: requested } = useLocalSearchParams<{ ruler?: string }>();
  const stored = useProfile();
  const [unlockAll] = useUnlockAll();
  const all = stored ?? emptyProfile;
  const open = rulers.filter((r) => rulerUnlocked(r, all, unlockAll));
  const [selected, setSelected] = useState(requested ?? rulers[0].id);
  const ruler = open.find((r) => r.id === selected) ?? getRuler(open[0]?.id);
  const profile = stored ? rulerProfile(stored, ruler.rules.ruler) : null;
  const skin = useSkin();
  const groups = endingsGallery(ruler.rules, profile ?? rulerProfile(all, ruler.rules.ruler));
  const unlocked = groups.flatMap((g) => g.endings).filter((e) => e.record).length;
  const total = groups.reduce((n, g) => n + g.endings.length, 0);

  return (
    <ScreenScaffold
      title={strings.endings}
      subtitle={profile ? `${unlocked} / ${total}` : ''}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      <RulerTabs rulers={open} selected={ruler.id} onSelect={setSelected} />
      {profile &&
        groups.map((group) => (
          <View key={group.category}>
            <Text style={[textSizes.caption, styles.groupTitle, { fontFamily: skin.fonts.caption, color: skin.screen.mutedText }]}>
              {categoryLabel(group.category).toUpperCase()}
            </Text>
            <View style={styles.grid}>
              {group.endings.map((ending) => (
                <View key={ending.id} style={styles.cell}>
                  <EndingCard ending={ending} text={ruler.text} rulerId={ruler.id} />
                </View>
              ))}
            </View>
          </View>
        ))}
    </ScreenScaffold>
  );
}

function EndingCard({ ending, text, rulerId }: { ending: GalleryEnding; text: RulerText; rulerId: string }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const record = ending.record;
  const band = endingBand(rulerId, ending.id);
  return (
    <SkinPanel style={styles.card}>
      <View style={styles.imageBox}>
        {/* A locked ending never shows its real image. */}
        <RulerImage rulerId={rulerId} imageId={record ? ending.image : null} style={StyleSheet.absoluteFill} contentFit="cover" />
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
      {band !== undefined && (
        <View style={styles.band}>
          <BandGem band={band} />
          <Text style={[type.muted, styles.bandText]} numberOfLines={1}>
            {format(strings.bandGold, {
              band: bandLabel(band),
              gold: formatNumber(endingGold(rulerId, ending.id)),
              currency: progression.currency.name,
            })}
          </Text>
        </View>
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
  band: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  bandText: { flexShrink: 1 },
});
