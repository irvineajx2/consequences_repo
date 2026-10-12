// The permanent record of a player's reigns: what they have discovered and which endings they have
// reached. Pure TypeScript.
import type { Decision } from '../core';
import { emptyProgression, migrateProgression, type Progression } from './progression';

export interface EndingRecord {
  /** When the ending was first reached (ISO timestamp from the run that reached it). */
  readonly firstReached: string;
  readonly timesReached: number;
  /** Best finale score, for endings reached through the finale. */
  readonly bestScore?: number;
}

/** Everything recorded for one ruler. */
export interface RulerProfile {
  /** Scenes where the player has made the ruler's choice in some run, in discovery order. */
  readonly discovered: readonly string[];
  readonly endings: Readonly<Record<string, EndingRecord>>;
  readonly runsCompleted: number;
  /** Branch scenes visited in any run (uncharted paths), in the order first found. */
  readonly uncharted: readonly string[];
}

/**
 * The stored profile: one record per ruler, keyed by the rules file's `ruler` id, plus the
 * account-wide progression (XP and gold, shared across rulers). Version 2 added uncharted paths and
 * version 3 progression; older profiles are migrated on reading, keeping everything they recorded.
 */
export interface Profile {
  readonly version: 3;
  readonly rulers: Readonly<Record<string, RulerProfile>>;
  readonly progression: Progression;
}

export const emptyRulerProfile: RulerProfile = { discovered: [], endings: {}, runsCompleted: 0, uncharted: [] };
export const emptyProfile: Profile = { version: 3, rulers: {}, progression: emptyProgression };

/**
 * A profile key (the rules file's `ruler` id, e.g. "elizabeth_i") as a ruler id (its folder name,
 * e.g. "elizabeth-i"). Registered rulers keep to this convention; a test checks it.
 */
export function rulerIdForProfileKey(key: string): string {
  return key.replace(/_/g, '-');
}

/** What a finished run contributes to the profile. */
export interface RunResult {
  readonly ending: string;
  readonly score: number | null;
  readonly decisions: readonly Decision[];
  /** ISO timestamp of when the run ended. */
  readonly finishedAt: string;
}

/** Scenes this run matched the ruler on. Auto decisions never count. */
export function matchedScenes(decisions: readonly Decision[]): string[] {
  return decisions.filter((d) => d.historical && !d.auto).map((d) => d.scene);
}

/**
 * Records a finished run. Returns the new profile and the scenes this run discovered for the first
 * time, in run order. Applying the same run again only adds to `timesReached` and `runsCompleted`.
 */
export function applyRunResult(
  profile: RulerProfile,
  result: RunResult,
): { profile: RulerProfile; newlyDiscovered: string[]; newlyUncharted: string[] } {
  const known = new Set(profile.discovered);
  const newlyDiscovered = [...new Set(matchedScenes(result.decisions))].filter((s) => !known.has(s));
  const found = new Set(profile.uncharted);
  const newlyUncharted = [...new Set(result.decisions.filter((d) => d.branch).map((d) => d.scene))].filter(
    (s) => !found.has(s),
  );

  const previous = profile.endings[result.ending];
  const scores = [previous?.bestScore, result.score ?? undefined].filter((s): s is number => s !== undefined);
  const record: EndingRecord = {
    firstReached: previous?.firstReached ?? result.finishedAt,
    timesReached: (previous?.timesReached ?? 0) + 1,
    ...(scores.length > 0 ? { bestScore: Math.max(...scores) } : {}),
  };

  return {
    newlyDiscovered,
    newlyUncharted,
    profile: {
      discovered: [...profile.discovered, ...newlyDiscovered],
      endings: { ...profile.endings, [result.ending]: record },
      runsCompleted: profile.runsCompleted + 1,
      uncharted: [...profile.uncharted, ...newlyUncharted],
    },
  };
}

export function rulerProfile(profile: Profile, rulerId: string): RulerProfile {
  return profile.rulers[rulerId] ?? emptyRulerProfile;
}

export function withRulerProfile(profile: Profile, rulerId: string, ruler: RulerProfile): Profile {
  return { ...profile, rulers: { ...profile.rulers, [rulerId]: ruler } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRuler(value: unknown): RulerProfile | null {
  if (!isRecord(value)) return null;
  const { discovered, endings, runsCompleted } = value;
  if (!Array.isArray(discovered) || !discovered.every((s) => typeof s === 'string')) return null;
  if (!isRecord(endings) || typeof runsCompleted !== 'number') return null;
  const parsed: Record<string, EndingRecord> = {};
  for (const [id, e] of Object.entries(endings)) {
    if (!isRecord(e) || typeof e.firstReached !== 'string' || typeof e.timesReached !== 'number') return null;
    parsed[id] = {
      firstReached: e.firstReached,
      timesReached: e.timesReached,
      ...(typeof e.bestScore === 'number' ? { bestScore: e.bestScore } : {}),
    };
  }
  // Version 1 records have no uncharted paths.
  const { uncharted } = value;
  const paths = Array.isArray(uncharted) && uncharted.every((s) => typeof s === 'string') ? uncharted : [];
  return { discovered, endings: parsed, runsCompleted, uncharted: paths };
}

function parseProgression(value: unknown): Progression | null {
  if (!isRecord(value)) return null;
  const { totalXp, gold, awardedRunIds } = value;
  if (typeof totalXp !== 'number' || typeof gold !== 'number' || !Array.isArray(awardedRunIds)) return null;
  if (!awardedRunIds.every((id) => typeof id === 'string')) return null;
  return { totalXp, gold, awardedRunIds };
}

/**
 * Reads a stored profile, version 1, 2 or 3, as version 3. A profile from before progression is
 * credited for what it already records (see `migrateProgression`). Anything unreadable becomes an
 * empty profile rather than an error.
 */
export function parseProfile(json: string | null): Profile {
  if (json === null) return emptyProfile;
  try {
    const value: unknown = JSON.parse(json);
    const version = isRecord(value) ? value.version : undefined;
    if (!isRecord(value) || (version !== 1 && version !== 2 && version !== 3) || !isRecord(value.rulers)) {
      return emptyProfile;
    }
    const rulers: Record<string, RulerProfile> = {};
    for (const [id, r] of Object.entries(value.rulers)) {
      const parsed = parseRuler(r);
      if (parsed) rulers[id] = parsed;
    }
    const stored = version === 3 ? parseProgression(value.progression) : null;
    const progression =
      stored ??
      migrateProgression(
        Object.fromEntries(Object.entries(rulers).map(([key, r]) => [rulerIdForProfileKey(key), r])),
      );
    return { version: 3, rulers, progression };
  } catch {
    return emptyProfile;
  }
}
