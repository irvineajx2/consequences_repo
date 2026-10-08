import type { Rules } from '../core';

/** Every image id the rules refer to: scenes, endings and story beats. */
export function referencedImageIds(rules: Rules): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const scene of rules.scenes) ids.add(scene.image);
  for (const ending of Object.values(rules.endings)) ids.add(ending.image);
  for (const beat of Object.values(rules.beats)) ids.add(beat.image);
  return ids;
}
