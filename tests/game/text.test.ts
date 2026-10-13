import { allOptions } from '../../src/core';
import { getRuler, rulers } from '../../src/data/rulers';
import { autoNarration, consequenceText, optionText } from '../../src/game/text';

const { rules, text, ui } = getRuler('elizabeth-i');

describe('text file', () => {
  it('has a caption and narration for every scene', () => {
    for (const scene of rules.scenes) {
      expect(text.scenes[scene.id]?.caption).toEqual(expect.any(String));
      expect(text.scenes[scene.id]?.narration).toEqual(expect.any(String));
    }
  });

  it('has option and consequence text for every option in every variant', () => {
    for (const scene of rules.scenes) {
      const variants = scene.variants ?? [{ options: scene.options }];
      variants.forEach((variant, index) => {
        for (const option of variant.options ?? []) {
          expect(optionText(text, scene.id, index, option.id)).not.toMatch(/^\[Missing text/);
          expect(consequenceText(text, scene.id, index, option.id)).toEqual(expect.any(String));
        }
      });
    }
  });

  it('has a caption and text for every beat, and no unknown beats', () => {
    for (const id of Object.keys(rules.beats)) {
      expect(text.beats[id]?.caption).toEqual(expect.any(String));
      expect(text.beats[id]?.caption).not.toBe(id);
      expect(text.beats[id]?.text).toEqual(expect.any(String));
    }
    for (const id of Object.keys(text.beats)) expect(Object.keys(rules.beats)).toContain(id);
  });

  it('has a chronicle note for every scene, and no unknown scenes', () => {
    for (const scene of rules.scenes) expect(text.chronicle[scene.id]?.note).toEqual(expect.any(String));
    for (const id of Object.keys(text.chronicle)) expect(rules.scenes.map((s) => s.id)).toContain(id);
  });

  it('has auto narration for every scene that can play in auto mode', () => {
    const autoScenes = rules.scenes.filter((s) => s.variants?.some((v) => v.auto));
    expect(autoScenes.length).toBeGreaterThan(0);
    for (const scene of autoScenes) {
      expect(text.scenes[scene.id].auto_narration).toEqual(expect.any(String));
      scene.variants!.forEach((v, i) => {
        if (v.auto) {
          expect(autoNarration(text, scene.id, i, v.options![0].id)).toBe(text.scenes[scene.id].auto_narration);
        }
      });
    }
  });

  it('gives auto narration only to scenes that can play in auto mode', () => {
    for (const [id, scene] of Object.entries(text.scenes)) {
      if (scene.auto_narration === undefined) continue;
      expect(rules.scenes.find((s) => s.id === id)?.variants?.some((v) => v.auto)).toBe(true);
    }
  });

  it('has the ruler’s name, subtitle and tagline', () => {
    for (const key of ['name', 'short_name', 'subtitle', 'tagline'] as const) {
      expect(text.ruler[key]).toEqual(expect.any(String));
      expect(text.ruler[key]).not.toMatch(/to be written/);
    }
  });

  it('has prologue text when ui.json has a prologue', () => {
    expect(ui.prologue).toBeDefined();
    expect(text.prologue.caption).toEqual(expect.any(String));
    expect(text.prologue.text).toEqual(expect.any(String));
  });

  it('has a title, years and text for every era in ui.json, and no unknown eras', () => {
    const ids = (ui.eras ?? []).map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(text.eras[id]?.title).toEqual(expect.any(String));
      expect(text.eras[id]?.years).toEqual(expect.any(String));
      expect(text.eras[id]?.text).toEqual(expect.any(String));
    }
    for (const id of Object.keys(text.eras)) expect(ids).toContain(id);
  });

  it('has a title and text for every ending', () => {
    for (const id of Object.keys(rules.endings)) {
      expect(text.endings[id]?.title).toEqual(expect.any(String));
      expect(text.endings[id]?.text).toEqual(expect.any(String));
    }
  });

  it('has no ids that rules.json lacks', () => {
    const scenes = new Map(rules.scenes.map((s) => [s.id, s]));
    for (const [sceneId, entry] of Object.entries(text.scenes)) {
      const scene = scenes.get(sceneId);
      expect(scene).toBeDefined();
      const optionIds = allOptions(scene!).map((o) => o.id);
      for (const id of Object.keys(entry.options)) expect(optionIds).toContain(id);
      for (const id of Object.keys(entry.consequences)) expect(optionIds).toContain(id);
      for (const [index, override] of Object.entries(entry.variants ?? {})) {
        const variant = scene!.variants?.[Number(index)];
        expect(variant).toBeDefined();
        const variantIds = (variant!.options ?? []).map((o) => o.id);
        for (const id of Object.keys(override.options ?? {})) expect(variantIds).toContain(id);
        for (const id of Object.keys(override.consequences ?? {})) expect(variantIds).toContain(id);
      }
    }
    for (const id of Object.keys(text.endings)) expect(Object.keys(rules.endings)).toContain(id);
  });

  it('uses the variant-specific label where one exists', () => {
    const scene = rules.scenes.find((s) => s.variants?.some((v, i) => text.scenes[s.id].variants?.[i]));
    if (!scene) return;
    for (const [index, override] of Object.entries(text.scenes[scene.id].variants ?? {})) {
      for (const [id, label] of Object.entries(override.options ?? {})) {
        expect(optionText(text, scene.id, Number(index), id)).toBe(label);
      }
    }
  });
});

describe.each(rulers.map((r) => [r.id, r] as const))('%s text', (_id, ruler) => {
  const { rules: r, text: t, ui: u } = ruler;
  const optionsOf = (scene: (typeof r.scenes)[number]) =>
    (scene.variants ?? [{ options: scene.options }]).flatMap((v, i) => (v.options ?? []).map((o) => ({ o, i })));

  it('has a caption and narration for every scene', () => {
    for (const scene of r.scenes) {
      expect(t.scenes[scene.id]?.caption).toEqual(expect.any(String));
      expect(t.scenes[scene.id]?.narration).toEqual(expect.any(String));
    }
  });

  it('labels every option, and gives every option that does not end the run a consequence', () => {
    for (const scene of r.scenes) {
      for (const { o, i } of optionsOf(scene)) {
        expect(optionText(t, scene.id, i, o.id)).not.toMatch(/^\[Missing text/);
        // An option ends the run if it has `end`, or every branch of one of its conds ends it.
        const alwaysEnds =
          o.end !== undefined || (o.cond ?? []).some((c) => c.then.end !== undefined && c.else?.end !== undefined);
        if (!alwaysEnds) expect(consequenceText(t, scene.id, i, o.id)).toEqual(expect.any(String));
      }
    }
  });

  it('has a chronicle note for every main scene and none for branch scenes', () => {
    for (const scene of r.scenes) {
      if (scene.branch) expect(t.chronicle[scene.id]).toBeUndefined();
      else expect(t.chronicle[scene.id]?.note).toEqual(expect.any(String));
    }
  });

  it('has text for every beat, ending, era, the prologue and the ruler', () => {
    for (const id of Object.keys(r.beats)) expect(t.beats[id]?.text).toEqual(expect.any(String));
    for (const id of Object.keys(r.endings)) {
      expect(t.endings[id]?.title).toEqual(expect.any(String));
      expect(t.endings[id]?.text).toEqual(expect.any(String));
    }
    for (const era of u.eras ?? []) {
      for (const id of [era.id, ...(era.variants ?? []).map((v) => v.id)]) {
        expect(t.eras[id]?.title).toEqual(expect.any(String));
        expect(t.eras[id]?.text).toEqual(expect.any(String));
      }
    }
    if (u.prologue) expect(t.prologue.text).toEqual(expect.any(String));
    for (const key of ['name', 'short_name', 'subtitle', 'tagline'] as const) {
      expect(t.ruler[key]).toEqual(expect.any(String));
    }
  });

  it('gives variant narration only to variants that exist and show options', () => {
    for (const scene of r.scenes) {
      for (const [index, v] of Object.entries(t.scenes[scene.id]?.variants ?? {})) {
        if (v.narration === undefined) continue;
        const variant = scene.variants?.[Number(index)];
        expect([scene.id, index, variant?.skip ?? false]).toEqual([scene.id, index, false]);
        expect(variant?.options?.length).toBeGreaterThan(0);
      }
    }
  });

  it('has no text for ids the rules lack', () => {
    const scenes = r.scenes.map((s) => s.id);
    for (const id of Object.keys(t.scenes)) expect(scenes).toContain(id);
    for (const id of Object.keys(t.chronicle)) expect(scenes).toContain(id);
    for (const id of Object.keys(t.beats)) expect(Object.keys(r.beats)).toContain(id);
    for (const id of Object.keys(t.endings)) expect(Object.keys(r.endings)).toContain(id);
  });
});

describe('option labels', () => {
  const caesar = getRuler('julius-caesar');

  it("show the text's label when it gives one", () => {
    expect(optionText(caesar.text, 's02', 0, 'mercy')).toBe('Argue for prison, not execution');
    expect(optionText(caesar.text, 's17', 0, 'pardon')).toBe('Pardon them, Brutus and Cassius included');
  });

  it("fall back to the rules label otherwise, per variant", () => {
    const withdraw = caesar.rules.scenes[0].options!.find((o) => o.id === 'withdraw')!;
    expect(optionText(caesar.text, 's01', 0, 'withdraw')).toBe(withdraw.label);
    const b01 = caesar.rules.scenes.find((s) => s.id === 'b01')!;
    expect(optionText(caesar.text, 'b01', 1, 'flee')).toBe(b01.variants![1].options![1].label);
  });

  it("keep Elizabeth's variant-specific labels", () => {
    expect(optionText(text, 's09', 0, 'spare')).toBe('Spare both');
    expect(optionText(text, 's09', 1, 'spare')).toBe('Spare Norfolk');
  });

  it('take ending titles from the text, then the rules, then a title made from the id', () => {
    expect(text.endings.gloriana.title).toBe('Gloriana');
    expect(caesar.rules.endings.pater_patriae.title).toBeUndefined();
    expect(caesar.text.endings.pater_patriae.title).toBe('Pater Patriae');
    expect(caesar.text.endings.ides.title).toBe('Ides');
  });
});
