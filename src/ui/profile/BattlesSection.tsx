// The profile's Battles section: for each battle, the best medal, endings and unlockables found, and
// the hidden plans faced. Unreached endings, unlockables and plans show as "???".
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { type BattleEntry, battles, battleUnlocked } from '../../data/battles';
import { getRuler } from '../../data/rulers';
import { battleView, countReached, type NamedEntry } from '../../game/battleView';
import type { Profile } from '../../game/profile';
import { battleIcons } from '../battle/battleArt';
import { bundledCachePolicy, RulerImage } from '../RulerImage';
import { useSkin } from '../skin/SkinProvider';
import { format, formatNumber, strings } from '../strings';
import { spacing } from '../theme';
import { Card, useScreenText } from './ProfileSections';

export function BattlesSection({ profile, unlockAll }: { profile: Profile; unlockAll: boolean }) {
  return (
    <>
      {battles.map((b) => (
        <BattleRecordCard key={b.id} entry={b} profile={profile} unlocked={battleUnlocked(b, profile, unlockAll)} />
      ))}
    </>
  );
}

function BattleRecordCard({ entry, profile, unlocked }: { entry: BattleEntry; profile: Profile; unlocked: boolean }) {
  const skin = useSkin();
  const t = useScreenText();
  const v = battleView(entry, profile, unlocked);
  const names = (list: readonly NamedEntry[]) => list.map((e) => e.title ?? strings.locked).join(', ');
  const stats: [string, string][] = [
    [strings.battles.fought, formatNumber(v.battlesCompleted)],
    [strings.battles.bestMedal, v.bestMedal ? entry.text.grades[v.bestMedal] : strings.battles.noMedal],
    [strings.battles.endings, format(strings.bestMatchedValue, { count: countReached(v.endings), total: v.endings.length })],
    [strings.battles.unlockables, format(strings.bestMatchedValue, { count: countReached(v.unlockables), total: v.unlockables.length })],
  ];
  const label = unlocked
    ? `${v.title}. ${stats.map(([l, s]) => `${l}: ${s}`).join('. ')}. ${strings.battles.plansFaced}: ${names(v.plans)}`
    : `${v.title}. ${format(strings.battles.unlockHint, { ruler: getRuler(v.unlockRuler).text.ruler.name })}`;
  return (
    <View accessible accessibilityLabel={label}>
      <Card style={[styles.card, !unlocked && styles.locked]}>
        <View style={styles.image}>
          <RulerImage rulerId={entry.id} imageId={v.cardImage} style={StyleSheet.absoluteFill} contentFit="cover" />
          {!unlocked && <View style={[StyleSheet.absoluteFill, { backgroundColor: skin.screen.lockedOverlay }]} />}
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={[t.heading, styles.flex]}>{v.title}</Text>
            {v.bestMedal && battleIcons[`medal_${v.bestMedal}`] && (
              <Image source={battleIcons[`medal_${v.bestMedal}`]} style={styles.medal} cachePolicy={bundledCachePolicy} accessible={false} />
            )}
          </View>
          {unlocked ? (
            <>
              {stats.map(([l, s]) => (
                <View key={l} style={styles.statRow}>
                  <Text style={[t.muted, styles.flex]}>{l}</Text>
                  <Text style={t.body}>{s}</Text>
                </View>
              ))}
              <Text style={[t.caption, styles.gap]}>{strings.battles.plansFaced.toUpperCase()}</Text>
              {v.plans.map((p) => (
                <Text key={p.id} style={p.reached ? t.body : t.muted}>
                  {p.title ?? strings.locked}
                  {p.won ? ' ✓' : ''}
                </Text>
              ))}
              <Text style={[t.caption, styles.gap]}>{strings.battles.endings.toUpperCase()}</Text>
              <Text style={t.muted}>{names(v.endings)}</Text>
              <Text style={[t.caption, styles.gap]}>{strings.battles.unlockables.toUpperCase()}</Text>
              <Text style={t.muted}>{names(v.unlockables)}</Text>
            </>
          ) : (
            <Text style={t.muted}>{format(strings.battles.unlockHint, { ruler: getRuler(v.unlockRuler).text.ruler.name })}</Text>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  locked: { opacity: 0.6 },
  image: { width: 72, aspectRatio: 3 / 4, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  medal: { width: 20, height: 29 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  gap: { marginTop: spacing.sm },
});
