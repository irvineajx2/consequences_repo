// The permanent record of a player's reigns: what they have discovered and which endings they have
// reached. Pure TypeScript.
import type { Decision } from '../core';

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
}

/** The stored profile: one record per ruler, keyed by the rules file's `ruler` id. */
export interface Profile {
  readonly version: 1;
  readonly rulers: Readonly<Record<string, RulerProfile>>;
}

export const emptyRulerProfile: RulerProfile = { discovered: [], endings: {}, runsCompleted: 0 };
export const emptyProfile: Profile = { version: 1, rulers: {} };

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
): { profile: RulerProfile; newlyDiscovered: string[] } {
  const known = new Set(profile.discovered);
  const newlyDiscovered = [...new Set(matchedScenes(result.decisions))].filter((s) => !known.has(s));

  const previous = profile.endings[result.ending];
  const scores = [previous?.bestScore, result.score ?? undefined].filter((s): s is number => s !== undefined);
  const record: EndingRecord = {
    firstReached: previous?.firstReached ?? result.finishedAt,
    timesReached: (previous?.timesReached ?? 0) + 1,
    ...(scores.length > 0 ? { bestScore: Math.max(...scores) } : {}),
  };

  return {
    newlyDiscovered,
    profile: {
      discovered: [...profile.discovered, ...newlyDiscovered],
      endings: { ...profile.endings, [result.ending]: record },
      runsCompleted: profile.runsCompleted + 1,
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
  return { discovered, endings: parsed, runsCompleted };
}

/** Reads a stored profile. Anything unreadable becomes an empty profile rather than an error. */
export function parseProfile(json: string | null): Profile {
  if (json === null) return emptyProfile;
  try {
    const value: unknown = JSON.parse(json);
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.rulers)) return emptyProfile;
    const rulers: Record<string, RulerProfile> = {};
    for (const [id, r] of Object.entries(value.rulers)) {
      const parsed = parseRuler(r);
      if (parsed) rulers[id] = parsed;
    }
    return { version: 1, rulers };
  } catch {
    return emptyProfile;
  }
}
