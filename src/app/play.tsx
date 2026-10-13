import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getRuler, type Ruler } from '@/data/rulers';
import { clearRun, loadRun } from '@/game/persistence';
import { type Session, sessionReducer, start } from '@/game/session';
import { appStorage } from '@/ui/appStorage';
import { MeterStrip } from '@/ui/meters/MeterStrip';
import { RewardsOverlay } from '@/ui/progression/RewardsOverlay';
import { RunChronicleScreen } from '@/ui/screens/RunChronicleScreen';
import { SessionScreen } from '@/ui/SessionScreen';
import { useSkin } from '@/ui/skin/SkinProvider';
import { RulerProvider } from '@/ui/RulerContext';
import { useRunPersistence } from '@/ui/useRunPersistence';

const backToTitle = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * `?mode=continue` resumes the saved run; anything else begins a new reign (deleting any save).
 */
export default function PlayScreen() {
  const { ruler: rulerId, mode } = useLocalSearchParams<{ ruler?: string; mode?: string }>();
  const ruler = getRuler(rulerId);
  const skin = useSkin();
  const [initial, setInitial] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    const begin = async (): Promise<Session> => {
      if (mode === 'continue') {
        const loaded = await loadRun(appStorage, ruler.rules, ruler.ui);
        if (loaded.status === 'resumed') return loaded.session;
      } else {
        await clearRun(appStorage, ruler.rules).catch(() => {});
      }
      return start(ruler.rules, ruler.ui);
    };
    begin()
      .catch(() => start(ruler.rules, ruler.ui))
      .then((s) => {
        if (!cancelled) setInitial(s);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, ruler]);

  if (initial === null) return <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]} />;
  return (
    <RulerProvider ruler={ruler}>
      <PlayRun ruler={ruler} initial={initial} />
    </RulerProvider>
  );
}

/** How long the ending shows on its own before the rewards appear. */
const REWARDS_DELAY_MS = 1000;

function PlayRun({ ruler, initial }: { ruler: Ruler; initial: Session }) {
  const [session, dispatch] = useReducer(sessionReducer, initial);
  const finished = useRunPersistence(appStorage, session);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const view = session.view;
  // The rewards appear a moment after the ending, once per run, until dismissed.
  const rewards = view.kind === 'ending' && finished?.rewards?.awarded ? finished.rewards : null;
  const [rewardsShown, setRewardsShown] = useState<string | null>(null);
  const [rewardsDone, setRewardsDone] = useState<string | null>(null);
  useEffect(() => {
    if (rewards === null) return;
    const timer = setTimeout(() => setRewardsShown(session.runId), REWARDS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rewards, session.runId]);
  const showRewards = rewards !== null && rewardsShown === session.runId && rewardsDone !== session.runId;

  if (chronicleOpen && view.kind === 'ending' && finished) {
    return (
      <RunChronicleScreen
        rules={ruler.rules}
        text={ruler.text}
        ending={view}
        newlyDiscovered={finished.newlyDiscovered}
        onNewReign={() => {
          setChronicleOpen(false);
          dispatch({ type: 'start' });
        }}
        onBackToTitle={backToTitle}
      />
    );
  }

  return (
    <View style={styles.root}>
      <SessionScreen
        rulerId={ruler.id}
        view={view}
        text={ruler.text}
        chronicleReady={finished !== null}
        onDecide={() => dispatch({ type: 'decide' })}
        onChoose={(optionId) => dispatch({ type: 'choose', optionId })}
        onContinue={() => dispatch({ type: 'continue' })}
        onPlayAgain={() => dispatch({ type: 'start' })}
        onChronicle={() => setChronicleOpen(true)}
        onBackToTitle={backToTitle}
      />
      {/*
        Outside the per-view tree, so it persists between views and animates the changes. Shown on
        scenes, consequences, beats and era cards; hidden on the prologue and the ending.
      */}
      {view.kind !== 'prologue' && view.kind !== 'ending' && <MeterStrip state={view.state} />}
      {showRewards && <RewardsOverlay rewards={rewards} onDone={() => setRewardsDone(session.runId)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
