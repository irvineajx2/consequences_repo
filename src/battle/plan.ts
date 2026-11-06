// The enemy's hidden plan, chosen when a battle starts from a seed stored with the run, so a saved
// battle resumes against the same plan. Deterministic: the same seed always gives the same plan.
// Pure TypeScript.

/** FNV-1a: a small, stable string hash. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The plan a seed picks from a battle's plans. */
export function planForSeed(seed: string, plans: readonly string[]): string {
  if (plans.length === 0) throw new Error('A battle needs at least one plan');
  return plans[hashSeed(seed) % plans.length];
}
