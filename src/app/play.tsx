import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { getRuler, type Ruler } from '@/data/rulers';
import { clearRun, loadRun } from '@/game/persistence';
import { type Session, sessionReducer, start } from '@/game/session';
import { appStorage } from '@/ui/appStorage';
import { MeterStrip } from '@/ui/meters/MeterStrip';
import { RunChronicleScreen } from '@/ui/screens/RunChronicleScreen';
import { SessionScreen } from '@/ui/SessionScreen';
import { useSkin } from '@/ui/skin/SkinProvider';
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
        const loaded = await loadRun(appStorage, ruler.rules);
        if (loaded.status === 'resumed') return loaded.session;
      } else {
        await clearRun(appStorage, ruler.rules).catch(() => {});
      }
      return start(ruler.rules);
    };
    begin()
      .catch(() => start(ruler.rules))
      .then((s) => {
        if (!cancelled) setInitial(s);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, ruler]);

  if (initial === null) return <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]} />;
  return <PlayRun ruler={ruler} initial={initial} />;
}

function PlayRun({ ruler, initial }: { ruler: Ruler; initial: Session }) {
  const [session, dispatch] = useReducer(sessionReducer, initial);
  const finished = useRunPersistence(appStorage, session);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  const view = session.view;

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
      {/* Outside the per-view tree, so it persists between views and animates the changes. */}
      <MeterStrip state={view.state} ui={ruler.ui} text={ruler.text} range={ruler.rules.meter_range} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
