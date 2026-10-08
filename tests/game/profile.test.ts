import {
  applyRunResult,
  emptyProfile,
  emptyRulerProfile,
  parseProfile,
  type RunResult,
} from '../../src/game/profile';
import { goldenCases } from '../core/helpers';

const AT = '2026-10-08T12:00:00.000Z';
const LATER = '2026-10-09T12:00:00.000Z';

function resultOf(name: string, finishedAt = AT): RunResult {
  const c = goldenCases.find((g) => g.name === name);
  if (!c) throw new Error(`No golden case ${name}`);
  return {
    ending: c.expected.ending,
    score: c.expected.score,
    decisions: c.expected.decisions,
    finishedAt,
  };
}

const findCase = (pred: (c: (typeof goldenCases)[number]) => boolean) => {
  const c = goldenCases.find(pred);
  if (!c) throw new Error('No matching golden case');
  return c;
};

describe('applyRunResult', () => {
  it('discovers all 17 scenes and unlocks gloriana on the historical path', () => {
    const { profile, newlyDiscovered } = applyRunResult(emptyRulerProfile, resultOf('historical_path'));
    expect(newlyDiscovered).toHaveLength(17);
    expect(profile.discovered).toHaveLength(17);
    expect(newlyDiscovered).toEqual(resultOf('historical_path').decisions.map((d) => d.scene));
    expect(profile.endings.gloriana).toEqual({ firstReached: AT, timesReached: 1, bestScore: 120 });
    expect(profile.runsCompleted).toBe(1);
  });

  it('changes only timesReached and runsCompleted when the same run is applied again', () => {
    const once = applyRunResult(emptyRulerProfile, resultOf('historical_path'));
    const twice = applyRunResult(once.profile, resultOf('historical_path', LATER));
    expect(twice.newlyDiscovered).toEqual([]);
    expect(twice.profile.discovered).toEqual(once.profile.discovered);
    expect(twice.profile.endings.gloriana).toEqual({ ...once.profile.endings.gloriana, timesReached: 2 });
    expect(twice.profile.runsCompleted).toBe(2);
  });

  it('never discovers a scene through an auto decision', () => {
    const c = findCase((g) => g.expected.decisions.some((d) => d.auto && d.historical));
    const auto = c.expected.decisions.filter((d) => d.auto && d.historical).map((d) => d.scene);
    const { profile } = applyRunResult(emptyRulerProfile, resultOf(c.name));
    for (const scene of auto) expect(profile.discovered).not.toContain(scene);
    expect(auto).toContain('s15');
  });

  it('records the decisions made before an alternate ending', () => {
    const c = findCase((g) => g.expected.ending === 'dudleys_wife');
    const before = c.expected.decisions.filter((d) => d.historical && !d.auto).map((d) => d.scene);
    expect(before.length).toBeGreaterThan(0);
    const { profile, newlyDiscovered } = applyRunResult(emptyRulerProfile, resultOf(c.name));
    expect(newlyDiscovered).toEqual(before);
    expect(profile.endings.dudleys_wife).toEqual({ firstReached: AT, timesReached: 1 });
  });

  it('keeps the best finale score and the first time reached', () => {
    const runs = goldenCases.filter((g) => g.expected.ending === 'pyrrhic' && g.expected.score !== null);
    expect(runs.length).toBeGreaterThan(1);
    let profile = emptyRulerProfile;
    runs.forEach((g, i) => {
      profile = applyRunResult(profile, resultOf(g.name, i === 0 ? AT : LATER)).profile;
    });
    expect(profile.endings.pyrrhic.firstReached).toBe(AT);
    expect(profile.endings.pyrrhic.timesReached).toBe(runs.length);
    expect(profile.endings.pyrrhic.bestScore).toBe(Math.max(...runs.map((g) => g.expected.score as number)));
  });

  it('does not change the profile it was given', () => {
    const profile = Object.freeze({ ...emptyRulerProfile });
    applyRunResult(profile, resultOf('historical_path'));
    expect(profile).toEqual(emptyRulerProfile);
  });
});

describe('parseProfile', () => {
  it('treats missing, corrupt or foreign data as an empty profile', () => {
    expect(parseProfile(null)).toEqual(emptyProfile);
    expect(parseProfile('not json')).toEqual(emptyProfile);
    expect(parseProfile('{"version":2,"rulers":{}}')).toEqual(emptyProfile);
    expect(parseProfile('[]')).toEqual(emptyProfile);
  });

  it('drops a malformed ruler record but keeps the rest', () => {
    const good = applyRunResult(emptyRulerProfile, resultOf('historical_path')).profile;
    const json = JSON.stringify({ version: 1, rulers: { a: good, b: { discovered: 'nope' } } });
    expect(parseProfile(json)).toEqual({ version: 1, rulers: { a: good } });
  });
});
