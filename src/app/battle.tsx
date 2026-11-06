import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type BattleData, phaseCount } from '@/battle';
import { type BattleEntry, getBattle } from '@/data/battles';
import { medalOf } from '@/game/battleRecord';
import { progression } from '@/game/progression';
import { battleIcons, battleSectorFiles } from '@/ui/battle/battleArt';
import { BattleMap } from '@/ui/battle/BattleMap';
import { parseSectorMap } from '@/ui/battle/mapLayout';
import { orderMarkers, reportMarkers } from '@/ui/battle/markers';
import { PhasePanel } from '@/ui/battle/PhasePanel';
import { type FinishedBattle, useBattleScreen, viewOf } from '@/ui/battle/useBattleScreen';
import { GameButton } from '@/ui/GameButton';
import { RewardsOverlay } from '@/ui/progression/RewardsOverlay';
import { bundledCachePolicy, RulerImage } from '@/ui/RulerImage';
import { SceneFrame } from '@/ui/SceneFrame';
import { SkinPanel } from '@/ui/skin/SkinPanel';
import { useSkin } from '@/ui/skin/SkinProvider';
import { useSkinTextStyles } from '@/ui/skin/textStyles';
import { format, formatNumber, strings } from '@/ui/strings';
import { spacing } from '@/ui/theme';
import { useDecidePanelLayout } from '@/ui/useDecidePanelLayout';

const toBattles = () => (router.canGoBack() ? router.back() : router.replace('/battles'));

/** `?battle=<id>&mode=continue` resumes the saved battle; otherwise a new one begins. */
export default function BattleScreen() {
  const params = useLocalSearchParams<{ battle?: string; mode?: string }>();
  const entry = getBattle(params.battle ?? 'alesia');
  return <Battle entry={entry} mode={params.mode === 'continue' ? 'continue' : 'new'} />;
}

/** How long the result card shows on its own before the rewards appear. */
const REWARDS_DELAY_MS = 1200;

function Battle({ entry, mode }: { entry: BattleEntry; mode: 'new' | 'continue' }) {
  const screen = useBattleScreen(entry, mode);
  const skin = useSkin();
  const { state } = screen;
  if (state === null) return <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]} />;
  const view = viewOf(entry, state);
  const { data } = entry.battle;
  const { text } = entry;

  switch (view.kind) {
    case 'intro':
      return (
        <TextScene
          battleId={entry.id}
          image={data.images.maps.day}
          caption={text.battle.intro_caption}
          heading={text.battle.title}
          body={text.battle.intro}
          onContinue={screen.dismissIntro}
        />
      );
    case 'scene':
      return <ChoiceScene entry={entry} sceneId={view.sceneId} onChoose={(c) => screen.choose(view.sceneId, c)} />;
    case 'consequence':
      return (
        <TextScene
          battleId={entry.id}
          image={data.images.scenes[view.sceneId]}
          caption={text.scenes[view.sceneId]?.caption ?? ''}
          body={text.scenes[view.sceneId]?.consequences[view.choice] ?? ''}
          onContinue={screen.dismissConsequence}
        />
      );
    case 'orders':
    case 'report':
      return <MapScreen entry={entry} screen={screen} report={view.kind === 'report'} />;
    case 'result':
      return <ResultCard entry={entry} state={state} finished={screen.finished} onAgain={screen.restart} />;
  }
}

function TextScene(props: { battleId: string; image: string; caption: string; heading?: string; body: string; onContinue: () => void }) {
  const type = useSkinTextStyles();
  return (
    <SceneFrame rulerId={props.battleId} image={props.image} footer={<GameButton label={strings.continue} onPress={props.onContinue} />}>
      <Text style={type.caption}>{props.caption}</Text>
      {props.heading && <Text style={type.heading}>{props.heading}</Text>}
      <Text style={[type.body, styles.gap]}>{props.body}</Text>
    </SceneFrame>
  );
}

/**
 * A decision scene in the ruler scenes' panel: read (caption, narration, Decide), then decide (the
 * narration scrolled to its end above the options, which never scroll).
 */
function ChoiceScene({ entry, sceneId, onChoose }: { entry: BattleEntry; sceneId: string; onChoose: (choice: string) => void }) {
  const type = useSkinTextStyles();
  const scene = entry.text.scenes[sceneId];
  const options = entry.battle.data.scenes[sceneId].options;
  const layout = useDecidePanelLayout(options.length);
  const [deciding, setDeciding] = useState(false);
  return (
    <SceneFrame
      rulerId={entry.id}
      image={entry.battle.data.images.scenes[sceneId]}
      panelHeight={deciding ? layout.decidePanelHeight : layout.readPanelHeight}
      scrollToEnd={deciding}
      scrollKey={deciding ? 'decide' : 'read'}
      footer={
        <View>
          {deciding ? (
            options.map((o) => <GameButton key={o} label={scene?.options[o] ?? o} minHeight={layout.buttonHeight} onPress={() => onChoose(o)} />)
          ) : (
            <GameButton label={strings.decide} onPress={() => setDeciding(true)} />
          )}
        </View>
      }
    >
      {!deciding && <Text style={type.caption}>{scene?.caption}</Text>}
      <Text style={[type.body, !deciding && styles.gap]}>{scene?.narration}</Text>
    </SceneFrame>
  );
}

type Screen = ReturnType<typeof useBattleScreen>;

/** Orders, or the report of the phase just fought, over the map. */
function MapScreen({ entry, screen, report }: { entry: BattleEntry; screen: Screen; report: boolean }) {
  const { data, module } = entry.battle;
  const { text } = entry;
  const state = screen.state!;
  const run = state.session.run;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const type = useSkinTextStyles();
  const sectorMap = parseSectorMap(battleSectorFiles[entry.id]);
  const small = height < 700;
  const rowHeight = small ? 30 : 38;
  const contentHeight = rowHeight * 5;
  const [panelHeight, setPanelHeight] = useState(contentHeight + 170);

  const record = report ? run.phases[run.phases.length - 1] : null;
  const phase = record ? record.phase : run.phase;
  const shownState = record ? record.stateAfter : run.state;
  const markers = record ? reportMarkers(data, module, record) : orderMarkers(data, module, run.state, state.draft);
  const commander = record ? record.commander : state.draft.commander;
  const phaseText = text.phases[String(phase)];
  const lighting = data.phases[String(phase)]?.mapLighting ?? 'day';
  const resources = [
    { label: text.resources.grain, value: module.resource(shownState, 'grain') },
    { label: text.resources.morale, value: module.resource(shownState, 'morale') },
    { label: text.resources.allies, value: module.resource(shownState, 'allies') },
    { label: text.pools.cohorts, value: module.resource(shownState, 'cohorts') },
  ];

  return (
    <BattleMap
      battleId={entry.id}
      mapImage={data.images.maps[lighting] ?? data.images.maps.day}
      lighting={lighting}
      text={text}
      sectorMap={sectorMap}
      markers={markers}
      commander={commander}
      title={phaseText?.title ?? ''}
      subtitle={`${format(strings.battles.phaseOf, { phase, total: phaseCount(data) })} · ${phaseText?.caption ?? ''}`}
      resources={resources}
      panelHeight={panelHeight}
      onSectorPress={record ? undefined : (id) => screen.setDraft({ ...state.draft, commander: id })}
    >
      <View
        style={[styles.panelArea, { paddingBottom: insets.bottom + spacing.sm, paddingLeft: insets.left + spacing.sm, paddingRight: insets.right + spacing.sm }]}
        onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
      >
        {record ? (
          <SkinPanel>
            <ScrollView style={{ maxHeight: contentHeight + 40 }}>
              <Text style={type.caption}>{strings.battles.report}</Text>
              {Object.entries(record.results).map(([sector, result]) => (
                <Text key={sector} style={[type.body, styles.reportLine]}>
                  {format(text.results[result] ?? '{sector}', { sector: text.sectors[sector]?.name ?? sector })}
                </Text>
              ))}
              {record.orders.move === 'scout' && (
                <>
                  <Text style={[type.caption, styles.gap]}>{strings.battles.scoutClue}</Text>
                  <Text style={[type.body, styles.reportLine]}>{text.plans[run.plan]?.clue}</Text>
                </>
              )}
            </ScrollView>
            <GameButton label={strings.continue} onPress={screen.dismissReport} />
          </SkinPanel>
        ) : (
          <PhasePanel
            data={data}
            text={text}
            phase={phase}
            orders={state.draft}
            onChange={screen.setDraft}
            onCommit={screen.commit}
            cohortsSize={module.poolSize(run.state, 'cohorts')}
            cavalrySize={module.poolSize(run.state, 'cavalry')}
            rowHeight={rowHeight}
            contentHeight={contentHeight}
            buttonHeight={small ? 46 : undefined}
          />
        )}
      </View>
    </BattleMap>
  );
}

function ResultCard({
  entry,
  state,
  finished,
  onAgain,
}: {
  entry: BattleEntry;
  state: NonNullable<Screen['state']>;
  finished: FinishedBattle | null;
  onAgain: () => void;
}) {
  const type = useSkinTextStyles();
  const { height } = useWindowDimensions();
  const { data } = entry.battle;
  const { text } = entry;
  const run = state.session.run;
  const end = run.end!;
  const medal = medalOf(end.outcome);
  const ending = text.endings[end.outcome];
  const plan = text.plans[run.plan];
  const [rewardsShown, setRewardsShown] = useState(false);
  const [rewardsDone, setRewardsDone] = useState(false);
  const rewards = finished?.rewards.awarded ? finished.rewards : null;
  useEffect(() => {
    if (rewards === null) return;
    const timer = setTimeout(() => setRewardsShown(true), REWARDS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rewards]);
  const breakdown = finished?.rewards.breakdown;
  const currency = progression.currency.name;

  return (
    <View style={styles.root}>
      <SceneFrame
        rulerId={entry.id}
        image={data.images.endings[end.outcome]}
        panelHeight={Math.round(height * 0.62)}
        footer={
          <View style={styles.pair}>
            <View style={styles.half}>
              <GameButton label={strings.battles.again} onPress={onAgain} />
            </View>
            <View style={styles.half}>
              <GameButton label={strings.battles.toBattles} onPress={toBattles} />
            </View>
          </View>
        }
      >
        <View style={styles.medalRow}>
          <Image
            source={battleIcons[`medal_${medal ?? 'none'}`]}
            style={styles.medal}
            cachePolicy={bundledCachePolicy}
            accessibilityLabel={format(strings.battles.medal, { grade: text.grades[medal ?? 'none'] })}
          />
          <View style={styles.flex}>
            <Text style={type.caption}>{format(strings.battles.medal, { grade: text.grades[medal ?? 'none'] })}</Text>
            <Text style={type.heading}>{ending?.title}</Text>
          </View>
        </View>
        <Text style={[type.body, styles.gap]}>{ending?.text}</Text>

        {end.unlocks.length > 0 && <Text style={[type.caption, styles.section]}>{strings.battles.unlockables}</Text>}
        {end.unlocks.map((u) => (
          <View key={u} style={styles.unlock}>
            <RulerImage rulerId={entry.id} imageId={data.images.unlockables[u] ?? null} style={styles.unlockImage} contentFit="cover" />
            <View style={styles.flex}>
              <Text style={[type.body, styles.unlockTitle]}>{text.unlockables[u]?.title}</Text>
              <Text style={type.muted}>{text.unlockables[u]?.text}</Text>
            </View>
          </View>
        ))}

        <Text style={[type.caption, styles.section]}>{format(strings.battles.enemyPlan, { name: plan?.name ?? run.plan })}</Text>
        <Text style={type.body}>{plan?.reveal}</Text>
        <Text style={[type.muted, styles.gap]}>
          {format(strings.battles.realResult, { commander: text.battle.commander, result: text.battle.real_result })}
        </Text>
        {breakdown && (
          <Text style={[type.body, styles.section]}>
            {breakdown.gold > 0
              ? format(strings.battles.earned, { xp: formatNumber(breakdown.totalXp), gold: formatNumber(breakdown.gold), currency })
              : format(strings.battles.earnedNoGold, { xp: formatNumber(breakdown.totalXp) })}
          </Text>
        )}
      </SceneFrame>
      {rewards && rewardsShown && !rewardsDone && (
        <RewardsOverlay
          rewards={rewards}
          achievements={finished?.achievements.map((a) => a.title) ?? []}
          onDone={() => setRewardsDone(true)}
          wording={battleWording(data, entry, rewards.breakdown)}
        />
      )}
    </View>
  );
}

function battleWording(data: BattleData, entry: BattleEntry, b: FinishedBattle['rewards']['breakdown']) {
  const currency = progression.currency.name;
  return {
    decisions: format(strings.battles.rewardPhases, { count: b.decisions, per: b.perDecision, xp: formatNumber(b.decisionXp) }),
    tier: format(strings.battles.rewardTier, { tier: data.tier }),
    gold: b.goldItems.map((i) =>
      i.kind === 'ending'
        ? format(strings.battles.goldEnding, { gold: i.gold, currency })
        : i.kind === 'unlockable'
          ? format(strings.battles.goldUnlockable, { gold: i.gold, currency, title: entry.text.unlockables[i.id]?.title ?? i.id })
          : format(strings.battles.goldMedal, { gold: i.gold, currency, grade: (entry.text.grades[i.id] ?? i.id).toLowerCase() }),
    ),
    goldRule: format(strings.battles.goldRule, { currency }),
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  gap: { marginTop: spacing.xs },
  section: { marginTop: spacing.md },
  panelArea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  reportLine: { marginTop: 2, fontSize: 14, lineHeight: 19 },
  pair: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  medalRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  medal: { width: 39, height: 56 },
  unlock: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  unlockImage: { width: 54, height: 96, borderRadius: 3 },
  unlockTitle: { fontSize: 15 },
});
