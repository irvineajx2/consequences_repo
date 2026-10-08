import { allOptions, loadRules, RulesError } from '../../src/core';
import { rawRules, rules } from './helpers';

describe('rules file', () => {
  it('loads with 17 scenes and 13 endings', () => {
    expect(rules.scenes).toHaveLength(17);
    expect(Object.keys(rules.endings)).toHaveLength(13);
  });

  it('gives every scene and ending an image id', () => {
    for (const scene of rules.scenes) expect(scene.image).toEqual(expect.any(String));
    for (const ending of Object.values(rules.endings)) expect(ending.image).toEqual(expect.any(String));
  });

  it('has unique option ids within each scene variant', () => {
    for (const scene of rules.scenes) {
      const groups = scene.variants ? scene.variants.map((v) => v.options ?? []) : [scene.options ?? []];
      for (const options of groups) {
        const ids = options.map((o) => o.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('only references endings and events that exist', () => {
    const endings = new Set(Object.keys(rules.endings));
    const referenced = [
      ...rules.failures.map((f) => f.end),
      ...rules.finale.outcomes.map((o) => o.end),
      ...rules.scenes.flatMap((s) => allOptions(s).flatMap((o) => (o.end ? [o.end] : []))),
    ];
    for (const id of referenced) expect(endings).toContain(id);
    for (const scene of rules.scenes) {
      for (const eventId of scene.after ?? []) expect(Object.keys(rules.events)).toContain(eventId);
    }
  });

  it('rejects a missing ending with a clear error', () => {
    const broken = JSON.parse(JSON.stringify(rawRules));
    broken.failures[0].end = 'no_such_ending';
    expect(() => loadRules(broken)).toThrow(RulesError);
    expect(() => loadRules(broken)).toThrow(/unknown ending "no_such_ending"/);
  });

  it('rejects a missing event with a clear error', () => {
    const broken = JSON.parse(JSON.stringify(rawRules));
    broken.scenes[0].after = ['no_such_event'];
    expect(() => loadRules(broken)).toThrow(/unknown event "no_such_event"/);
  });
});
