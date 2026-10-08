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

  it('gives every beat an image id and only references beats that exist', () => {
    const beats = Object.keys(rules.beats);
    for (const beat of Object.values(rules.beats)) expect(beat.image).toEqual(expect.any(String));
    const referenced = [
      ...(rules.finale.beats ?? []),
      ...Object.values(rules.events).flatMap((e) => e.branches.flatMap((b) => (b.beat ? [b.beat] : []))),
      ...rules.scenes.flatMap((s) => allOptions(s).flatMap((o) => o.beats ?? [])),
    ];
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(beats).toContain(id);
  });

  it('rejects a missing beat with a clear error', () => {
    const broken = JSON.parse(JSON.stringify(rawRules));
    broken.finale.beats = ['no_such_beat'];
    expect(() => loadRules(broken)).toThrow(/unknown beat "no_such_beat"/);
    const brokenEvent = JSON.parse(JSON.stringify(rawRules));
    Object.values(brokenEvent.events as Record<string, { branches: { beat?: string }[] }>)[0].branches[0].beat =
      'no_such_beat';
    expect(() => loadRules(brokenEvent)).toThrow(/unknown beat "no_such_beat"/);
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
