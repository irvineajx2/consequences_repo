// The end-of-run Rewards panel: how the XP was earned, the XP bar filling (with a level-up moment
// for each level gained) and the gold earned, or why none was.
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { progression as config, rankTitle, type RewardOutcome, xpBarSegments } from '../../game/progression';
import { GameButton } from '../GameButton';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import { bandLabel, format, formatNumber, strings } from '../strings';
import { BandGem, Coin, Medallion, XpBar } from './ProgressionArt';

/** How long the bar takes to fill one level, and how long each level-up is held. */
const FILL_MS = 1100;
const LEVEL_UP_MS = 1600;

export function RewardsOverlay({ rewards, onDone }: { rewards: RewardOutcome; onDone: () => void }) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  const { breakdown } = rewards;
  const segments = useMemo(
    () => xpBarSegments(rewards.totalXpBefore, rewards.totalXpBefore + rewards.breakdown.totalXp),
    [rewards],
  );
  // Which bar segment is showing, whether it has started filling, and the level-up being celebrated.
  const [index, setIndex] = useState(0);
  const [filling, setFilling] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const segment = segments[index];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setFilling(true), 300));
    if (segment.levelUp) {
      timers.push(setTimeout(() => setLevelUp(segment.level + 1), 300 + FILL_MS));
      timers.push(
        setTimeout(() => {
          setFilling(false);
          setIndex((i) => i + 1);
        }, 300 + FILL_MS + LEVEL_UP_MS),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [segment]);

  const shownLevel = levelUp ?? segment.level;
  const newRank = levelUp !== null && rankTitle(levelUp) !== rankTitle(levelUp - 1) ? rankTitle(levelUp) : null;
  const tiered = Math.round(breakdown.newEndingXp * breakdown.tier);
  const line = [text.body, styles.line];
  // The laurel at its layout size, smaller on short screens so the panel still fits.
  const { height: screenHeight } = useWindowDimensions();
  const laurelHeight = Math.min(skin.progression.layout.laurel.heightPt, screenHeight * 0.2);

  return (
    <Animated.View entering={FadeIn.duration(350)} exiting={FadeOut.duration(250)} style={styles.backdrop}>
      <SkinPanel style={styles.panel}>
        <Text style={[text.caption, styles.title]} accessibilityRole="header">
          {strings.rewards}
        </Text>
        <Text style={line}>
          {format(strings.rewardDecisions, {
            count: breakdown.decisions,
            per: breakdown.perDecision,
            xp: formatNumber(breakdown.decisionXp),
          })}
        </Text>
        {breakdown.tier !== 1 && <Text style={line}>{format(strings.rewardTier, { tier: breakdown.tier })}</Text>}
        {breakdown.newEnding && <Text style={line}>{format(strings.rewardNewEnding, { xp: formatNumber(tiered) })}</Text>}
        <Text style={[text.heading, styles.total, { color: skin.colors.panelCaption }]}>
          {format(strings.rewardTotal, { xp: formatNumber(breakdown.totalXp) })}
        </Text>

        {/* The medallion; at each level-up the laurel scales in around it, framing the new level. */}
        <View style={[styles.levelArea, { height: laurelHeight }]}>
          {levelUp !== null && (
            <Animated.View
              key={levelUp}
              entering={ZoomIn.duration(450).easing(Easing.out(Easing.cubic))}
              style={styles.laurel}
            >
              <Image
                source={skin.progression.images.laurel}
                resizeMode="contain"
                style={{ width: laurelHeight * skin.progression.layout.laurel.aspect, height: laurelHeight }}
              />
            </Animated.View>
          )}
          <Medallion level={shownLevel} size={Math.min(skin.progression.layout.medallion.heightPt, laurelHeight * 0.45)} />
        </View>
        <XpBar key={index} fraction={filling ? segment.to : segment.from} durationMs={FILL_MS} />
        <View style={styles.levelUpLine}>
          {levelUp !== null && (
            <Animated.Text
              key={levelUp}
              entering={FadeIn.duration(300)}
              style={[text.heading, styles.centre, { color: skin.colors.panelCaption }]}
            >
              {format(strings.levelUp, { level: levelUp })}
              {newRank !== null ? ` · ${format(strings.newRank, { rank: newRank })}` : ''}
            </Animated.Text>
          )}
        </View>

        {breakdown.band !== undefined && (
          <View style={styles.iconRow}>
            <BandGem band={breakdown.band} />
            <Text style={[text.body, { color: skin.colors.panelText }]}>
              {format(strings.bandEnding, { band: bandLabel(breakdown.band) })}
            </Text>
          </View>
        )}
        {breakdown.gold > 0 ? (
          <View style={styles.iconRow}>
            <Coin />
            <Text style={[text.body, { color: skin.colors.panelText }]}>
              {format(strings.goldEarned, { gold: formatNumber(breakdown.gold), currency: config.currency.name })}
            </Text>
          </View>
        ) : (
          <Text style={[text.muted, styles.centre]}>{format(strings.goldRule, { currency: config.currency.name })}</Text>
        )}

        <View style={styles.button}>
          <GameButton label={strings.continue} onPress={onDone} />
        </View>
      </SkinPanel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 10, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  panel: { alignSelf: 'center', width: '100%', maxWidth: 420 },
  title: { textAlign: 'center', marginBottom: 8 },
  line: { textAlign: 'center' },
  total: { textAlign: 'center', marginTop: 4 },
  levelArea: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laurel: { position: 'absolute', pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' },
  levelUpLine: { minHeight: 30, justifyContent: 'center', marginTop: 6 },
  centre: { textAlign: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  button: { marginTop: 12 },
});
