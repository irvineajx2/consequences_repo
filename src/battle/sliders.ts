// Slider steps. A pool (cohorts, cavalry) is split across its bins in whole steps that always add up
// to the pool's step count, so the sliders always total 100%. A step is a share of the pool's
// current size, so when men are lost the sliders keep their shares and each step holds fewer men.
// Pure TypeScript.
import type { PoolData } from './types';

/** How many steps a pool has (its starting total over its starting step). */
export function stepCount(pool: PoolData): number {
  return Math.round(pool.total / pool.step);
}

/** The men in each bin: steps x (current size / step count). */
export function menPerBin(pool: PoolData, size: number, steps: readonly number[]): Record<string, number> {
  const unit = size / stepCount(pool);
  return Object.fromEntries(pool.bins.map((bin, i) => [bin, (steps[i] ?? 0) * unit]));
}

/** The reserve: the last bin, which takes up whatever the others leave. */
export function reserveIndex(pool: PoolData): number {
  return pool.bins.length - 1;
}

/** An even split, the remainder in the reserve. */
export function evenSteps(pool: PoolData): number[] {
  const n = stepCount(pool);
  const each = Math.floor(n / pool.bins.length);
  const steps = pool.bins.map(() => each);
  steps[reserveIndex(pool)] += n - each * pool.bins.length;
  return steps;
}

/**
 * Sets one bin to `value` steps, keeping the total. Raising a bin takes from the reserve first,
 * then from the largest other bin (the first, on a tie); lowering it returns the steps to the
 * reserve. The reserve itself is what is left, so it is not set directly.
 */
export function setBin(pool: PoolData, steps: readonly number[], index: number, value: number): number[] {
  const reserve = reserveIndex(pool);
  const next = [...steps];
  if (index === reserve || index < 0 || index >= next.length) return next;
  const target = Math.max(0, Math.min(stepCount(pool), Math.round(value)));
  let delta = target - next[index];
  if (delta <= 0) {
    next[index] = target;
    next[reserve] -= delta;
    return next;
  }
  const fromReserve = Math.min(delta, next[reserve]);
  next[reserve] -= fromReserve;
  next[index] += fromReserve;
  delta -= fromReserve;
  while (delta > 0) {
    let largest = -1;
    for (let i = 0; i < next.length; i++) {
      if (i === index || i === reserve || next[i] === 0) continue;
      if (largest === -1 || next[i] > next[largest]) largest = i;
    }
    if (largest === -1) break;
    next[largest] -= 1;
    next[index] += 1;
    delta -= 1;
  }
  return next;
}

/** A share of the pool as a whole percentage. */
export function percent(pool: PoolData, steps: number): number {
  return Math.round((steps / stepCount(pool)) * 100);
}
