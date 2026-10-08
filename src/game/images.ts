import type { Rules } from '../core';

/** Every image id the rules refer to: scenes, endings and event branches. */
export function referencedImageIds(rules: Rules): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const scene of rules.scenes) ids.add(scene.image);
  for (const ending of Object.values(rules.endings)) ids.add(ending.image);
  for (const event of Object.values(rules.events)) {
    for (const id of event.image_by_branch ?? []) if (id) ids.add(id);
  }
  return ids;
}
