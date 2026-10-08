import { replay, startRun, step } from '../../src/core';
import { clearRun, finishRun, loadProfile, loadRun, saveProfile, saveRun } from '../../src/game/persistence';
import { applyRunResult, emptyRulerProfile, rulerProfile, withRulerProfile, emptyProfile } from '../../src/game/profile';
import { parseRunSave, resume, saveOf } from '../../src/game/save';
import * as session from '../../src/game/session';
import { memoryStorage, storageKeys } from '../../src/game/storage';
import { goldenCases, rules } from '../core/helpers';

/** The run state after replaying a prefix of choices directly with the core engine. */
function directState(choices: readonly string[]) {
  let run = startRun(rules);
  for (const c of choices) run = step(rules, run, c).run;
  return run;
}

const CASES = ['historical_path', ...goldenCases.filter((c) => c.name.startsWith('random_')).slice(0, 6).map((c) => c.name)];
const byName = (name: string) => goldenCases.find((c) => c.name === name)!;

describe('save and resume', () => {
  test.each(CASES)('resumes %s after every prefix at the same state as a direct replay', (name) => {
    const { choices } = byName(name);
    // Every prefix that leaves the run in progress (the last choice ends the run).
    for (let n = 0; n < choices.length; n++) {
      const prefix = choices.slice(0, n);
      const resumed = resume(rules, { rulesVersion: rules.version, choices: prefix });
      if (!resumed.ok) throw new Error(`${name}: prefix ${n} did not resume`);
      const expected = directState(prefix);
      expect(resumed.session.run.state).toEqual(expected.state);
      expect(resumed.session.run.history).toEqual(expected.history);
      // Opens at the next unanswered scene, in its read phase, never mid-consequence or mid-beat.
      expect(resumed.session.view).toMatchObject({
        kind: 'scene',
        sceneId: rules.scenes[expected.sceneIndex].id,
        phase: 'read',
      });
      expect(resumed.session.view.state).toEqual(expected.state);
    }
  });

  it('saves exactly the choices made so far, and resumes onto an auto scene', () => {
    // In every golden case the auto scene (Babington, undetected) ends the run, so resume just before it.
    const c = goldenCases.find((g) => g.expected.decisions.some((d) => d.auto))!;
    const autoAt = c.expected.decisions.findIndex((d) => d.auto);
    const prefix = c.choices.slice(0, autoAt);
    const resumed = resume(rules, { rulesVersion: rules.version, choices: prefix });
    if (!resumed.ok) throw new Error('did not resume');
    expect(saveOf(resumed.session)).toEqual({ rulesVersion: rules.version, choices: prefix });
    expect(resumed.session.view).toMatchObject({ kind: 'scene', mode: 'auto', sceneId: 's15' });
  });

  it('round-trips a save through the session and back', () => {
    let s = session.start(rules);
    s = session.choose(session.decide(s), byName('historical_path').choices[0]);
    const save = saveOf(s);
    expect(parseRunSave(JSON.stringify(save))).toEqual(save);
  });

  it('discards a save from another rules version without throwing', () => {
    expect(resume(rules, { rulesVersion: rules.version + 1, choices: [] })).toEqual({ ok: false, reason: 'version' });
  });

  it('discards a save with an unknown option id without throwing', () => {
    const choices = [...byName('historical_path').choices.slice(0, 3), 'no_such_option'];
    expect(resume(rules, { rulesVersion: rules.version, choices })).toEqual({ ok: false, reason: 'invalid' });
  });

  it('discards a save whose choices already finish the run', () => {
    const { choices } = byName('historical_path');
    expect(resume(rules, { rulesVersion: rules.version, choices })).toEqual({ ok: false, reason: 'invalid' });
    expect(resume(rules, { rulesVersion: rules.version, choices: [...choices, 'extra'] }).ok).toBe(false);
  });

  it('reads malformed saves as no save', () => {
    for (const bad of ['', 'nope', '{}', '{"rulesVersion":"6","choices":[]}', '{"rulesVersion":6,"choices":[1]}']) {
      expect(parseRunSave(bad)).toBeNull();
    }
  });
});

describe('storage', () => {
  it('round-trips a run save and resumes it', async () => {
    const storage = memoryStorage();
    const prefix = byName('historical_path').choices.slice(0, 7);
    await saveRun(storage, rules, { rulesVersion: rules.version, choices: prefix });
    expect(storage.contents.has(storageKeys.run(rules.ruler))).toBe(true);
    const loaded = await loadRun(storage, rules);
    if (loaded.status !== 'resumed') throw new Error(`expected resumed, got ${loaded.status}`);
    expect(loaded.session.run.state).toEqual(directState(prefix).state);
    await clearRun(storage, rules);
    expect(await loadRun(storage, rules)).toEqual({ status: 'none' });
  });

  it('deletes an unrestorable save and reports it, without throwing', async () => {
    for (const json of ['garbage', JSON.stringify({ rulesVersion: 1, choices: [] }), JSON.stringify({ rulesVersion: rules.version, choices: ['nope'] })]) {
      const storage = memoryStorage({ [storageKeys.run(rules.ruler)]: json });
      expect(await loadRun(storage, rules)).toEqual({ status: 'discarded' });
      expect(storage.contents.has(storageKeys.run(rules.ruler))).toBe(false);
    }
  });

  it('round-trips the profile', async () => {
    const storage = memoryStorage();
    const ruler = applyRunResult(emptyRulerProfile, {
      ending: 'gloriana',
      score: 120,
      decisions: byName('historical_path').expected.decisions,
      finishedAt: '2026-10-08T12:00:00.000Z',
    }).profile;
    const profile = withRulerProfile(emptyProfile, rules.ruler, ruler);
    await saveProfile(storage, profile);
    expect(await loadProfile(storage)).toEqual(profile);
  });

  it('records a finished run and deletes its save', async () => {
    const storage = memoryStorage();
    const { choices, expected } = byName('historical_path');
    await saveRun(storage, rules, { rulesVersion: rules.version, choices: choices.slice(0, -1) });
    const { outcome, run } = replay(rules, choices);
    const { profile, newlyDiscovered } = await finishRun(storage, rules, {
      ending: outcome.ending,
      score: outcome.score,
      decisions: run.history.decisions,
      finishedAt: '2026-10-08T12:00:00.000Z',
    });
    expect(newlyDiscovered).toHaveLength(17);
    expect(rulerProfile(profile, rules.ruler).endings.gloriana.timesReached).toBe(1);
    expect(await loadProfile(storage)).toEqual(profile);
    expect(storage.contents.has(storageKeys.run(rules.ruler))).toBe(false);
    expect(expected.ending).toBe('gloriana');
  });
});
