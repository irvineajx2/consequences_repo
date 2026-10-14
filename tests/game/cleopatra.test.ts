import { replay } from '../../src/core';
import { getRuler, rulerUnlocked } from '../../src/data/rulers';
import { achievementList, awardAchievements } from '../../src/game/achievements';
import { applyRunResult, emptyProfile, emptyRulerProfile, type Profile, withRulerProfile } from '../../src/game/profile';
import { rulerTier } from '../../src/game/progression';
import { LOCKED, profileView } from '../../src/game/profileView';
import * as session from '../../src/game/session';
import type { SceneViewModel, SessionView } from '../../src/game/session';
import { eraText, sceneText } from '../../src/game/text';
import { profileRulers } from '../../src/ui/profile/profileRulers';
import { allRulerFacts } from '../../src/ui/profile/rulerFacts';
import { fixtureRulers } from '../core/helpers';

const cleopatra = getRuler('cleopatra');
const cases = fixtureRulers().find((f) => f.id === 'cleopatra')!.cases;
const AT = '2026-10-14T12:00:00.000Z';

/** Plays choices through the session with Cleopatra's presentation; returns every view. */
function play(choices: readonly string[]): SessionView[] {
  let s = session.start(cleopatra.rules, cleopatra.ui);
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

/** The first view of each scene shown (its read phase), by scene id. */
function scenesShown(views: readonly SessionView[]): Map<string, SceneViewModel> {
  const out = new Map<string, SceneViewModel>();
  for (const v of views) if (v.kind === 'scene' && !out.has(v.sceneId)) out.set(v.sceneId, v);
  return out;
}

const caseWhere = (test: (d: { scene: string; option: string }) => boolean) => cases.find((c) => c.expected.decisions.some(test))!;
const narrationOf = (v: SceneViewModel) => sceneText(cleopatra.text, v.sceneId, v.variant).narration;

describe("Cleopatra's historical path", () => {
  const historical = cases.find((c) => c.name.endsWith('_historical'))!;
  const { outcome, run } = replay(cleopatra.rules, historical.choices);

  it('plays all 22 decisions, every one historical, and ends at the asp', () => {
    expect(run.history.decisions).toHaveLength(22);
    expect(run.history.decisions.every((d) => d.historical && !d.branch && !d.auto)).toBe(true);
    expect(outcome.ending).toBe('asp');
  });

  it("shows the usual era cards and each scene's own image", () => {
    const views = play(historical.choices);
    expect(views.flatMap((v) => (v.kind === 'era' ? [v.eraId] : []))).toEqual(['era1', 'era2', 'era3', 'era4', 'era5']);
    for (const v of scenesShown(views).values()) expect(v.image).toBe(v.sceneId);
    expect(views.at(-1)).toMatchObject({ kind: 'ending', ending: 'asp' });
  });
});

describe("Octavian's road", () => {
  // Octavian chosen at Tarsus (Q15), staying on his road to the last scene (Q22's ally or freedom).
  const road = cases.find(
    (c) =>
      c.expected.decisions.some((d) => d.scene === 'Q15' && d.option === 'octavian') &&
      c.expected.decisions.some((d) => d.scene === 'Q22' && (d.option === 'ally' || d.option === 'freedom')),
  )!;
  const views = play(road.choices);
  const shown = scenesShown(views);

  it('begins by choosing Octavian at Tarsus', () => {
    expect(road.expected.decisions.find((d) => d.scene === 'Q15')?.option).toBe('octavian');
  });

  it('shows the "Octavian\'s Friend" era card, with image QO1', () => {
    const era4 = views.find((v) => v.kind === 'era' && v.eraId.startsWith('era4'));
    expect(era4).toMatchObject({ eraId: 'era4_octavian', image: 'QO1' });
    expect(eraText(cleopatra.text, 'era4_octavian').title).toBe("Octavian's Friend");
  });

  it('shows QO1-QO5 and their narration at scenes 17-21, and QO7 at scene 22', () => {
    const expected: [string, string][] = [
      ['Q17', 'QO1'],
      ['Q18', 'QO2'],
      ['Q19', 'QO3'],
      ['Q20', 'QO4'],
      ['Q21', 'QO5'],
      ['Q22', 'QO7'],
    ];
    for (const [scene, image] of expected) {
      const v = shown.get(scene)!;
      expect([scene, v.image]).toEqual([scene, image]);
      const own = cleopatra.text.scenes[scene].variants?.[String(v.variant)]?.narration;
      expect(own).toEqual(expect.any(String));
      expect(narrationOf(v)).toBe(own);
      expect(narrationOf(v)).not.toBe(cleopatra.text.scenes[scene].narration);
    }
  });
});

describe('victory at Actium', () => {
  it('shows QO6 and its narration at scene 22', () => {
    const won = caseWhere((d) => d.scene === 'Q22' && (d.option === 'east' || d.option === 'peace'));
    const q22 = scenesShown(play(won.choices)).get('Q22')!;
    expect(q22.image).toBe('QO6');
    expect(narrationOf(q22)).toMatch(/^Actium is won/);
  });
});

describe('unlocking and rewards', () => {
  it('unlocks like the others: after any ending as the ruler before (Charles)', () => {
    expect(cleopatra.unlockedBy).toBe('charles-i');
    expect(rulerUnlocked(cleopatra, emptyProfile)).toBe(false);
    const record = applyRunResult(emptyRulerProfile, { ending: 'axe', score: 0, decisions: [], finishedAt: AT }).profile;
    expect(rulerUnlocked(cleopatra, withRulerProfile(emptyProfile, 'charles_i', record))).toBe(true);
  });

  it("earns XP at Caesar's tier", () => {
    expect(rulerTier('cleopatra')).toBe(rulerTier('julius-caesar'));
  });
});

describe('cross-ruler secret achievements', () => {
  const reached = (profile: Profile, key: string, ending: string) =>
    withRulerProfile(
      profile,
      key,
      applyRunResult(profile.rulers[key] ?? emptyRulerProfile, { ending, score: null, decisions: [], finishedAt: AT }).profile,
    );
  const earned = (p: Profile) => Object.keys(awardAchievements(p, allRulerFacts, AT).profile.progression.achievements);

  it('A Love Older Than Rome: Caesar\'s "Lord of the Nile" and Cleopatra\'s Nile pact, in any order', () => {
    const caesarOnly = reached(emptyProfile, 'julius_caesar', 'lord_nile');
    expect(earned(caesarOnly)).not.toContain('love_older_than_rome');
    expect(earned(reached(caesarOnly, 'cleopatra', 'nile_pact'))).toContain('love_older_than_rome');
    expect(earned(reached(reached(emptyProfile, 'cleopatra', 'nile_pact'), 'julius_caesar', 'lord_nile'))).toContain('love_older_than_rome');
  });

  it('Beware the Ides: a Caesar ending where he outlives the Ides, and Cleopatra\'s two worlds', () => {
    const cleo = reached(emptyProfile, 'cleopatra', 'two_worlds');
    for (const ending of ['pater_patriae', 'uneasy_crown', 'second_sulla']) {
      expect(earned(reached(cleo, 'julius_caesar', ending))).toContain('beware_the_ides');
    }
    for (const ending of ['ides', 'daggers_dark', 'king_rome', 'lord_nile']) {
      expect(earned(reached(cleo, 'julius_caesar', ending))).not.toContain('beware_the_ides');
    }
    expect(earned(reached(emptyProfile, 'julius_caesar', 'pater_patriae'))).not.toContain('beware_the_ides');
  });

  it('stay hidden ("???") on the profile until earned', () => {
    const half = reached(emptyProfile, 'julius_caesar', 'lord_nile');
    const view = profileView(half, profileRulers(half, false));
    for (const id of ['love_older_than_rome', 'beware_the_ides']) {
      expect(view.achievements.find((a) => a.id === id)).toMatchObject({ title: LOCKED, description: LOCKED, earned: false });
    }
    // Every cross-ruler achievement (endings from more than one ruler) is secret.
    const crossRuler = achievementList(allRulerFacts).filter((a) => a.condition.type === 'endingsReached' && a.condition.all.length > 1);
    expect(crossRuler.map((a) => a.id)).toEqual(['love_older_than_rome', 'beware_the_ides']);
    expect(crossRuler.every((a) => a.hidden)).toBe(true);
  });
});
