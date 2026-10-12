// The title screen's level plate: medallion, rank, XP bar, XP towards the next level and gold.
import { StyleSheet, Text, View } from 'react-native';
import { levelFromTotalXp, type Progression, progression as config, rankTitle } from '../../game/progression';
import { useSkin } from '../skin/SkinProvider';
import { format, formatNumber, strings } from '../strings';
import { Coin, MedallionSlot, XpBar } from './ProgressionArt';

export function LevelPlate({ progression }: { progression: Progression }) {
  const skin = useSkin();
  const { level, xpIntoLevel, xpForLevel } = levelFromTotalXp(progression.totalXp);
  const small = { fontFamily: skin.fonts.body, color: skin.progression.colors.level };
  return (
    <View
      style={[styles.plate, { backgroundColor: skin.progression.colors.plate }]}
      accessible
      accessibilityLabel={`${format(strings.levelLabel, { level })}, ${rankTitle(level)}, ${format(strings.xpProgress, {
        into: formatNumber(xpIntoLevel),
        needed: formatNumber(xpForLevel),
      })}, ${formatNumber(progression.gold)} ${config.currency.name}`}
    >
      <MedallionSlot level={level} />
      <View style={styles.column}>
        <Text style={[styles.rank, { fontFamily: skin.fonts.caption, color: skin.progression.colors.rank }]} numberOfLines={1}>
          {rankTitle(level)}
        </Text>
        <XpBar fraction={xpIntoLevel / xpForLevel} />
        <View style={styles.row}>
          <Text style={[styles.small, small]}>
            {format(strings.xpProgress, { into: formatNumber(xpIntoLevel), needed: formatNumber(xpForLevel) })}
          </Text>
          <View style={styles.gold}>
            <Coin size={16} />
            <Text style={[styles.small, small, { color: skin.progression.colors.gold }]}>
              {formatNumber(progression.gold)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'stretch',
  },
  column: { flex: 1, gap: 3 },
  rank: { fontSize: 15, lineHeight: 19, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gold: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  small: { fontSize: 13, lineHeight: 17 },
});
