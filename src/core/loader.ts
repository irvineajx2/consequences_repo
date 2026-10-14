import type { BranchEffect, Condition, Effect, FinaleTerm, Option, Rules, Scene } from './rules';

export class RulesError extends Error {
  constructor(message: string) {
    super(`Invalid rules: ${message}`);
    this.name = 'RulesError';
  }
}

const REQUIRED_KEYS = [
  'ruler',
  'version',
  'meters',
  'meter_range',
  'flags',
  'failures',
  'drift',
  'events',
  'beats',
  'finale',
  'endings',
  'scenes',
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every option a scene can offer, across all variants. */
export function allOptions(scene: Scene): readonly Option[] {
  if (scene.variants) return scene.variants.flatMap((v) => v.options ?? []);
  return scene.options ?? [];
}

/**
 * Takes the parsed rules JSON and returns typed rules. Throws a RulesError if the shape is wrong
 * or if any referenced ending, event, beat, scene, meter or flag does not exist.
 */
export function loadRules(json: unknown): Rules {
  if (!isObject(json)) throw new RulesError('expected an object');
  for (const key of REQUIRED_KEYS) {
    if (!(key in json)) throw new RulesError(`missing "${key}"`);
  }
  if (!Array.isArray(json.scenes) || json.scenes.length === 0) {
    throw new RulesError('"scenes" must be a non-empty list');
  }
  const rules = json as unknown as Rules;

  const meters = new Set(Object.keys(rules.meters));
  const flags = new Set(Object.keys(rules.flags));
  const endings = new Set(Object.keys(rules.endings));
  const sceneIds = new Set<string>();

  const checkEnding = (id: string, where: string): void => {
    if (!endings.has(id)) throw new RulesError(`${where} references unknown ending "${id}"`);
  };
  const checkBeats = (ids: readonly string[] | undefined, where: string): void => {
    for (const id of ids ?? []) {
      if (!(id in rules.beats)) throw new RulesError(`${where} references unknown beat "${id}"`);
    }
  };
  const checkCondition = (cond: Condition | undefined, where: string): void => {
    for (const [name] of cond ?? []) {
      if (!meters.has(name) && !flags.has(name)) {
        throw new RulesError(`${where} tests unknown variable "${name}"`);
      }
    }
  };
  const checkEffect = (effect: Effect | undefined, where: string): void => {
    for (const name of Object.keys(effect?.add ?? {})) {
      if (!meters.has(name)) throw new RulesError(`${where} adds to unknown meter "${name}"`);
    }
    for (const name of Object.keys(effect?.set ?? {})) {
      if (!flags.has(name)) throw new RulesError(`${where} sets unknown flag "${name}"`);
    }
  };

  const checkTerms = (terms: readonly FinaleTerm[], where: string): void => {
    terms.forEach((t, i) => {
      if ('var' in t) {
        const numericFlag = typeof rules.flags[t.var] === 'number';
        if (!meters.has(t.var) && !numericFlag) {
          throw new RulesError(`${where} term ${i} uses unknown or non-numeric variable "${t.var}"`);
        }
      } else {
        checkCondition(t.if, `${where} term ${i}`);
      }
    });
  };
  const checkBranchEffect = (effect: BranchEffect | undefined, where: string): void => {
    if (effect?.end !== undefined) checkEnding(effect.end, where);
    checkEffect(effect, where);
  };

  rules.failures.forEach((f, i) => {
    checkEnding(f.end, `failures[${i}]`);
    checkCondition(f.if, `failures[${i}]`);
  });
  rules.drift.forEach((d, i) => {
    checkCondition(d.if, `drift[${i}]`);
    checkEffect(d.then, `drift[${i}]`);
  });
  for (const [id, beat] of Object.entries(rules.beats)) {
    if (typeof beat?.image !== 'string') throw new RulesError(`beat "${id}" has no image`);
  }
  for (const [id, event] of Object.entries(rules.events)) {
    event.branches.forEach((b, i) => {
      const where = `event "${id}" branch ${i}`;
      checkCondition(b.if, where);
      checkEffect(b.then, where);
      if (b.end !== undefined) checkEnding(b.end, where);
      if (b.score) checkTerms(b.score.terms, `${where} score`);
      if (b.beat !== undefined) checkBeats([b.beat], where);
    });
  }
  (rules.finale.beats ?? []).forEach((b, i) => {
    if (typeof b === 'string') return checkBeats([b], 'finale');
    checkBeats([b.beat], `finale beat ${i}`);
    checkCondition(b.if, `finale beat ${i}`);
  });
  rules.finale.outcomes.forEach((o, i) => {
    checkEnding(o.end, `finale outcome ${i}`);
    checkCondition(o.if, `finale outcome ${i}`);
  });
  checkTerms(rules.finale.terms, 'finale');
  if (rules.early_finale) checkCondition(rules.early_finale.if, 'early_finale');

  for (const scene of rules.scenes) {
    const where = `scene "${scene.id}"`;
    if (sceneIds.has(scene.id)) throw new RulesError(`duplicate scene id "${scene.id}"`);
    sceneIds.add(scene.id);
    if (!scene.options === !scene.variants) {
      throw new RulesError(`${where} must have exactly one of "options" or "variants"`);
    }
    for (const eventId of scene.after ?? []) {
      if (!(eventId in rules.events)) {
        throw new RulesError(`${where} references unknown event "${eventId}"`);
      }
    }
    (scene.scene_cond ?? []).forEach((c, i) => {
      checkCondition(c.if, `${where} scene_cond ${i}`);
      checkEffect(c.then, `${where} scene_cond ${i}`);
    });
    for (const v of scene.variants ?? []) {
      checkCondition(v.if, `${where} variant`);
      if (v.image !== undefined && typeof v.image !== 'string') throw new RulesError(`${where} has a variant with a bad image`);
      if (!v.skip && (!v.options || v.options.length === 0)) {
        throw new RulesError(`${where} has a variant with no options`);
      }
    }
    for (const option of allOptions(scene)) {
      const at = `${where} option "${option.id}"`;
      if (option.end !== undefined) checkEnding(option.end, at);
      checkEffect(option, at);
      checkBeats(option.beats, at);
      (option.cond ?? []).forEach((c, i) => {
        checkCondition(c.if, `${at} cond ${i}`);
        checkBranchEffect(c.then, `${at} cond ${i}`);
        checkBranchEffect(c.else, `${at} cond ${i}`);
      });
    }
  }
  if (rules.early_finale && !sceneIds.has(rules.early_finale.until_scene)) {
    throw new RulesError(`early_finale references unknown scene "${rules.early_finale.until_scene}"`);
  }

  return rules;
}
