import { getRuler } from '../../src/data/rulers';
import { resume } from '../../src/game/save';
import * as session from '../../src/game/session';
import type { Session, SessionView } from '../../src/game/session';
import { goldenCases } from '../core/helpers';

const { rules, ui } = getRuler('elizabeth-i');
const sceneIndex = (id: string) => rules.scenes.findIndex((s) => s.id === id);

/** Plays choices with the ruler's presentation, passing every non-scene view. Returns all views. */
function play(choices: readonly string[]): { final: Session; views: SessionView[] } {
  let s = session.start(rules, ui);
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
  return { final: s, views };
}

/** "prologue", "era:<id>", scene ids (once each), "beat:<id>" and "end:<id>". */
function trace(views: SessionView[]): string[] {
  return views.flatMap((v) => {
    switch (v.kind) {
      case 'prologue':
        return ['prologue'];
      case 'era':
        return [`era:${v.eraId}`];
      case 'scene':
        return v.phase === 'read' ? [v.sceneId] : [];
      case 'beat':
        return [`beat:${v.beatId}`];
      case 'ending':
        return [`end:${v.ending}`];
      default:
        return [];
    }
  });
}

const byName = (name: string) => goldenCases.find((c) => c.name === name)!;

describe('ui.json eras', () => {
  it('start at scenes that exist, in scene order, with registered images', () => {
    const eras = ui.eras ?? [];
    expect(eras.map((e) => e.id)).toEqual(['era1', 'era2', 'era3', 'era4']);
    const starts = eras.map((e) => sceneIndex(e.startsAt));
    for (const s of starts) expect(s).toBeGreaterThanOrEqual(0);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(new Set(starts).size).toBe(starts.length);
  });
});

describe('prologue and era cards', () => {
  it('frame the historical path: prologue, era cards before s01, s07, s11 and s15, then the finale', () => {
    const { views } = play(byName('historical_path').choices);
    const shown = trace(views).filter((t) => !t.startsWith('beat:'));
    expect(shown).toEqual([
      'prologue',
      'era:era1',
      's01', 's02', 's03', 's04', 's05', 's06',
      'era:era2',
      's07', 's08', 's09', 's10',
      'era:era3',
      's11', 's12', 's13', 's14',
      'era:era4',
      's15', 's16', 's17',
      'end:gloriana',
    ]);
    const finaleBeats = (rules.finale.beats ?? []).map((b) => `beat:${b}`);
    expect(trace(views).slice(-1 - finaleBeats.length, -1)).toEqual(finaleBeats);
  });

  it('shows each era card once and every era card with its own image', () => {
    const { views } = play(byName('historical_path').choices);
    const eras = views.filter((v): v is session.EraViewModel => v.kind === 'era');
    expect(eras.map((e) => e.eraId)).toEqual(['era1', 'era2', 'era3', 'era4']);
    for (const e of eras) expect(e.image).toBe(ui.eras!.find((x) => x.id === e.eraId)!.image);
    expect(views.filter((v) => v.kind === 'prologue')).toHaveLength(1);
  });

  it('shows the era 4 card before s16 when scene 15 is skipped (Mary not captive)', () => {
    const c = goldenCases.find(
      (g) =>
        !g.expected.decisions.some((d) => d.scene === 's15') &&
        g.expected.decisions.some((d) => d.scene === 's16'),
    )!;
    expect(c).toBeDefined();
    const shown = trace(play(c.choices).views);
    expect(shown).not.toContain('s15');
    expect(shown.indexOf('era:era4')).toBe(shown.indexOf('s16') - 1);
  });

  it('never shows the era 4 card when the run ends before scene 15', () => {
    const endsEarly = goldenCases.filter((g) => {
      const last = g.expected.decisions[g.expected.decisions.length - 1];
      return sceneIndex(last.scene) < sceneIndex('s15');
    });
    expect(endsEarly.some((g) => g.expected.early_finale)).toBe(true);
    expect(endsEarly.some((g) => g.expected.score === null)).toBe(true);
    for (const g of endsEarly) {
      const shown = trace(play(g.choices).views);
      expect(shown).not.toContain('era:era4');
      expect(shown[shown.length - 1]).toBe(`end:${g.expected.ending}`);
    }
  });

  it('animates the era drift on the era 2 card, not on s07', () => {
    const { views } = play(byName('historical_path').choices);
    const consequence = views.find((v) => v.kind === 'consequence' && v.sceneId === 's06')!;
    const i = views.findIndex((v) => v.kind === 'era' && v.eraId === 'era2');
    const card = views[i];
    const s07 = views.find((v) => v.kind === 'scene' && v.sceneId === 's07' && v.phase === 'read')!;
    expect(card.state.meters.tr).toBe(consequence.state.meters.tr + 10);
    expect(s07.state).toEqual(card.state);
  });

  it('shows the start state on the prologue and the first era card', () => {
    const s = session.start(rules, ui);
    expect(s.view.kind).toBe('prologue');
    const era1 = session.continue(s);
    expect(era1.view).toMatchObject({ kind: 'era', eraId: 'era1', image: 'ERA1' });
    expect(era1.view.state).toEqual(s.view.state);
    expect(session.continue(era1).view).toMatchObject({ kind: 'scene', sceneId: 's01' });
  });

  it('plays without prologue or cards when there is no presentation', () => {
    const s = session.start(rules);
    expect(s.view).toMatchObject({ kind: 'scene', sceneId: 's01' });
  });
});

describe('resume', () => {
  it('opens straight at the next scene, with no prologue or era card', () => {
    const { choices } = byName('historical_path');
    for (const n of [0, 1, 6, 7, 10, 14, 16]) {
      const resumed = resume(rules, { rulesVersion: rules.version, choices: choices.slice(0, n) }, ui);
      if (!resumed.ok) throw new Error(`prefix ${n} did not resume`);
      expect(resumed.session.view.kind).toBe('scene');
    }
  });

  it('still shows the cards of eras not yet reached, and not those already passed', () => {
    const { choices } = byName('historical_path');
    // Resume at s07 (start of era 2): era 2 counts as passed; era 3 and 4 still appear.
    const resumed = resume(rules, { rulesVersion: rules.version, choices: choices.slice(0, 6) }, ui);
    if (!resumed.ok) throw new Error('did not resume');
    expect(resumed.session.view).toMatchObject({ kind: 'scene', sceneId: 's07' });
    let s = resumed.session;
    const views: SessionView[] = [s.view];
    for (const choice of choices.slice(6)) {
      if (s.view.kind === 'scene' && s.view.mode === 'choice') s = session.decide(s);
      s = session.choose(s, choice);
      views.push(s.view);
      while (s.view.kind !== 'scene' && s.view.kind !== 'ending') {
        s = session.continue(s);
        views.push(s.view);
      }
    }
    expect(trace(views).filter((t) => t.startsWith('era:') || t === 'prologue')).toEqual(['era:era3', 'era:era4']);
  });
});
