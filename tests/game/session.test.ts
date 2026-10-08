import { allOptions, choose, flatten, replay, resolve, start, step, startRun } from '../../src/core';
import * as session from '../../src/game/session';
import type { Session, SessionView } from '../../src/game/session';
import { deepFreeze, goldenCases, rules } from '../core/helpers';

/**
 * Plays choices through the session: Decide on choice scenes, then the option, continuing past
 * consequences and beats. Returns every view seen.
 */
function play(choices: readonly string[]): { final: Session; views: SessionView[] } {
  let s = session.start(rules);
  const views: SessionView[] = [s.view];
  for (const choice of choices) {
    expect(s.view.kind).toBe('scene');
    if (s.view.kind === 'scene' && s.view.mode === 'choice') {
      s = session.decide(s);
      views.push(s.view);
    }
    s = session.choose(s, choice);
    views.push(s.view);
    while (s.view.kind === 'consequence' || s.view.kind === 'beat') {
      s = session.continue(s);
      views.push(s.view);
    }
  }
  return { final: s, views };
}

const sceneIdsShown = (views: SessionView[]) =>
  views.flatMap((v) => (v.kind === 'scene' && v.phase === 'read' ? [v.sceneId] : []));

/** A compact trace: "s08" for scenes, "beat:<id>" for beats, "end:<id>" for the ending. */
const trace = (views: SessionView[]) =>
  views.flatMap((v) => {
    if (v.kind === 'scene') return v.phase === 'read' ? [v.sceneId] : [];
    if (v.kind === 'beat') return [`beat:${v.beatId}`];
    if (v.kind === 'ending') return [`end:${v.ending}`];
    return [];
  });

const byName = (name: string) => {
  const found = goldenCases.find((c) => c.name === name);
  if (!found) throw new Error(`No golden case ${name}`);
  return found;
};

describe('game session', () => {
  it('reaches gloriana with 17 of 17 on the historical path', () => {
    const { final } = play(byName('historical_path').choices);
    expect(final.view).toMatchObject({
      kind: 'ending',
      ending: 'gloriana',
      historicalMatches: 17,
      playerDecisions: 17,
      early: false,
    });
    if (final.view.kind === 'ending') expect(final.view.score).toBeCloseTo(120, 9);
  });

  it('shows the story beats of the historical path in order', () => {
    const { views } = play(byName('historical_path').choices);
    const around = ['s08', 's09', 's12', 's13', 's15', 's16'];
    const shown = trace(views).filter((t) => !/^s\d/.test(t) || around.includes(t));
    expect(shown).toEqual([
      's08',
      'beat:papal_bull',
      's09',
      's12',
      'beat:drake_return',
      's13',
      's15',
      'beat:mary_execution_fotheringhay',
      's16',
      'beat:armada_sighted',
      'beat:fireships',
      'beat:tilbury',
      'beat:storm',
      'end:gloriana',
    ]);
  });

  it('shows each beat after its consequence and with its image', () => {
    const { views } = play(byName('historical_path').choices);
    const first = views.findIndex((v) => v.kind === 'beat');
    expect(views[first - 1].kind).toBe('consequence');
    expect(views[first]).toMatchObject({
      kind: 'beat',
      beatId: 'papal_bull',
      image: rules.beats.papal_bull.image,
    });
  });

  it('shows the Rome-courts beat instead of the bull after a Catholic-leaning start', () => {
    const golden = goldenCases.find((c) =>
      c.expected.decisions.some((d) => d.scene === 's08' && d.beats.includes('rome_courts')),
    );
    expect(golden).toBeDefined();
    const { views } = play(golden!.choices);
    const beats = trace(views).filter((t) => t.startsWith('beat:'));
    expect(beats).toContain('beat:rome_courts');
    expect(beats).not.toContain('beat:papal_bull');
  });

  it('shows every golden case decision and finale beat, in order', () => {
    for (const c of goldenCases) {
      const { views } = play(c.choices);
      const expected = [...c.expected.decisions.flatMap((d) => d.beats), ...c.expected.finale_beats];
      const shown = trace(views).filter((t) => t.startsWith('beat:'));
      expect(shown).toEqual(expected.map((b) => `beat:${b}`));
    }
  });

  it('plays finale beats before an early finale but not before failure or alternate endings', () => {
    const early = goldenCases.find((c) => c.expected.early_finale);
    const failure = goldenCases.find((c) => c.expected.score === null && c.expected.ending === 'bankrupt');
    expect(early && failure).toBeTruthy();
    const earlyViews = play(early!.choices).views;
    expect(trace(earlyViews).slice(-5)).toEqual([
      ...(rules.finale.beats ?? []).map((b) => `beat:${b}`),
      `end:${early!.expected.ending}`,
    ]);
    const failureTrace = trace(play(failure!.choices).views);
    for (const b of rules.finale.beats ?? []) expect(failureTrace).not.toContain(`beat:${b}`);
  });

  it('goes straight to the ending view for an option with an end', () => {
    const endOptions = new Set(
      rules.scenes.flatMap((s) => allOptions(s).flatMap((o) => (o.end ? [`${s.id}/${o.id}`] : []))),
    );
    const golden = goldenCases.find((c) => {
      const last = c.expected.decisions[c.expected.decisions.length - 1];
      return endOptions.has(`${last.scene}/${last.option}`) && !last.auto;
    });
    expect(golden).toBeDefined();
    const { views } = play(golden!.choices);
    expect(views[views.length - 1]).toMatchObject({ kind: 'ending', ending: golden!.expected.ending });
    expect(views[views.length - 2].kind).toBe('scene');
  });

  it('marrying at scene 5 ends in Dudley\'s Wife', () => {
    const golden = goldenCases.find((c) => c.expected.ending === 'dudleys_wife');
    expect(golden).toBeDefined();
    expect(golden!.expected.decisions[golden!.expected.decisions.length - 1].scene).toBe('s05');
    const { final } = play(golden!.choices);
    expect(final.view).toMatchObject({ kind: 'ending', ending: 'dudleys_wife' });
  });

  it('ends at the Babington auto scene in Assassinated without Walsingham', () => {
    const golden = goldenCases.find((c) => {
      const last = c.expected.decisions[c.expected.decisions.length - 1];
      return c.expected.ending === 'assassinated' && last.scene === 's15' && last.auto;
    });
    expect(golden).toBeDefined();
    const { final, views } = play(golden!.choices);
    const babington = views.find((v) => v.kind === 'scene' && v.sceneId === 's15');
    expect(babington).toMatchObject({ mode: 'auto', options: ['undetected'] });
    expect(final.view).toMatchObject({ kind: 'ending', ending: 'assassinated' });
  });

  it('never shows a skipped scene as a view', () => {
    const golden = goldenCases.find(
      (c) =>
        !c.expected.decisions.some((d) => d.scene === 's15') &&
        c.expected.decisions.some((d) => d.scene === 's16'),
    );
    expect(golden).toBeDefined();
    const { final, views } = play(golden!.choices);
    expect(sceneIdsShown(views)).not.toContain('s15');
    expect(sceneIdsShown(views)).toContain('s16');
    expect(final.view).toMatchObject({ kind: 'ending', ending: golden!.expected.ending });
  });

  it('matches every golden case', () => {
    for (const c of goldenCases) {
      const { final } = play(c.choices);
      expect(final.view).toMatchObject({
        kind: 'ending',
        ending: c.expected.ending,
        early: c.expected.early_finale,
        historicalMatches: c.expected.historical_matches,
      });
    }
  });

  it('never exposes which option is historical in a scene view', () => {
    const { views } = play(byName('historical_path').choices);
    for (const view of views.filter((v) => v.kind !== 'ending')) {
      expect(JSON.stringify(view)).not.toMatch(/historical/);
    }
  });

  it('returns new sessions and never mutates the old one', () => {
    const first = deepFreeze(session.start(rules));
    const snapshot = JSON.stringify(first);
    const view = first.view;
    if (view.kind !== 'scene') throw new Error('expected a scene');
    const deciding = session.decide(first);
    const chosen = session.choose(deciding, view.options[0]);
    expect(chosen).not.toBe(first);
    const next = session.continue(chosen);
    expect(next).not.toBe(chosen);
    expect(JSON.stringify(first)).toBe(snapshot);
  });

  it('restarts through the reducer', () => {
    const s = session.start(rules);
    const view = s.view;
    if (view.kind !== 'scene') throw new Error('expected a scene');
    const deciding = session.sessionReducer(s, { type: 'decide' });
    const played = session.sessionReducer(deciding, { type: 'choose', optionId: view.options[0] });
    const restarted = session.sessionReducer(played, { type: 'start' });
    expect(restarted.view).toEqual(s.view);
  });

  it('rejects actions that do not fit the current view', () => {
    const s = session.start(rules);
    expect(() => session.continue(s)).toThrow(/Cannot continue/);
    expect(() => session.choose(session.decide(s), 'no_such_option')).toThrow(/no available option/);
  });

  describe('read then decide', () => {
    it('opens a choice scene in the read phase and only takes options in the decide phase', () => {
      const s = session.start(rules);
      expect(s.view).toMatchObject({ kind: 'scene', mode: 'choice', phase: 'read' });
      const view = s.view as session.SceneViewModel;
      expect(() => session.choose(s, view.options[0])).toThrow(/decide phase/);
      const deciding = session.decide(s);
      expect(deciding.view).toEqual({ ...view, phase: 'decide' });
      expect(() => session.decide(deciding)).toThrow(/only available while reading/);
    });

    it('plays auto scenes without a decide phase', () => {
      const golden = goldenCases.find((c) => c.expected.decisions.some((d) => d.auto));
      const { views } = play(golden!.choices);
      const auto = views.filter((v) => v.kind === 'scene' && v.mode === 'auto');
      expect(auto.length).toBeGreaterThan(0);
      for (const v of auto) expect(v).toMatchObject({ phase: 'read' });
    });
  });

  describe('displayed state', () => {
    const historical = byName('historical_path');
    const { views } = play(historical.choices);
    const sceneView = (id: string) =>
      views.find((v) => v.kind === 'scene' && v.sceneId === id && v.phase === 'read') as session.SceneViewModel;
    const consequenceOf = (id: string) =>
      views.find((v) => v.kind === 'consequence' && v.sceneId === id) as session.ConsequenceViewModel;

    it('shows Treasury before drift after scene 6, and 10 higher (the era drift) at scene 7', () => {
      // Independently: replay to scene 6 with the core engine and split the choice from the drift.
      let run = startRun(rules);
      for (const choice of historical.choices.slice(0, 5)) run = step(rules, run, choice).run;
      expect(rules.scenes[run.sceneIndex].id).toBe('s06');
      const { afterChoice, run: afterS06 } = step(rules, run, historical.choices[5]);

      const consequence = consequenceOf('s06');
      const s07 = sceneView('s07');
      expect(consequence.state).toEqual(afterChoice);
      expect(s07.state).toEqual(afterS06.state);
      expect(s07.state.meters.tr).toBe(consequence.state.meters.tr + 10);
      expect(rules.scenes[5].drift_after).toBe(true);
    });

    it('shows the state at the start of each scene, and the same state through its beats', () => {
      for (const [i, view] of views.entries()) {
        if (view.kind === 'beat') expect(view.state).toEqual(views[i - 1].state);
      }
      const s01 = sceneView('s01');
      expect(s01.state).toEqual(start(rules));
    });

    it('ends on the golden final state', () => {
      const ending = views[views.length - 1];
      expect(ending.kind).toBe('ending');
      expect(flatten(ending.state)).toEqual(historical.expected.final_state);
      expect(replay(rules, historical.choices).run.state).toEqual(ending.state);
    });

    it('shows the choice’s own effect, before drift, on the consequence', () => {
      const s06 = sceneView('s06');
      const expected = choose(rules, 5, s06.state, historical.choices[5]).state;
      expect(consequenceOf('s06').state).toEqual(expected);
      expect(resolve(rules, 5, expected).state).toEqual(sceneView('s07').state);
    });
  });
});
