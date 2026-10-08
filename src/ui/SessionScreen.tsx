import { StyleSheet, Text } from 'react-native';
import { consequenceText, endingText, optionText, type RulerText, sceneText } from '../game/text';
import type {
  ConsequenceViewModel,
  EndingViewModel,
  SceneViewModel,
  SessionView,
} from '../game/session';
import { GameButton } from './GameButton';
import { SceneFrame } from './SceneFrame';
import { format, strings } from './strings';
import { spacing, type } from './theme';

export interface SessionHandlers {
  readonly onChoose: (optionId: string) => void;
  readonly onContinue: () => void;
  readonly onPlayAgain: () => void;
  readonly onBackToTitle: () => void;
}

interface Props extends SessionHandlers {
  readonly view: SessionView;
  readonly text: RulerText;
}

/** Renders whichever view the session is on. */
export function SessionScreen({ view, text, ...handlers }: Props) {
  switch (view.kind) {
    case 'scene':
      return <SceneView view={view} text={text} {...handlers} />;
    case 'consequence':
      return <ConsequenceView view={view} text={text} {...handlers} />;
    case 'ending':
      return <EndingView view={view} text={text} {...handlers} />;
  }
}

function SceneView({ view, text, onChoose }: { view: SceneViewModel; text: RulerText } & SessionHandlers) {
  const { caption, narration } = sceneText(text, view.sceneId);
  const label = (id: string) => optionText(text, view.sceneId, view.variant, id);
  return (
    <SceneFrame image={view.image}>
      <Text style={type.caption}>{caption}</Text>
      {view.mode === 'auto' ? (
        <>
          <Text style={[type.body, styles.narration]}>{label(view.options[0])}</Text>
          <GameButton label={strings.continue} onPress={() => onChoose(view.options[0])} />
        </>
      ) : (
        <>
          <Text style={[type.body, styles.narration]}>{narration}</Text>
          {view.options.map((id) => (
            <GameButton key={id} label={label(id)} onPress={() => onChoose(id)} />
          ))}
        </>
      )}
    </SceneFrame>
  );
}

function ConsequenceView({
  view,
  text,
  onContinue,
}: { view: ConsequenceViewModel; text: RulerText } & SessionHandlers) {
  const { caption } = sceneText(text, view.sceneId);
  const consequence = consequenceText(text, view.sceneId, view.variant, view.optionId);
  return (
    <SceneFrame image={view.image}>
      <Text style={type.caption}>{caption}</Text>
      <Text style={[type.body, styles.narration]}>{consequence}</Text>
      <GameButton label={strings.continue} onPress={onContinue} />
    </SceneFrame>
  );
}

function EndingView({
  view,
  text,
  onPlayAgain,
  onBackToTitle,
}: { view: EndingViewModel; text: RulerText } & SessionHandlers) {
  const ending = endingText(text, view.ending);
  return (
    <SceneFrame image={view.image}>
      <Text style={type.heading}>{ending.title}</Text>
      <Text style={[type.body, styles.narration]}>{ending.text}</Text>
      {view.early && <Text style={[type.muted, styles.line]}>{strings.earlyFinale}</Text>}
      {view.score !== null && (
        <Text style={[type.muted, styles.line]}>
          {format(strings.finaleScore, { score: Math.round(view.score * 10) / 10 })}
        </Text>
      )}
      <Text style={[type.muted, styles.line]}>
        {format(strings.historicalMatches, {
          ruler: text.ruler.short_name,
          matched: view.historicalMatches,
          total: view.playerDecisions,
        })}
      </Text>
      <GameButton label={strings.playAgain} onPress={onPlayAgain} />
      <GameButton label={strings.backToTitle} onPress={onBackToTitle} />
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  narration: { marginTop: spacing.sm, marginBottom: spacing.md },
  line: { marginBottom: spacing.sm },
});
