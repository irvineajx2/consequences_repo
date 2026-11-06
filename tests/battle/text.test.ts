// Content lint for battle text: every id the battle's data names has its text, result lines carry
// their {sector} placeholder, and lengths stay within the longest text of the same kind already
// shipping for the rulers (the repo has no written budgets; Task 13 measured the same way).
import { rulers } from '../../src/data/rulers';
import { alesia } from './helpers';

const { data } = alesia.battle;
const { text } = alesia;

describe('Alesia text', () => {
  it('has a name and description for every sector and the camp', () => {
    for (const s of data.sectors) {
      expect(text.sectors[s]?.name).toEqual(expect.any(String));
      expect(text.sectors[s]?.desc).toEqual(expect.any(String));
    }
  });

  it('has a label and description for every move in every phase, and a title and text for every phase', () => {
    for (const [phase, p] of Object.entries(data.phases)) {
      expect(text.phases[phase]).toMatchObject({ title: expect.any(String), caption: expect.any(String), text: expect.any(String) });
      for (const m of p.moves) expect(text.moves[m]).toMatchObject({ label: expect.any(String), desc: expect.any(String) });
    }
  });

  it('has narration, options and consequences for every scene', () => {
    for (const [id, scene] of Object.entries(data.scenes)) {
      expect(text.scenes[id]).toMatchObject({ caption: expect.any(String), narration: expect.any(String) });
      for (const o of scene.options) {
        expect(text.scenes[id].options[o]).toEqual(expect.any(String));
        expect(text.scenes[id].consequences[o]).toEqual(expect.any(String));
      }
    }
  });

  it('has a title and text for every ending and unlockable, and a name, reveal and clue for every plan', () => {
    for (const e of [...data.outcomes.early, ...data.outcomes.final]) expect(text.endings[e]).toMatchObject({ title: expect.any(String), text: expect.any(String) });
    for (const u of data.unlockables) expect(text.unlockables[u]).toMatchObject({ title: expect.any(String), text: expect.any(String) });
    for (const p of data.plans) expect(text.plans[p]).toMatchObject({ name: expect.any(String), reveal: expect.any(String), clue: expect.any(String) });
  });

  it('has a result line with a {sector} placeholder for every result, and a grade for every medal', () => {
    for (const r of ['breach', 'strained', 'held', 'easy', 'none']) expect(text.results[r]).toContain('{sector}');
    for (const g of ['gold', 'silver', 'bronze', 'none']) expect(text.grades[g]).toEqual(expect.any(String));
    for (const r of ['grain', 'morale', 'allies']) expect(text.resources[r]).toEqual(expect.any(String));
    for (const pool of ['cohorts', 'cavalry', 'reserve', 'patrol']) expect(text.pools[pool]).toEqual(expect.any(String));
    expect(text.battle.real_result).toEqual(expect.any(String));
  });

  it('keeps each kind of text within the longest of its kind the rulers ship (known overruns listed)', () => {
    const longest: Record<string, number> = {};
    const note = (kind: string, s: unknown) => {
      if (typeof s === 'string') longest[kind] = Math.max(longest[kind] ?? 0, s.length);
    };
    for (const r of rulers) {
      const t = r.text;
      note('tagline', t.ruler.tagline);
      note('intro', t.prologue.text);
      for (const e of Object.values(t.eras)) note('phase', e.text);
      for (const s of Object.values(t.scenes)) {
        note('caption', s.caption);
        note('narration', s.narration);
      }
      // Ending titles are left out: most rulers' are made from their ids, so they set no budget.
      for (const e of Object.values(t.endings)) note('ending', e.text);
    }
    const battleText: [string, string, string][] = [
      ['tagline', 'card', text.battle.card],
      ['intro', 'intro', text.battle.intro],
      ...Object.entries(text.phases).map(([id, p]): [string, string, string] => ['phase', `phase ${id}`, p.text]),
      ...Object.entries(text.scenes).flatMap(([id, s]): [string, string, string][] => [
        ['caption', id, s.caption],
        ['narration', id, s.narration],
      ]),
      ...Object.entries(text.plans).map(([id, p]): [string, string, string] => ['narration', `${id} clue`, p.clue]),
      ...Object.entries({ ...text.endings, ...text.unlockables }).map(([id, e]): [string, string, string] => ['ending', id, e.text]),
      ...Object.entries(text.plans).map(([id, p]): [string, string, string] => ['ending', `${id} reveal`, p.reveal]),
    ];
    const over = battleText.filter(([kind, , s]) => s.length > longest[kind]).map(([kind, id]) => `${kind}: ${id}`);
    // Over the rulers' longest, reported for AJ (Task 17 report); new overruns fail.
    expect(over.sort()).toEqual(['phase: phase 1', 'phase: phase 5', 'tagline: card']);
  });
});
