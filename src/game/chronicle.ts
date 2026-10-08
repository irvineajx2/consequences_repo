// View models for the end-of-run chronicle, the Chronicle book and the endings gallery. Pure.
//
// Discovery rule: the ruler's choice for a scene is never revealed until the player has made that
// same choice in some run. Unmatched decisions carry only the player's own option.
import { type Decision, getScene, type Rules, startRun, step } from '../core';
import type { RulerProfile } from './profile';

/** One decision of a finished run. */
export interface RunChronicleRow {
  readonly sceneId: string;
  /** The player's choice (the only option a row ever names). */
  readonly optionId: string;
  /** Variant the scene was played in, for variant-specific option text. */
  readonly variant: number;
  readonly auto: boolean;
  /** The player chose as the ruler did (never for auto decisions). */
  readonly matched: boolean;
  /** Matched, and discovered for the first time by this run. */
  readonly newlyDiscovered: boolean;
}

export interface RunChronicle {
  readonly rows: readonly RunChronicleRow[];
  readonly matched: number;
  /** Player decisions, auto scenes excluded. */
  readonly total: number;
}

/** The end-of-run chronicle for a run's decisions. */
export function runChronicle(
  rules: Rules,
  decisions: readonly Decision[],
  newlyDiscovered: readonly string[],
): RunChronicle {
  // Replay to learn which variant each decision was made in.
  let run = startRun(rules);
  const rows: RunChronicleRow[] = [];
  for (const d of decisions) {
    const variant = getScene(rules, run.sceneIndex, run.state).variant;
    const matched = d.historical && !d.auto;
    rows.push({
      sceneId: d.scene,
      optionId: d.option,
      variant,
      auto: d.auto,
      matched,
      newlyDiscovered: matched && newlyDiscovered.includes(d.scene),
    });
    if (run.outcome === null) run = step(rules, run, d.option).run;
  }
  return {
    rows,
    matched: rows.filter((r) => r.matched).length,
    total: rows.filter((r) => !r.auto).length,
  };
}

/**
 * The ruler's own choice in a scene: the historical option of the first variant the player chooses
 * in (auto and skipped variants never count). Null if the scene has none.
 */
export function historicalChoice(rules: Rules, sceneId: string): { optionId: string; variant: number } | null {
  const scene = rules.scenes.find((s) => s.id === sceneId);
  if (!scene) return null;
  const variants = scene.variants ?? [{ options: scene.options }];
  for (const [variant, v] of variants.entries()) {
    if (v.skip || v.auto) continue;
    const option = (v.options ?? []).find((o) => o.historical);
    if (option) return { optionId: option.id, variant };
  }
  return null;
}

export interface ChronicleEntry {
  readonly sceneId: string;
  /** Present only once discovered. */
  readonly choice: { readonly optionId: string; readonly variant: number } | null;
}

export interface ChronicleBook {
  /** Every scene with a historical choice, in order. */
  readonly entries: readonly ChronicleEntry[];
  readonly discovered: number;
  readonly total: number;
}

/** The permanent Chronicle: each decision scene, revealing the ruler's choice once discovered. */
export function chronicleBook(rules: Rules, profile: RulerProfile): ChronicleBook {
  const discovered = new Set(profile.discovered);
  const entries: ChronicleEntry[] = [];
  for (const scene of rules.scenes) {
    const choice = historicalChoice(rules, scene.id);
    if (!choice) continue;
    entries.push({ sceneId: scene.id, choice: discovered.has(scene.id) ? choice : null });
  }
  return {
    entries,
    discovered: entries.filter((e) => e.choice !== null).length,
    total: entries.length,
  };
}

export const ENDING_CATEGORY_ORDER = ['historical', 'outperformed', 'fallen_short', 'fallen', 'alternate'] as const;

export interface GalleryEnding {
  readonly id: string;
  readonly category: string;
  readonly image: string;
  /** Null while locked. */
  readonly record: { readonly timesReached: number; readonly bestScore?: number } | null;
}

export interface GalleryGroup {
  readonly category: string;
  readonly endings: readonly GalleryEnding[];
}

/** Every ending, grouped by category in a fixed order; unreached endings are locked. */
export function endingsGallery(rules: Rules, profile: RulerProfile): readonly GalleryGroup[] {
  const all = Object.entries(rules.endings).map(([id, e]): GalleryEnding => {
    const r = profile.endings[id];
    return {
      id,
      category: e.category,
      image: e.image,
      record: r ? { timesReached: r.timesReached, ...(r.bestScore !== undefined ? { bestScore: r.bestScore } : {}) } : null,
    };
  });
  const order: readonly string[] = ENDING_CATEGORY_ORDER;
  const categories = [...new Set(all.map((e) => e.category))].sort((a, b) => {
    const rank = (c: string) => (order.includes(c) ? order.indexOf(c) : order.length);
    return rank(a) - rank(b);
  });
  return categories.map((category) => ({ category, endings: all.filter((e) => e.category === category) }));
}
