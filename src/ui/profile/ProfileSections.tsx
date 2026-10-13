// The profile screen's sections. They only draw a ProfileView: every number comes from its selectors.
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import features from '../../data/features.json';
import { achievementShare, type FeaturedAchievement, type RulerFacts } from '../../game/achievements';
import { checkNickname, NICKNAME_MAX } from '../../game/nickname';
import type { AchievementView, ProfileView, RarityRowView, RulerCardView } from '../../game/profileView';
import { GameButton } from '../GameButton';
import { Coin, MedallionSlot, XpBar } from '../progression/ProgressionArt';
import { RulerImage } from '../RulerImage';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import {
  categoryLabel,
  format,
  formatDate,
  formatNumber,
  formatShare,
  rarityLabel,
  strings,
} from '../strings';
import { spacing, textSizes } from '../theme';
import { AvatarView } from './AvatarView';
import { Badge } from './Badge';

/** Text on the dark screen background, in the skin's fonts. */
function useScreenText() {
  const skin = useSkin();
  return {
    heading: { ...textSizes.heading, fontFamily: skin.fonts.caption, color: skin.screen.text },
    body: { ...textSizes.body, fontFamily: skin.fonts.body, color: skin.screen.text },
    muted: { ...textSizes.muted, fontFamily: skin.fonts.body, color: skin.screen.mutedText },
    caption: { ...textSizes.caption, fontFamily: skin.fonts.caption, color: skin.screen.mutedText },
  };
}

function Card({ children, style }: { children: ReactNode; style?: object }) {
  const skin = useSkin();
  return <View style={[styles.card, { backgroundColor: skin.progression.colors.plate }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const t = useScreenText();
  return (
    <Text style={[t.caption, styles.sectionTitle]} accessibilityRole="header">
      {children.toUpperCase()}
    </Text>
  );
}

// 2.1 Header ---------------------------------------------------------------------------------------

export function ProfileHeader({ view, onEditNickname }: { view: ProfileView; onEditNickname: () => void }) {
  const skin = useSkin();
  const t = useScreenText();
  const { width } = useWindowDimensions();
  const { identity } = view;
  const avatarWidth = Math.min(160, (width - 2 * spacing.md) * 0.4 - spacing.sm);
  const tier = skin.progression.ranks.ranks[identity.rank];
  const tint = (tier && skin.profile.rankTint[tier]) ?? skin.profile.avatarFrame;
  return (
    <View style={styles.header}>
      <View style={[styles.avatarColumn, { width: avatarWidth }]}>
        <AvatarView size={avatarWidth * 0.86} variant="full" />
        <View style={[styles.plinth, { width: avatarWidth, backgroundColor: tint }]} />
      </View>
      <View style={styles.identity}>
        <Pressable
          onPress={onEditNickname}
          accessibilityRole="button"
          accessibilityLabel={`${identity.nickname}. ${strings.editNickname}`}
        >
          <Text style={[t.heading, styles.nickname]}>{identity.nickname} ✎</Text>
        </Pressable>
        <Text style={[t.body, { fontFamily: skin.fonts.caption, color: skin.progression.colors.rank }]}>
          {identity.rank}
        </Text>
        <View style={styles.levelRow}>
          <MedallionSlot level={identity.level} />
          <View style={styles.flex}>
            <Text style={t.muted}>{format(strings.levelLabel, { level: identity.level })}</Text>
            <XpBar fraction={identity.xpIntoLevel / identity.xpForLevel} />
          </View>
        </View>
        <Text style={t.muted}>
          {format(strings.xpProgress, { into: formatNumber(identity.xpIntoLevel), needed: formatNumber(identity.xpForLevel) })}
        </Text>
        <View style={styles.goldRow} accessible accessibilityLabel={`${formatNumber(identity.gold)} Gold`}>
          <Coin size={18} />
          <Text style={[t.body, { color: skin.progression.colors.gold }]}>{formatNumber(identity.gold)}</Text>
        </View>
      </View>
    </View>
  );
}

// 2.6 Featured achievement banner ----------------------------------------------------------------

export function FeaturedBanner({
  featured,
  rulers,
  onPress,
}: {
  featured: FeaturedAchievement | null;
  rulers: readonly RulerFacts[];
  onPress: (id: string) => void;
}) {
  const t = useScreenText();
  if (featured === null) {
    return (
      <Card style={styles.banner}>
        <Badge id="badge_base" title="" earned={false} />
        <Text style={[t.muted, styles.flex]}>{strings.noAchievementsYet}</Text>
      </Card>
    );
  }
  const { achievement, earnedAt, kind } = featured;
  const share = achievementShare(achievement, rulers);
  const label = kind === 'featured' ? strings.featured : strings.rarestAchievement;
  const details = [format(strings.earnedOn, { date: formatDate(earnedAt) })];
  if (share !== undefined && share < 1) details.push(format(strings.achievementShare, { share: formatShare(share) }));
  return (
    <Pressable onPress={() => onPress(achievement.id)} accessibilityRole="button" accessibilityLabel={`${label}: ${achievement.title}. ${details.join('. ')}`}>
      <Card style={styles.banner}>
        <Badge id={achievement.id} title={achievement.title} earned />
        <View style={styles.flex}>
          <Text style={t.caption}>{label.toUpperCase()}</Text>
          <Text style={t.body}>{achievement.title}</Text>
          <Text style={t.muted}>{details.join(' · ')}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

// 2.2 Summary tiles ------------------------------------------------------------------------------

export function SummaryTiles({ view }: { view: ProfileView }) {
  const t = useScreenText();
  const { width } = useWindowDimensions();
  const { summary: s } = view;
  const tiles = [
    { title: strings.tileEndings, count: s.endingsReached, total: s.endingsTotal, label: strings.tileEndingsLabel },
    { title: strings.tileMatchedHistory, count: s.matchedHistory, total: s.rulers, label: strings.tileMatchedLabel },
    { title: strings.tileOutdidHistory, count: s.outdidHistory, total: s.rulers, label: strings.tileOutdidLabel },
    { title: strings.tileAchievements, count: s.achievementsEarned, total: s.achievementsTotal, label: strings.tileAchievementsLabel },
  ];
  // Four in a row, or two by two on small screens.
  const basis = width < 400 ? '47%' : '22%';
  return (
    <View style={styles.tiles}>
      {tiles.map((tile) => (
        <Card key={tile.title} style={[styles.tile, { flexBasis: basis }]}>
          <View accessible accessibilityLabel={format(tile.label, { count: tile.count, total: tile.total })}>
            <Text style={[t.heading, styles.centre]}>{format(strings.ofTotal, { count: tile.count, total: tile.total })}</Text>
            <Text style={[t.muted, styles.centre]}>{tile.title}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

// 2.3 Endings by rarity --------------------------------------------------------------------------

export function RarityRows({ rows }: { rows: readonly RarityRowView[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card style={styles.list}>
      {rows.map((row) => (
        <RarityRow key={row.tier} row={row} open={open === row.tier} onToggle={() => setOpen(open === row.tier ? null : row.tier)} />
      ))}
    </Card>
  );
}

function RarityRow({ row, open, onToggle }: { row: RarityRowView; open: boolean; onToggle: () => void }) {
  const skin = useSkin();
  const t = useScreenText();
  const name = rarityLabel(row.tier);
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={format(strings.rarityRowLabel, { tier: name, count: row.reached, total: row.total })}
        style={styles.rarityRow}
      >
        <View style={[styles.dot, { backgroundColor: skin.profile.rarity[row.tier] }]} />
        <Text style={[t.body, styles.flex]}>{name}</Text>
        <Text style={t.body}>{format(strings.ofTotal, { count: row.reached, total: row.total })}</Text>
        <Text style={[t.muted, styles.chevron]}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open &&
        row.byRuler.map((group) => (
          <View key={group.rulerId} style={styles.rarityGroup}>
            <Text style={t.caption}>{group.name.toUpperCase()}</Text>
            {group.endings.map((e) =>
              e.title === null ? (
                <Text key={e.endingId} style={t.muted} accessibilityLabel={strings.locked}>
                  {strings.lockedEnding}
                </Text>
              ) : (
                <Pressable
                  key={e.endingId}
                  accessibilityRole="link"
                  onPress={() => router.push({ pathname: '/endings', params: { ruler: e.rulerId } })}
                >
                  <Text style={[t.body, { color: skin.screen.highlight }]}>{e.title}</Text>
                </Pressable>
              ),
            )}
          </View>
        ))}
    </View>
  );
}

// 2.4 Rulers -------------------------------------------------------------------------------------

export function RulerCards({ rulers }: { rulers: readonly RulerCardView[] }) {
  return (
    <>
      {rulers.map((r) => (
        <RulerCard key={r.rulerId} ruler={r} />
      ))}
    </>
  );
}

function RulerCard({ ruler: r }: { ruler: RulerCardView }) {
  const skin = useSkin();
  const t = useScreenText();
  const stats: [string, string][] = [
    [strings.runsPlayed, formatNumber(r.runs)],
    [strings.bestMatched, r.bestMatched === null ? strings.notYet : format(strings.bestMatchedValue, { count: r.bestMatched, total: r.mainScenes })],
    [strings.bestResult, r.bestResult === null ? strings.notYet : categoryLabel(r.bestResult)],
    [strings.rulerEndings, format(strings.bestMatchedValue, { count: r.endingsReached, total: r.endingsTotal })],
    [strings.unchartedStat, format(strings.bestMatchedValue, { count: r.branchVisited, total: r.branchTotal })],
    [strings.chronicleStat, format(strings.percent, { value: r.chroniclePercent })],
  ];
  const content = (
    <Card style={[styles.rulerCard, !r.unlocked && styles.locked]}>
      <View style={styles.rulerImage}>
        <RulerImage rulerId={r.rulerId} imageId={r.cardImage ?? null} style={StyleSheet.absoluteFill} contentFit="cover" />
        {!r.unlocked && <View style={[StyleSheet.absoluteFill, { backgroundColor: skin.screen.lockedOverlay }]} />}
      </View>
      <View style={styles.flex}>
        <Text style={t.heading}>{r.name}</Text>
        {r.unlocked ? (
          stats.map(([label, value]) => (
            <View key={label} style={styles.statRow}>
              <Text style={[t.muted, styles.flex]}>{label}</Text>
              <Text style={t.body}>{value}</Text>
            </View>
          ))
        ) : (
          <Text style={t.muted}>{format(strings.unlockHint, { ruler: r.unlockedByName ?? '' })}</Text>
        )}
      </View>
    </Card>
  );
  if (!r.unlocked) {
    return (
      <View accessible accessibilityLabel={`${r.name}. ${format(strings.unlockHint, { ruler: r.unlockedByName ?? '' })}`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.name}. ${stats.map(([l, v]) => `${l}: ${v}`).join('. ')}`}
      onPress={() => router.push({ pathname: '/chronicle', params: { ruler: r.rulerId } })}
    >
      {content}
    </Pressable>
  );
}

// 2.5 Achievements -------------------------------------------------------------------------------

export function AchievementGrid({ achievements, onPress }: { achievements: readonly AchievementView[]; onPress: (id: string) => void }) {
  const skin = useSkin();
  const t = useScreenText();
  return (
    <Card style={styles.grid}>
      {achievements.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => onPress(a.id)}
          style={styles.gridCell}
          accessibilityRole="button"
          accessibilityLabel={format(strings.badgeLabel, {
            title: a.title,
            state: a.earned ? `${format(strings.earnedOn, { date: formatDate(a.earnedAt ?? '') })}${a.featured ? `. ${strings.featured}` : ''}` : strings.notEarned,
          })}
        >
          <View>
            <Badge id={a.id} title={a.title} earned={a.earned} />
            {a.featured && <View style={[styles.featuredMark, { backgroundColor: skin.progression.colors.xpFill }]} />}
          </View>
          <Text style={[t.muted, styles.centre]} numberOfLines={2}>
            {a.title}
          </Text>
          {a.earned && <Text style={[t.caption, styles.centre]}>{formatDate(a.earnedAt ?? '')}</Text>}
        </Pressable>
      ))}
    </Card>
  );
}

// 2.7 Weekly quiz (reserved) ---------------------------------------------------------------------

export function QuizCard() {
  const t = useScreenText();
  // Behind the `quiz` flag (off): the slot for season points, tier and best percentile later.
  if (features.quiz) return null;
  return (
    <Card style={styles.banner}>
      <Text style={[t.body, styles.flex]}>{strings.quizComingSoon}</Text>
    </Card>
  );
}

// Dialogs ----------------------------------------------------------------------------------------

function Dialog({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SkinPanel style={styles.dialog}>{children}</SkinPanel>
      </View>
    </Modal>
  );
}

export function NicknameDialog({
  visible,
  current,
  onSave,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSave: (nickname: string) => void;
  onClose: () => void;
}) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    const check = checkNickname(value);
    if (!check.ok) return setError(strings.nicknameErrors[check.reason]);
    setError(null);
    onSave(check.nickname);
  };
  return (
    <Dialog visible={visible} onClose={onClose}>
      <Text style={text.caption}>{strings.nicknameLabel.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        maxLength={NICKNAME_MAX}
        autoFocus
        accessibilityLabel={strings.nicknameLabel}
        style={[text.body, styles.input, { borderColor: skin.colors.panelCaption }]}
        onSubmitEditing={save}
      />
      {error !== null && <Text style={[text.muted, { color: skin.meters.colors.trackDanger }]}>{error}</Text>}
      <GameButton label={strings.save} onPress={save} />
      <GameButton label={strings.cancel} onPress={onClose} />
    </Dialog>
  );
}

export function AchievementDialog({
  achievement,
  onFeature,
  onClose,
}: {
  achievement: AchievementView | null;
  onFeature: (id: string | null) => void;
  onClose: () => void;
}) {
  const text = useSkinTextStyles();
  if (achievement === null) return null;
  return (
    <Dialog visible onClose={onClose}>
      <View style={styles.dialogBadge}>
        <Badge id={achievement.id} title={achievement.title} earned={achievement.earned} size={72} />
      </View>
      <Text style={[text.heading, styles.centre]}>{achievement.title}</Text>
      <Text style={[text.body, styles.centre]}>{achievement.description}</Text>
      <Text style={[text.muted, styles.centre]}>
        {achievement.earned ? format(strings.earnedOn, { date: formatDate(achievement.earnedAt ?? '') }) : strings.notEarned}
      </Text>
      {achievement.earned &&
        (achievement.featured ? (
          <>
            <Text style={[text.caption, styles.centre]}>{strings.featured.toUpperCase()}</Text>
            <GameButton label={strings.unfeature} onPress={() => onFeature(null)} />
          </>
        ) : (
          <GameButton label={strings.featureOnProfile} onPress={() => onFeature(achievement.id)} />
        ))}
      <GameButton label={strings.close} onPress={onClose} />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, flexShrink: 1 },
  centre: { textAlign: 'center' },
  card: { borderRadius: 12, padding: spacing.sm },
  sectionTitle: { marginTop: spacing.sm, marginLeft: spacing.xs },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', paddingHorizontal: spacing.xs },
  avatarColumn: { alignItems: 'center' },
  plinth: { height: 14, borderRadius: 6, marginTop: -4 },
  identity: { flex: 1, gap: 4 },
  nickname: { flexShrink: 1 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, minHeight: 72, justifyContent: 'center' },
  list: { paddingVertical: spacing.xs },
  rarityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, minHeight: 44 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  chevron: { width: 16, textAlign: 'right' },
  rarityGroup: { paddingLeft: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  rulerCard: { flexDirection: 'row', gap: spacing.md },
  locked: { opacity: 0.6 },
  rulerImage: { width: 72, aspectRatio: 2 / 3, borderRadius: 6, overflow: 'hidden', alignSelf: 'flex-start' },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: spacing.md },
  gridCell: { width: '25%', minWidth: 76, alignItems: 'center', gap: 2, paddingHorizontal: 2 },
  featuredMark: { position: 'absolute', right: -2, top: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#14100C' },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: 'rgba(8, 6, 10, 0.72)' },
  dialog: { alignSelf: 'center', width: '100%', maxWidth: 420 },
  dialogBadge: { alignItems: 'center', marginBottom: spacing.sm },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginVertical: spacing.sm },
});
