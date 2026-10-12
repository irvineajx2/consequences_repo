// Identifiers for runs, so each run's rewards are applied exactly once. Not game logic: ids never
// affect play, only bookkeeping.

let counter = 0;

/** A new id, unique on this device: the start time plus a counter for runs started in the same ms. */
export function newRunId(now: number = Date.now()): string {
  counter = (counter + 1) % 1296;
  return `${now.toString(36)}-${counter.toString(36).padStart(2, '0')}`;
}
