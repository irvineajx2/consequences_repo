import { allOptions } from '../../src/core';
import { chronicleBook, endingsGallery, historicalChoice, runChronicle } from '../../src/game/chronicle';
import { applyRunResult, emptyRulerProfile } from '../../src/game/profile';
import { goldenCases, rules } from '../core/helpers';

const byName = (name: string) => goldenCases.find((c) => c.name === name)!;
const historicalIds = (sceneId: string) =>
  allOptions(rules.scenes.find((s) => s.id === sceneId)!)
    .filter((o) => o.historical)
    .map((o) => o.id);

describe('end-of-run chronicle', () => {
  it('shows 17 of 17 matched and all newly discovered on the historical path', () => {
    const { expected } = byName('historical_path');
    const scenes = expected.decisions.map((d) => d.scene);
    const chronicle = runChronicle(rules, expected.decisions, scenes);
    expect(chronicle).toMatchObject({ matched: 17, total: 17 });
    for (const row of chronicle.rows) expect(row).toMatchObject({ matched: true, newlyDiscovered: true });
  });

  it('never includes the historical option for an unmatched decision', () => {
    for (const c of goldenCases) {
      const chronicle = runChronicle(rules, c.expected.decisions, []);
      for (const [i, row] of chronicle.rows.entries()) {
        const decision = c.expected.decisions[i];
        // A row names only the player's own option.
        expect(Object.keys(row).sort()).toEqual(['auto', 'matched', 'newlyDiscovered', 'optionId', 'sceneId', 'variant']);
        expect(row.optionId).toBe(decision.option);
        if (!row.matched && !row.auto) {
          expect(historicalIds(row.sceneId)).not.toContain(row.optionId);
          expect(JSON.stringify(row)).not.toMatch(new RegExp(`"(${historicalIds(row.sceneId).join('|')})"`));
        }
      }
    }
  });

  it('counts only non-auto decisions and never matches an auto one', () => {
    const c = goldenCases.find((g) => g.expected.decisions.some((d) => d.auto))!;
    const chronicle = runChronicle(rules, c.expected.decisions, []);
    expect(chronicle.total).toBe(c.expected.decisions.filter((d) => !d.auto).length);
    expect(chronicle.matched).toBe(c.expected.historical_matches);
    for (const row of chronicle.rows.filter((r) => r.auto)) expect(row.matched).toBe(false);
  });

  it('records the variant each decision was made in', () => {
    const { expected } = byName('historical_path');
    const s09 = runChronicle(rules, expected.decisions, []).rows.find((r) => r.sceneId === 's09');
    expect(s09?.variant).toBe(0); // Mary captive
  });

  it('marks as newly discovered only the scenes this run discovered', () => {
    const { expected } = byName('historical_path');
    const chronicle = runChronicle(rules, expected.decisions, ['s03']);
    expect(chronicle.rows.filter((r) => r.newlyDiscovered).map((r) => r.sceneId)).toEqual(['s03']);
  });
});

describe('Chronicle book', () => {
  it('counts 17 scenes with a historical choice, all undiscovered at first', () => {
    const book = chronicleBook(rules, emptyRulerProfile);
    expect(book).toMatchObject({ discovered: 0, total: 17 });
    for (const e of book.entries) expect(e.choice).toBeNull();
  });

  it('reveals every choice after the historical path', () => {
    const { expected } = byName('historical_path');
    const profile = applyRunResult(emptyRulerProfile, { ending: 'gloriana', score: 120, decisions: expected.decisions, finishedAt: 'x' }).profile;
    const book = chronicleBook(rules, profile);
    expect(book).toMatchObject({ discovered: 17, total: 17 });
    for (const e of book.entries) expect(historicalIds(e.sceneId)).toContain(e.choice?.optionId);
  });

  it('keeps diverging scenes undiscovered', () => {
    const c = goldenCases.find((g) => g.name.startsWith('random_') && g.expected.decisions.some((d) => !d.historical))!;
    const profile = applyRunResult(emptyRulerProfile, { ending: c.expected.ending, score: c.expected.score, decisions: c.expected.decisions, finishedAt: 'x' }).profile;
    const book = chronicleBook(rules, profile);
    for (const d of c.expected.decisions.filter((x) => !x.historical)) {
      expect(book.entries.find((e) => e.sceneId === d.scene)?.choice).toBeNull();
    }
  });

  it('uses the choice scene variant for the ruler’s choice, never an auto one', () => {
    expect(historicalChoice(rules, 's15')).toEqual({ optionId: 'execute', variant: 3 });
    expect(historicalChoice(rules, 's09')).toEqual({ optionId: 'norfolk', variant: 0 });
  });
});

describe('endings gallery', () => {
  it('lists all 13 endings grouped by category, locked until reached', () => {
    const groups = endingsGallery(rules, emptyRulerProfile);
    expect(groups.map((g) => g.category)).toEqual(['historical', 'outperformed', 'fallen_short', 'fallen', 'alternate']);
    const all = groups.flatMap((g) => g.endings);
    expect(all).toHaveLength(13);
    for (const e of all) expect(e.record).toBeNull();
  });

  it('unlocks a reached ending with its count and best score', () => {
    const { expected } = byName('historical_path');
    const profile = applyRunResult(emptyRulerProfile, { ending: 'gloriana', score: 120, decisions: expected.decisions, finishedAt: 'x' }).profile;
    const gloriana = endingsGallery(rules, profile).flatMap((g) => g.endings).find((e) => e.id === 'gloriana');
    expect(gloriana?.record).toEqual({ timesReached: 1, bestScore: 120 });
  });
});
