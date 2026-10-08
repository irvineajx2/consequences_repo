import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type {
  BeatViewModel,
  ConsequenceViewModel,
  EndingViewModel,
  SceneViewModel,
  SessionView,
} from '../game/session';
import {
  autoNarration,
  beatText,
  consequenceText,
  endingText,
  optionText,
  type RulerText,
  sceneText,
} from '../game/text';
import { GameButton } from './GameButton';
import { SceneFrame } from './SceneFrame';
import { useSkinTextStyles } from './skin/textStyles';
import { format, strings } from './strings';
import { spacing } from './theme';
import { useDecidePanelLayout } from './useDecidePanelLayout';

export interface SessionHandlers {
  readonly onDecide: () => void;
  readonly onChoose: (optionId: string) => void;
  readonly onContinue: () => void;
  readonly onPlayAgain: () => void;
  readonly onChronicle: () => void;
  readonly onBackToTitle: () => void;
}

interface Props extends SessionHandlers {
  readonly view: SessionView;
  readonly text: RulerText;
  /** The finished run has been recorded, so its chronicle can be shown. */
  readonly chronicleReady?: boolean;
}

/** Renders whichever view the session is on. */
export function SessionScreen({ view, text, chronicleReady = false, ...handlers }: Props) {
  switch (view.kind) {
    case 'scene':
      return view.mode === 'choice' ? (
        <ChoiceSceneView view={view} text={text} {...handlers} />
      ) : (
        <AutoSceneView view={view} text={text} {...handlers} />
      );
    case 'consequence':
      return <ConsequenceView view={view} text={text} {...handlers} />;
    case 'beat':
      return <BeatView view={view} text={text} {...handlers} />;
    case 'ending':
      return <EndingView view={view} text={text} chronicleReady={chronicleReady} {...handlers} />;
  }
}

function Footer({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

/**
 * Read phase: caption, narration and Decide. Decide phase: the narration alone, opened scrolled to
 * its end, above option buttons that never scroll. The panel keeps its height between phases
 * unless a small screen needs the decide phase to grow.
 */
function ChoiceSceneView({
  view,
  text,
  onDecide,
  onChoose,
}: { view: SceneViewModel; text: RulerText } & SessionHandlers) {
  const type = useSkinTextStyles();
  const layout = useDecidePanelLayout(view.options.length);
  const { caption, narration } = sceneText(text, view.sceneId);
  const deciding = view.phase === 'decide';
  return (
    <SceneFrame
      image={view.image}
      panelHeight={deciding ? layout.decidePanelHeight : layout.readPanelHeight}
      scrollToEnd={deciding}
      scrollKey={view.phase}
      footer={
        <Footer>
          {deciding ? (
            view.options.map((id) => (
              <GameButton
                key={id}
                label={optionText(text, view.sceneId, view.variant, id)}
                minHeight={layout.buttonHeight}
                onPress={() => onChoose(id)}
              />
            ))
          ) : (
            <GameButton label={strings.decide} onPress={onDecide} />
          )}
        </Footer>
      }
    >
      {!deciding && <Text style={type.caption}>{caption}</Text>}
      <Text style={[type.body, !deciding && styles.narration]}>{narration}</Text>
    </SceneFrame>
  );
}

function AutoSceneView({ view, text, onChoose }: { view: SceneViewModel; text: RulerText } & SessionHandlers) {
  const type = useSkinTextStyles();
  const { caption } = sceneText(text, view.sceneId);
  const option = view.options[0];
  return (
    <SceneFrame
      image={view.image}
      footer={
        <Footer>
          <GameButton label={strings.continue} onPress={() => onChoose(option)} />
        </Footer>
      }
    >
      <Text style={type.caption}>{caption}</Text>
      <Text style={[type.body, styles.narration]}>
        {autoNarration(text, view.sceneId, view.variant, option)}
      </Text>
    </SceneFrame>
  );
}

function ConsequenceView({
  view,
  text,
  onContinue,
}: { view: ConsequenceViewModel; text: RulerText } & SessionHandlers) {
  const type = useSkinTextStyles();
  const { caption } = sceneText(text, view.sceneId);
  const consequence = consequenceText(text, view.sceneId, view.variant, view.optionId);
  return (
    <SceneFrame
      image={view.image}
      footer={
        <Footer>
          <GameButton label={strings.continue} onPress={onContinue} />
        </Footer>
      }
    >
      <Text style={type.caption}>{caption}</Text>
      <Text style={[type.body, styles.narration]}>{consequence}</Text>
    </SceneFrame>
  );
}

function BeatView({ view, text, onContinue }: { view: BeatViewModel; text: RulerText } & SessionHandlers) {
  const type = useSkinTextStyles();
  const beat = beatText(text, view.beatId);
  return (
    <SceneFrame
      image={view.image}
      footer={
        <Footer>
          <GameButton label={strings.continue} onPress={onContinue} />
        </Footer>
      }
    >
      <Text style={type.caption}>{beat.caption}</Text>
      <Text style={[type.body, styles.narration]}>{beat.text}</Text>
    </SceneFrame>
  );
}

function EndingView({
  view,
  text,
  chronicleReady,
  onPlayAgain,
  onChronicle,
  onBackToTitle,
}: { view: EndingViewModel; text: RulerText; chronicleReady: boolean } & SessionHandlers) {
  const type = useSkinTextStyles();
  const ending = endingText(text, view.ending);
  return (
    <SceneFrame
      image={view.image}
      footer={
        <Footer>
          <View style={styles.pair}>
            <View style={styles.half}>
              <GameButton label={strings.playAgain} onPress={onPlayAgain} />
            </View>
            <View style={styles.half}>
              <GameButton label={strings.chronicle} onPress={onChronicle} disabled={!chronicleReady} />
            </View>
          </View>
          <GameButton label={strings.backToTitle} onPress={onBackToTitle} />
        </Footer>
      }
    >
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
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  narration: { marginTop: spacing.xs },
  line: { marginTop: spacing.xs },
  footer: { flexShrink: 0 },
  pair: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
});
