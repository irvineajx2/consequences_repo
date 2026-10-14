// The end-of-run Rewards panel: how the XP was earned, the XP bar filling (with a level-up moment
// for each level gained) and the gold earned, or why none was.
import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { progression as config, rankTitle, type RewardOutcome, xpBarSegments } from '../../game/progression';
import { GameButton } from '../GameButton';
import { AvatarView } from '../profile/AvatarView';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import { bandLabel, format, formatNumber, strings } from '../strings';
import { BandGem, Coin, Medallion, XpBar } from './ProgressionArt';

/** How long the bar takes to fill one level, and how long each level-up is held. */
const FILL_MS = 1100;
const LEVEL_UP_MS = 1600;
/** The smallest medallion's height as a share of the laurel framing it. */
const MEDALLION_IN_LAUREL = 0.46;
/** A level-up that reaches a new rank is held longer. */
const NEW_RANK_HOLD = 1.5;

/** Whether reaching `level` crosses into a new rank. */
const reachesNewRank = (level: number) => rankTitle(level) !== rankTitle(level - 1);

export function RewardsOverlay({
  rewards,
  achievements = [],
  onDone,
}: {
  rewards: RewardOutcome;
  /** Titles of achievements this run earned. */
  achievements?: readonly string[];
  onDone: () => void;
}) {
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
      const hold = reachesNewRank(segment.level + 1) ? LEVEL_UP_MS * NEW_RANK_HOLD : LEVEL_UP_MS;
      timers.push(setTimeout(() => setLevelUp(segment.level + 1), 300 + FILL_MS));
      timers.push(
        setTimeout(() => {
          setFilling(false);
          setIndex((i) => i + 1);
        }, 300 + FILL_MS + hold),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [segment]);

  const shownLevel = levelUp ?? segment.level;
  // Only the level-up that crosses into a new rank gets the major laurel and the rank title.
  const newRank = levelUp !== null && reachesNewRank(levelUp) ? rankTitle(levelUp) : null;
  const tiered = Math.round(breakdown.newEndingXp * breakdown.tier);
  const line = [text.body, styles.line];
  // The laurel at its layout size, smaller on short screens so the panel still fits.
  const { height: screenHeight } = useWindowDimensions();
  const { laurel } = skin.progression.ranks;
  const laurelHeight = Math.min(laurel.heightPt, screenHeight * 0.2);
  // As in the art's preview, the smallest medallion spans about 46% of the laurel's height; all
  // tiers share that scale, so higher ranks stay larger.
  const smallestTier = Math.min(...Object.values(skin.progression.ranks.tiers).map((t) => t.heightPt));
  const medallionScale = (laurelHeight * MEDALLION_IN_LAUREL) / smallestTier;

  return (
    <Animated.View entering={FadeIn.duration(350)} exiting={FadeOut.duration(250)} style={styles.backdrop}>
      <SkinPanel style={styles.panel}>
        <Text style={[text.caption, styles.title]} accessibilityRole="header">
          {strings.rewards}
        </Text>
        {/* The player's avatar, full figure, beside how the XP was earned. */}
        <View style={styles.breakdownRow}>
          <AvatarView size={58} variant="full" />
          <View style={styles.breakdown}>
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
          </View>
        </View>

        {/*
          The medallion, in its rank's colour; at each level-up a laurel scales in around it, framing
          the new level: the major laurel, with the new rank's title beneath, when the rank changes.
        */}
        <View style={[styles.levelArea, { height: laurelHeight }]}>
          {levelUp !== null && (
            <Animated.View
              key={levelUp}
              entering={ZoomIn.duration(450).easing(Easing.out(Easing.cubic))}
              style={styles.laurel}
            >
              <Image
                source={skin.progression.images[newRank !== null ? laurel.major : laurel.normal]}
                resizeMode="contain"
                style={{ width: laurelHeight * skin.progression.layout.laurel.aspect, height: laurelHeight }}
              />
            </Animated.View>
          )}
          <Medallion level={shownLevel} scale={medallionScale} />
        </View>
        <View style={styles.levelUpLines}>
          {levelUp !== null && (
            <Animated.View key={levelUp} entering={FadeIn.duration(300)}>
              <Text style={[text.heading, styles.centre, { color: skin.colors.panelCaption }]}>
                {format(strings.levelUp, { level: levelUp })}
              </Text>
              {newRank !== null && (
                <Text style={[text.caption, styles.centre, styles.rank, { color: skin.colors.panelText }]}>{newRank}</Text>
              )}
            </Animated.View>
          )}
        </View>
        <View style={styles.bar}>
          <XpBar key={index} fraction={filling ? segment.to : segment.from} durationMs={FILL_MS} />
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

        {achievements.map((title) => (
          <Text key={title} style={[text.body, styles.centre, { color: skin.colors.panelCaption }]}>
            {format(strings.achievementEarned, { title })}
          </Text>
        ))}

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
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdown: { flex: 1 },
  total: { textAlign: 'center', marginTop: 4 },
  levelArea: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laurel: { position: 'absolute', pointerEvents: 'none', alignItems: 'center', justifyContent: 'center' },
  // Room for the level and rank lines, so nothing moves when they appear.
  levelUpLines: { minHeight: 52, justifyContent: 'center', marginBottom: 6 },
  rank: { fontSize: 17, lineHeight: 22 },
  bar: { marginBottom: 10 },
  centre: { textAlign: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  button: { marginTop: 12 },
});
