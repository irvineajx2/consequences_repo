import { replay } from '../../src/core';
import { getRuler, rulerUnlocked } from '../../src/data/rulers';
import { meterForState, visibleMeters } from '../../src/game/meters';
import { applyRunResult, emptyProfile, emptyRulerProfile, withRulerProfile } from '../../src/game/profile';
import { applyRunRewards, emptyProgression, progression, rulerTier } from '../../src/game/progression';
import * as session from '../../src/game/session';
import type { SessionView } from '../../src/game/session';
import { eraText, sceneText } from '../../src/game/text';
import { fixtureRulers } from '../core/helpers';

const charles = getRuler('charles-i');
const cases = fixtureRulers().find((f) => f.id === 'charles-i')!.cases;
const AT = '2026-10-13T12:00:00.000Z';

/** Plays choices through the session with Charles's presentation; returns every view. */
function play(choices: readonly string[]): SessionView[] {
  let s = session.start(charles.rules, charles.ui);
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

/** The first fixture with a decision matching `test`. */
const caseWhere = (test: (d: { scene: string; option: string }) => boolean) =>
  cases.find((c) => c.expected.decisions.some(test))!;

describe("Charles's historical path", () => {
  const historical = cases.find((c) => c.name.endsWith('_historical'))!;
  const { outcome, run } = replay(charles.rules, historical.choices);

  it('plays all 23 main decisions, every one historical, and ends at the axe', () => {
    expect(run.history.decisions).toHaveLength(23);
    expect(run.history.decisions.every((d) => d.historical && !d.branch && !d.auto)).toBe(true);
    expect(run.history.historicalMatches).toBe(23);
    expect(outcome.ending).toBe('axe');
  });

  it('fires all seven beats, KT1 to KT7, in order', () => {
    expect(run.history.decisions.flatMap((d) => d.beats)).toEqual(['KT1', 'KT2', 'KT3', 'KT4', 'KT5', 'KT6', 'KT7']);
    const views = play(historical.choices);
    expect(views.filter((v) => v.kind === 'beat').map((v) => (v.kind === 'beat' ? v.beatId : ''))).toEqual([
      'KT1', 'KT2', 'KT3', 'KT4', 'KT5', 'KT6', 'KT7',
    ]);
    expect(views.at(-1)).toMatchObject({ kind: 'ending', ending: 'axe' });
  });

  it('shows the prologue and the five usual era cards', () => {
    const views = play(historical.choices);
    expect(views.filter((v) => v.kind === 'prologue')).toHaveLength(1);
    const eras = views.flatMap((v) => (v.kind === 'era' ? [[v.eraId, v.image]] : []));
    expect(eras).toEqual([
      ['era1', 'KERA1'],
      ['era2', 'KERA2'],
      ['era3', 'KERA3'],
      ['era4', 'KERA4'],
      ['era5', 'KERA5'],
    ]);
  });
});

describe('era card variants', () => {
  it('settling at Nottingham into the peace arc shows "The Uneasy Peace" (with the KA1 image)', () => {
    const peace = caseWhere((d) => d.scene === 'KA1');
    expect(peace.expected.decisions.find((d) => d.scene === 'K14')?.option).toBe('settle');
    const eras = play(peace.choices).flatMap((v) => (v.kind === 'era' ? [v] : []));
    expect(eras.map((e) => e.eraId)).toContain('era4_peace');
    expect(eras.find((e) => e.eraId === 'era4_peace')?.image).toBe('KA1');
    expect(eras.map((e) => e.eraId)).not.toContain('era4');
    expect(eraText(charles.text, 'era4_peace').title).toBe('The Uneasy Peace');
  });

  it('escaping to France shows "The King Over the Water" (with the KE1 image)', () => {
    const exile = caseWhere((d) => d.scene === 'K19' && d.option === 'france');
    const eras = play(exile.choices).flatMap((v) => (v.kind === 'era' ? [v] : []));
    expect(eras.find((e) => e.eraId === 'era5_exile')?.image).toBe('KE1');
    expect(eras.map((e) => e.eraId)).not.toContain('era5');
    expect(eraText(charles.text, 'era5_exile').title).toBe('The King Over the Water');
  });
});

describe('variant narration', () => {
  it('shows the victory narration at scene 19 after winning at Naseby, and the usual one otherwise', () => {
    const won = caseWhere((d) => d.scene === 'K19' && (d.option === 'pardonwin' || d.option === 'crush'));
    const at19 = (choices: readonly string[]) =>
      play(choices).find((v) => v.kind === 'scene' && v.sceneId === 'K19');
    const winning = at19(won.choices);
    expect(winning).toMatchObject({ kind: 'scene', variant: 0 });
    const shown = sceneText(charles.text, 'K19', winning?.kind === 'scene' ? winning.variant : undefined);
    expect(shown.narration).toMatch(/^The war is won\./);

    const lost = cases.find((c) => c.name.endsWith('_historical'))!;
    const losing = at19(lost.choices);
    expect(losing).toMatchObject({ kind: 'scene', variant: 1 });
    expect(sceneText(charles.text, 'K19', 1).narration).toMatch(/^Oxford is surrounded/);
  });
});

describe("Charles's meters", () => {
  const meters = visibleMeters(charles.ui);
  const byId = (id: string) => meters.find((m) => m.id === id)!;

  it('shows Treasury, Parliament, Church, Army and Majesty, and never Scotland, Ireland or Distrust', () => {
    expect(meters.map((m) => m.id)).toEqual(['treasury', 'parliament', 'church', 'army', 'majesty']);
    for (const hidden of ['scotland', 'ireland', 'distrust']) {
      expect(charles.ui.meters.find((m) => m.id === hidden)?.visible).toBe(false);
      expect(charles.text.meters[hidden]).toBeUndefined();
    }
  });

  it('shows Church as a two-sided gauge, Puritan to high church, in danger below 20 and above 80', () => {
    expect(byId('church')).toMatchObject({ style: 'balance', warnBelow: 20, warnAbove: 80 });
    expect(charles.text.meters.church).toMatchObject({ left: 'Puritan', right: 'High church' });
    // The rules fail at 10 or below and 90 or above.
    expect(charles.rules.failures).toEqual(
      expect.arrayContaining([
        { if: [['church', '>=', 90]], end: 'no_popery' },
        { if: [['church', '<=', 10]], end: 'saints_rule' },
      ]),
    );
  });

  it("shows Army's danger only while the war is on, and Majesty never", () => {
    const start = session.start(charles.rules, charles.ui).run.state;
    const atWar = { ...start, flags: { ...start.flags, war: true } };
    expect(meterForState(byId('army'), start).warnBelow).toBeUndefined();
    expect(meterForState(byId('army'), atWar).warnBelow).toBe(20);
    expect(byId('majesty').warnBelow).toBeUndefined();
    expect(charles.rules.failures.some((f) => f.if.some(([v]) => v === 'majesty'))).toBe(false);
  });
});

describe('unlocking and rewards', () => {
  it('unlocks like Caesar: after any ending as the ruler before (Caesar)', () => {
    expect(charles.unlockedBy).toBe('julius-caesar');
    expect(rulerUnlocked(charles, emptyProfile)).toBe(false);
    const caesar = getRuler('julius-caesar');
    const record = applyRunResult(emptyRulerProfile, { ending: 'ides', score: 17.5, decisions: [], finishedAt: AT }).profile;
    expect(rulerUnlocked(charles, withRulerProfile(emptyProfile, caesar.rules.ruler, record))).toBe(true);
    expect(rulerUnlocked(charles, emptyProfile, true)).toBe(true);
  });

  it('earns XP at the tier 3 multiplier, 1.5, and gold from every ending', () => {
    expect(rulerTier('charles-i')).toBe(1.5);
    expect(Object.keys(progression.currency.endings['charles-i']).sort()).toEqual(Object.keys(charles.rules.endings).sort());
    // The historical path, first time: (23 x 10 + 100) x 1.5 = 495 XP; the axe is rare, 80 x 1.5 = 120 gold.
    const historical = cases.find((c) => c.name.endsWith('_historical'))!;
    const rewards = applyRunRewards(
      emptyProgression,
      'charles-i',
      'r1',
      { ending: 'axe', decisions: historical.expected.decisions },
      emptyRulerProfile,
    );
    expect([rewards.breakdown.totalXp, rewards.breakdown.gold]).toEqual([495, 120]);
  });
});
