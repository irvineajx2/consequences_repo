// Player-facing text for a ruler, keyed by the ids in its rules file.
import type { BalanceState, FillState } from './meters';

export interface OptionTexts {
  readonly options: Readonly<Record<string, string>>;
  readonly consequences: Readonly<Record<string, string>>;
}

export interface SceneText extends OptionTexts {
  readonly caption: string;
  readonly narration: string;
  /** Shown instead of `narration` when the scene plays in auto mode (no player choice). */
  readonly auto_narration?: string;
  /** Overrides for options whose text differs in a particular variant, keyed by variant index. */
  readonly variants?: Readonly<Record<string, Partial<OptionTexts>>>;
}

export interface BeatText {
  readonly caption: string;
  readonly text: string;
}

export interface EndingText {
  readonly title: string;
  readonly text: string;
}

export interface MeterText {
  readonly name: string;
  /** For balance meters: what the low and high ends stand for. */
  readonly left?: string;
  readonly right?: string;
}

export interface EraText {
  readonly title: string;
  readonly years: string;
  readonly text: string;
}

export interface RulerText {
  readonly ruler: {
    readonly name: string;
    readonly short_name: string;
    /** Shown on the ruler-select card. */
    readonly subtitle: string;
    readonly tagline: string;
  };
  /** The slide before the first era card of a new run. */
  readonly prologue: { readonly caption: string; readonly text: string };
  /** Era cards, keyed by the era ids in ui.json. */
  readonly eras: Readonly<Record<string, EraText>>;
  /** Names of the meters that are shown. Hidden meters have none. */
  readonly meters: Readonly<Record<string, MeterText>>;
  /** State words for meter tooltips and accessibility labels, by state. */
  readonly meterStates: {
    readonly fill: Readonly<Record<FillState, string>>;
    readonly balance: Readonly<Record<BalanceState, string>>;
  };
  readonly scenes: Readonly<Record<string, SceneText>>;
  readonly beats: Readonly<Record<string, BeatText>>;
  readonly endings: Readonly<Record<string, EndingText>>;
  /** What the ruler actually did in each scene and what followed; revealed only once discovered. */
  readonly chronicle: Readonly<Record<string, { readonly note: string }>>;
}

function lookup(
  text: RulerText,
  sceneId: string,
  variant: number,
  kind: keyof OptionTexts,
  optionId: string,
): string | undefined {
  const scene = text.scenes[sceneId];
  return scene?.variants?.[String(variant)]?.[kind]?.[optionId] ?? scene?.[kind][optionId];
}

const missing = (what: string): string => `[Missing text: ${what}]`;

export function sceneText(text: RulerText, sceneId: string): Pick<SceneText, 'caption' | 'narration'> {
  const scene = text.scenes[sceneId];
  return scene ?? { caption: missing(sceneId), narration: '' };
}

/** Text for a scene playing in auto mode: its auto narration, or the auto option's own text. */
export function autoNarration(text: RulerText, sceneId: string, variant: number, optionId: string): string {
  return text.scenes[sceneId]?.auto_narration ?? optionText(text, sceneId, variant, optionId);
}

export function optionText(text: RulerText, sceneId: string, variant: number, optionId: string): string {
  return lookup(text, sceneId, variant, 'options', optionId) ?? missing(`${sceneId}/${optionId}`);
}

export function consequenceText(
  text: RulerText,
  sceneId: string,
  variant: number,
  optionId: string,
): string | undefined {
  return lookup(text, sceneId, variant, 'consequences', optionId);
}

export function eraText(text: RulerText, eraId: string): EraText {
  return text.eras[eraId] ?? { title: missing(eraId), years: '', text: '' };
}

export function beatText(text: RulerText, beatId: string): BeatText {
  return text.beats[beatId] ?? { caption: missing(beatId), text: '' };
}

export function chronicleNote(text: RulerText, sceneId: string): string {
  return text.chronicle[sceneId]?.note ?? missing(`chronicle ${sceneId}`);
}

export function endingText(text: RulerText, endingId: string): EndingText {
  return text.endings[endingId] ?? { title: missing(endingId), text: '' };
}
