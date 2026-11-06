import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { type BattleEntry, battles, battleUnlocked } from '@/data/battles';
import { getRuler } from '@/data/rulers';
import { hasBattleSave } from '@/game/battlePersistence';
import { battleView, countReached } from '@/game/battleView';
import type { Profile } from '@/game/profile';
import { appStorage } from '@/ui/appStorage';
import { battleBanner, battleIcons } from '@/ui/battle/battleArt';
import { ConfirmNewReign } from '@/ui/ConfirmNewReign';
import { GameButton } from '@/ui/GameButton';
import { bundledCachePolicy, RulerImage } from '@/ui/RulerImage';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';
import { useProfile, useUnlockAll } from '@/ui/useProfile';

/** Every battle as a card, locked or open, under the battle mode banner. */
export default function BattlesScreen() {
  const profile = useProfile();
  const [unlockAll] = useUnlockAll();
  const { width } = useWindowDimensions();
  const skin = useSkin();
  const bannerWidth = Math.min(width - spacing.md * 2, 520);
  return (
    <ScreenScaffold title={strings.battles.title} footer={<GameButton label={strings.back} onPress={() => router.back()} />}>
      {battleBanner && (
        <Image
          source={battleBanner}
          cachePolicy={bundledCachePolicy}
          style={[styles.banner, { width: bannerWidth, height: (bannerWidth * 941) / 1672, borderColor: skin.screen.highlight }]}
          contentFit="cover"
          accessible={false}
        />
      )}
      <Text style={[styles.modeLine, { color: skin.screen.mutedText, fontFamily: skin.fonts.body }]}>{strings.battles.modeLine}</Text>
      {profile && battles.map((b) => <BattleCard key={b.id} entry={b} profile={profile} unlocked={battleUnlocked(b, profile, unlockAll)} />)}
    </ScreenScaffold>
  );
}

function BattleCard({ entry, profile, unlocked }: { entry: BattleEntry; profile: Profile; unlocked: boolean }) {
  const type = useSkinTextStyles();
  const { screen } = useSkin();
  const v = battleView(entry, profile, unlocked);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      hasBattleSave(appStorage, entry).then((s) => {
        if (!cancelled) setSaved(s);
      });
      return () => {
        cancelled = true;
      };
    }, [entry]),
  );
  const begin = () => {
    setConfirming(false);
    router.push({ pathname: '/battle', params: { battle: entry.id, mode: 'new' } });
  };
  const rulerName = getRuler(v.unlockRuler).text.ruler.name;

  return (
    <SkinPanel>
      <View style={styles.cardBody}>
        <View style={[styles.cardImage, { borderColor: unlocked ? screen.highlight : screen.mutedText }]}>
          <RulerImage rulerId={entry.id} imageId={v.cardImage} style={StyleSheet.absoluteFill} contentFit="cover" />
          {!unlocked && <View style={[StyleSheet.absoluteFill, { backgroundColor: screen.lockedOverlay }]} />}
        </View>
        <View style={styles.details}>
          <Text style={type.heading}>{v.title}</Text>
          <Text style={type.caption}>{v.years}</Text>
          <Text style={[type.body, styles.gap]}>{v.card}</Text>
          {unlocked ? (
            <>
              {v.bestMedal && battleIcons[`medal_${v.bestMedal}`] && (
                <View style={[styles.medalRow, styles.gap]}>
                  <Image source={battleIcons[`medal_${v.bestMedal}`]} style={styles.medal} cachePolicy={bundledCachePolicy} accessible={false} />
                  <Text style={type.muted}>{`${strings.battles.bestMedal}: ${entry.text.grades[v.bestMedal]}`}</Text>
                </View>
              )}
              <Text style={[type.muted, styles.gap]}>{format(strings.battles.endingsCount, { count: countReached(v.endings), total: v.endings.length })}</Text>
              <Text style={type.muted}>
                {format(strings.battles.unlockablesCount, { count: countReached(v.unlockables), total: v.unlockables.length })}
              </Text>
            </>
          ) : (
            <Text style={[type.muted, styles.gap]}>{format(strings.battles.unlockHint, { ruler: rulerName })}</Text>
          )}
        </View>
      </View>
      {unlocked && saved && (
        <GameButton label={strings.battles.continue} onPress={() => router.push({ pathname: '/battle', params: { battle: entry.id, mode: 'continue' } })} />
      )}
      {unlocked && <GameButton label={strings.battles.begin} disabled={saved === null} onPress={() => (saved ? setConfirming(true) : begin())} />}
      <ConfirmNewReign
        visible={confirming}
        onConfirm={begin}
        onCancel={() => setConfirming(false)}
        message={strings.battles.confirmNew}
        confirmLabel={strings.battles.confirmDiscard}
        cancelLabel={strings.battles.keep}
      />
    </SkinPanel>
  );
}

const styles = StyleSheet.create({
  banner: { alignSelf: 'center', borderWidth: 2, borderRadius: 3, marginBottom: spacing.sm },
  modeLine: { textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  cardBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  cardImage: { width: '38%', aspectRatio: 3 / 4, borderWidth: 2, borderRadius: 3, overflow: 'hidden' },
  details: { flex: 1 },
  gap: { marginTop: spacing.xs },
  medalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  medal: { width: 20, height: 29 },
});
