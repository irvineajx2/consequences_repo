import { router, useLocalSearchParams } from 'expo-router';
import { useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { getRuler } from '@/data/rulers';
import { sessionReducer, start } from '@/game/session';
import { MeterStrip } from '@/ui/meters/MeterStrip';
import { SessionScreen } from '@/ui/SessionScreen';

export default function PlayScreen() {
  const { ruler: rulerId } = useLocalSearchParams<{ ruler?: string }>();
  const ruler = getRuler(rulerId);
  const [session, dispatch] = useReducer(sessionReducer, ruler.rules, start);

  return (
    <View style={styles.root}>
      <SessionScreen
        view={session.view}
        text={ruler.text}
        onDecide={() => dispatch({ type: 'decide' })}
        onChoose={(optionId) => dispatch({ type: 'choose', optionId })}
        onContinue={() => dispatch({ type: 'continue' })}
        onPlayAgain={() => dispatch({ type: 'start' })}
        onBackToTitle={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      />
      {/* Outside the per-view tree, so it persists between views and animates the changes. */}
      <MeterStrip
        state={session.view.state}
        ui={ruler.ui}
        text={ruler.text}
        range={ruler.rules.meter_range}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
