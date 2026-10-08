// Saving and resuming a run in progress. The engine is deterministic, so a run is saved as the
// option ids chosen so far and rebuilt by replaying them. Pure TypeScript.
import type { Rules } from '../core';
import * as session from './session';
import type { Session } from './session';

export interface RunSave {
  readonly rulesVersion: number;
  /** One option id per shown scene so far, auto scenes included. */
  readonly choices: readonly string[];
}

export type ResumeResult =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly reason: 'version' | 'invalid' };

/** The save for a session's run so far. */
export function saveOf(s: Pick<Session, 'rules' | 'run'>): RunSave {
  return {
    rulesVersion: s.rules.version,
    choices: s.run.history.decisions.map((d) => d.option),
  };
}

/** Reads a stored save; anything malformed is null. */
export function parseRunSave(json: string | null): RunSave | null {
  if (json === null) return null;
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== 'object' || value === null) return null;
    const { rulesVersion, choices } = value as Record<string, unknown>;
    if (typeof rulesVersion !== 'number' || !Array.isArray(choices)) return null;
    if (!choices.every((c) => typeof c === 'string')) return null;
    return { rulesVersion, choices };
  } catch {
    return null;
  }
}

/**
 * Rebuilds a session from a save by replaying its choices, opening at the next unanswered scene
 * (never mid-consequence or mid-beat). Fails, without throwing, when the rules version differs,
 * an option no longer exists, or the choices do not leave a run in progress.
 */
export function resume(rules: Rules, save: RunSave): ResumeResult {
  if (save.rulesVersion !== rules.version) return { ok: false, reason: 'version' };
  try {
    let s = session.start(rules);
    for (const choice of save.choices) {
      if (s.view.kind !== 'scene') return { ok: false, reason: 'invalid' };
      if (s.view.mode === 'choice') s = session.decide(s);
      s = session.choose(s, choice);
      while (s.view.kind === 'consequence' || s.view.kind === 'beat') s = session.continue(s);
    }
    if (s.view.kind !== 'scene' || s.run.outcome !== null) return { ok: false, reason: 'invalid' };
    return { ok: true, session: s };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
