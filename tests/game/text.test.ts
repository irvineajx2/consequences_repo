import { allOptions } from '../../src/core';
import { getRuler } from '../../src/data/rulers';
import { consequenceText, optionText } from '../../src/game/text';

const { rules, text } = getRuler('elizabeth-i');

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
