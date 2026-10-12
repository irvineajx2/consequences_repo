import { replay } from '../../src/core';
import { getRuler, rulerUnlocked } from '../../src/data/rulers';
import { chronicleBook, runChronicle } from '../../src/game/chronicle';
import { finishRun, loadProfile } from '../../src/game/persistence';
import { applyRunResult, emptyProfile, emptyRulerProfile, rulerProfile, withRulerProfile } from '../../src/game/profile';
import * as session from '../../src/game/session';
import type { SessionView } from '../../src/game/session';
import { memoryStorage, storageKeys } from '../../src/game/storage';
import { fixtureRulers } from '../core/helpers';

const caesar = getRuler('julius-caesar');
const elizabeth = getRuler('elizabeth-i');
const fixtures = fixtureRulers();
const caesarCases = fixtures.find((f) => f.id === 'julius-caesar')!.cases;
const elizabethCases = fixtures.find((f) => f.id === 'elizabeth-i')!.cases;
const byName = (name: string) => caesarCases.find((c) => c.name === name)!;
const AT = '2026-10-09T12:00:00.000Z';

/** Plays choices through the session with Caesar's presentation; returns every view. */
function play(choices: readonly string[]): SessionView[] {
  let s = session.start(caesar.rules, caesar.ui);
  const views: SessionView[] = [s.view];
  const pass = () => {
    while (s.view.kind !== 'scene' && s.view.kind !== 'ending') {
      s = session.continue(s);
      views.push(s.view);
    }
  };
  pass();
  for (const choice of choices) {
    if (s.view.kind === 'scene' && s.view.mode === 'choice') s = session.decide(s);
    s = session.choose(s, choice);
    views.push(s.view);
    pass();
  }
  return views;
}

describe("Caesar's historical path", () => {
  const { choices } = byName('historical_path');
  const { outcome, run } = replay(caesar.rules, choices);

  it('ends in ides, score 17.5, with 22 historical matches and no branch decisions', () => {
    expect(outcome.ending).toBe('ides');
    expect(outcome.score).toBeCloseTo(17.5, 9);
    expect(run.history.historicalMatches).toBe(22);
    expect(run.history.branchDecisions).toBe(0);
  });

  it('plays the Theatre of Pompey before the ending', () => {
    expect(outcome.beats).toEqual(['theatre_of_pompey']);
    const views = play(choices);
    const last = views.slice(-2);
    expect(last[0]).toMatchObject({ kind: 'beat', beatId: 'theatre_of_pompey' });
    expect(last[1]).toMatchObject({ kind: 'ending', ending: 'ides', historicalMatches: 22, playerDecisions: 22 });
  });

  it('shows the prologue and four era cards, with drift animating on the era 2 card', () => {
    const views = play(choices);
    expect(views.filter((v) => v.kind === 'prologue')).toHaveLength(1);
    expect(views.filter((v) => v.kind === 'era').map((v) => (v as session.EraViewModel).eraId)).toEqual([
      'era1', 'era2', 'era3', 'era4',
    ]);
    const i = views.findIndex((v) => v.kind === 'era' && v.eraId === 'era2');
    const after = views.find((v, k) => k > i && v.kind === 'scene')!;
    expect(after).toMatchObject({ sceneId: 's08' });
    expect(after.state).toEqual(views[i].state);
  });
});

describe('branch scenes (uncharted paths)', () => {
  const branched = caesarCases.find((c) => (c.expected.branch_decisions ?? 0) > 0)!;

  it('appear as uncharted in the chronicle and are left out of the match count', () => {
    expect(branched).toBeDefined();
    const chronicle = runChronicle(caesar.rules, branched.expected.decisions, []);
    const branchRows = chronicle.rows.filter((r) => r.branch);
    expect(branchRows).toHaveLength(branched.expected.branch_decisions!);
    for (const row of branchRows) expect(row.matched).toBe(false);
    expect(chronicle.total).toBe(chronicle.rows.filter((r) => !r.auto && !r.branch).length);
    expect(chronicle.matched).toBe(branched.expected.historical_matches);
  });

  it("are counted out of the ending screen's total too", () => {
    const views = play(branched.choices);
    const ending = views[views.length - 1] as session.EndingViewModel;
    expect(ending.kind).toBe('ending');
    expect(ending.branchDecisions).toBe(branched.expected.branch_decisions);
    expect(ending.playerDecisions).toBe(
      branched.expected.decisions.filter((d) => !d.auto && !d.branch).length,
    );
  });

  it('are recorded as found in the profile, and listed in the Chronicle book', () => {
    const { profile, newlyUncharted } = applyRunResult(emptyRulerProfile, {
      ending: branched.expected.ending,
      score: branched.expected.score,
      decisions: branched.expected.decisions,
      finishedAt: AT,
    });
    const visited = branched.expected.decisions.filter((d) => d.branch).map((d) => d.scene);
    expect(newlyUncharted).toEqual([...new Set(visited)]);
    const book = chronicleBook(caesar.rules, profile);
    expect(book.uncharted.total).toBe(8);
    expect([...book.uncharted.found].sort()).toEqual([...new Set(visited)].sort());
    // Branch scenes are never decision entries.
    for (const e of book.entries) expect(caesar.rules.scenes.find((s) => s.id === e.sceneId)?.branch).toBeFalsy();
    expect(book.total).toBe(22);
  });
});

describe('the Theatre of Pompey beat', () => {
  it('does not play when Caesar stays home and refuses Decimus', () => {
    const c = caesarCases.find(
      (g) =>
        g.expected.final_state.stayed === true &&
        g.expected.decisions.some((d) => d.scene === 's22' && d.option === 'home') &&
        g.expected.decisions.some((d) => d.scene === 'b08' && d.option === 'refuse'),
    );
    expect(c).toBeDefined();
    const { outcome } = replay(caesar.rules, c!.choices);
    expect(outcome.beats).not.toContain('theatre_of_pompey');
    const beats = play(c!.choices).flatMap((v) => (v.kind === 'beat' ? [v.beatId] : []));
    expect(beats).not.toContain('theatre_of_pompey');
  });
});

describe('profiles', () => {
  it("keep the two rulers apart: a Caesar run never changes Elizabeth's discoveries or endings", async () => {
    const storage = memoryStorage();
    const lizRun = elizabethCases.find((c) => c.name === 'historical_path')!;
    await finishRun(storage, elizabeth.rules, {
      runId: 'run-1',
      ending: lizRun.expected.ending,
      score: lizRun.expected.score,
      decisions: lizRun.expected.decisions,
      finishedAt: AT,
    });
    const before = rulerProfile(await loadProfile(storage), elizabeth.rules.ruler);
    const hist = byName('historical_path');
    await finishRun(storage, caesar.rules, {
      runId: 'run-2',
      ending: hist.expected.ending,
      score: hist.expected.score,
      decisions: hist.expected.decisions,
      finishedAt: AT,
    });
    const after = await loadProfile(storage);
    expect(rulerProfile(after, elizabeth.rules.ruler)).toEqual(before);
    expect(rulerProfile(after, caesar.rules.ruler).endings.ides.timesReached).toBe(1);
    expect(rulerProfile(after, caesar.rules.ruler).discovered).toHaveLength(22);
  });

  it('migrate a version 1 profile to version 3 without losing anything, crediting its progress', async () => {
    const lizRun = elizabethCases.find((c) => c.name === 'historical_path')!;
    const v1Record = {
      discovered: lizRun.expected.decisions.map((d) => d.scene),
      endings: { gloriana: { firstReached: AT, timesReached: 3, bestScore: 120 } },
      runsCompleted: 5,
    };
    const storage = memoryStorage({
      [storageKeys.legacyProfile]: JSON.stringify({ version: 1, rulers: { elizabeth_i: v1Record } }),
    });
    const profile = await loadProfile(storage);
    // Gloriana (rare, new-ending XP 100, 80 gold) and 5 earlier runs at 120 XP each.
    expect(profile).toEqual({
      version: 3,
      rulers: { elizabeth_i: { ...v1Record, uncharted: [] } },
      progression: { totalXp: 100 + 5 * 120, gold: 80, awardedRunIds: [] },
    });
    // Saved under the new key; the old one is gone; reading again gives the same.
    expect(storage.contents.has(storageKeys.legacyProfile)).toBe(false);
    expect(JSON.parse(storage.contents.get(storageKeys.profile)!)).toEqual(profile);
    expect(await loadProfile(storage)).toEqual(profile);
  });
});

describe('unlocking', () => {
  it('keeps Elizabeth open and Caesar locked until any Elizabeth ending is reached', () => {
    expect(rulerUnlocked(elizabeth, emptyProfile)).toBe(true);
    expect(rulerUnlocked(caesar, emptyProfile)).toBe(false);
    const record = applyRunResult(emptyRulerProfile, {
      ending: 'dudleys_wife',
      score: null,
      decisions: [],
      finishedAt: AT,
    }).profile;
    expect(rulerUnlocked(caesar, withRulerProfile(emptyProfile, elizabeth.rules.ruler, record))).toBe(true);
  });

  it('is not triggered by a Caesar ending', () => {
    const record = applyRunResult(emptyRulerProfile, { ending: 'ides', score: 17.5, decisions: [], finishedAt: AT }).profile;
    expect(rulerUnlocked(caesar, withRulerProfile(emptyProfile, caesar.rules.ruler, record))).toBe(false);
  });

  it('opens every ruler with the hidden testing switch', () => {
    expect(rulerUnlocked(caesar, emptyProfile, true)).toBe(true);
  });
});
