import { router, useLocalSearchParams } from 'expo-router';
import { useReducer } from 'react';
import { getRuler } from '@/data/rulers';
import { sessionReducer, start } from '@/game/session';
import { SessionScreen } from '@/ui/SessionScreen';

export default function PlayScreen() {
  const { ruler: rulerId } = useLocalSearchParams<{ ruler?: string }>();
  const ruler = getRuler(rulerId);
  const [session, dispatch] = useReducer(sessionReducer, ruler.rules, start);

  return (
    <SessionScreen
      view={session.view}
      text={ruler.text}
      onChoose={(optionId) => dispatch({ type: 'choose', optionId })}
      onContinue={() => dispatch({ type: 'continue' })}
      onPlayAgain={() => dispatch({ type: 'start' })}
      onBackToTitle={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
