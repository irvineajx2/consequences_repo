// Player-facing text for a ruler, keyed by the ids in its rules file.
import type { Rules } from '../core';

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
  readonly scenes: Readonly<Record<string, SceneText>>;
  readonly beats: Readonly<Record<string, BeatText>>;
  readonly endings: Readonly<Record<string, EndingText>>;
  /** What the ruler actually did in each scene and what followed; revealed only once discovered. */
  readonly chronicle: Readonly<Record<string, { readonly note: string }>>;
}

/**
 * A ruler's text file as written. Option labels, ending titles, a short name and meter objects may
 * be left out: `normaliseText` fills them from the rules.
 */
export interface RawRulerText {
  readonly ruler: { readonly name: string; readonly short_name?: string; readonly subtitle: string; readonly tagline: string };
  readonly prologue: RulerText['prologue'];
  readonly eras: RulerText['eras'];
  readonly meters: Readonly<Record<string, string | MeterText>>;
  readonly scenes: Readonly<
    Record<string, Omit<SceneText, 'options' | 'consequences'> & Partial<OptionTexts>>
  >;
  readonly beats: RulerText['beats'];
  readonly endings: Readonly<Record<string, { readonly title?: string; readonly text: string }>>;
  readonly chronicle: RulerText['chronicle'];
}

/** A stand-in title from an ending id ("pater_patriae" -> "Pater Patriae") until one is written. */
export function titleFromId(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Completes a ruler's text from its rules: an option without a text label shows its rules label
 * (per variant, where variants label an option differently); an ending without a title uses the
 * rules title, or one made from its id; meter names may be plain strings; the short name defaults
 * to the name.
 */
export function normaliseText(raw: RawRulerText, rules: Rules): RulerText {
  const scenes: Record<string, SceneText> = {};
  for (const scene of rules.scenes) {
    const written = raw.scenes[scene.id];
    if (!written) continue;
    const variants = scene.variants ?? [{ options: scene.options }];
    const base: Record<string, string> = {};
    const overrides: Record<string, Partial<OptionTexts>> = {};
    variants.forEach((variant, index) => {
      for (const option of variant.options ?? []) {
        if (base[option.id] === undefined) base[option.id] = option.label;
        else if (base[option.id] !== option.label) {
          const v = { ...overrides[index], options: { ...overrides[index]?.options, [option.id]: option.label } };
          overrides[index] = v;
        }
      }
    });
    // Written text wins over rules labels, for the base and for each variant.
    for (const [index, v] of Object.entries(written.variants ?? {})) {
      overrides[index] = {
        options: { ...overrides[index]?.options, ...v.options },
        consequences: { ...overrides[index]?.consequences, ...v.consequences },
      };
    }
    scenes[scene.id] = {
      ...written,
      options: { ...base, ...written.options },
      consequences: written.consequences ?? {},
      ...(Object.keys(overrides).length > 0 ? { variants: overrides } : {}),
    };
  }
  const endings: Record<string, EndingText> = {};
  for (const [id, e] of Object.entries(raw.endings)) {
    endings[id] = { title: e.title ?? rules.endings[id]?.title ?? titleFromId(id), text: e.text };
  }
  const meters: Record<string, MeterText> = {};
  for (const [id, m] of Object.entries(raw.meters)) meters[id] = typeof m === 'string' ? { name: m } : m;
  return {
    ...raw,
    ruler: { ...raw.ruler, short_name: raw.ruler.short_name ?? raw.ruler.name },
    meters,
    scenes,
    endings,
  };
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
