// What each sector marker shows: men committed (as a share of the starting army), its works, and
// after a phase its result, with the values before the phase so the bars can settle. Pure.
import { type BattleModule, type BattleData, menPerBin, type Orders, type PhaseRecord } from '../../battle';
import type { SectorMarkerData } from './BattleMap';

/** Works bar scale: works of this much fill the bar. */
const WORKS_FULL = 2;

/** Markers while the player sets their orders. */
export function orderMarkers<S>(data: BattleData, module: BattleModule<S>, state: S, orders: Orders): SectorMarkerData[] {
  const total = data.pools.cohorts.total;
  const men = menPerBin(data.pools.cohorts, module.poolSize(state, 'cohorts'), orders.cohorts);
  return data.sectors.map((id) => {
    const cohorts = data.terrain[id] !== undefined ? (men[id] ?? 0) : (men.reserve ?? 0);
    const works = data.terrain[id] !== undefined ? module.works(state, id) : undefined;
    return {
      id,
      men: cohorts / total,
      cohorts,
      ...(works !== undefined ? { works: works / WORKS_FULL, worksValue: works } : {}),
    };
  });
}

/** Markers after a phase: its results, with the bars settling from before to after. */
export function reportMarkers<S>(data: BattleData, module: BattleModule<S>, record: PhaseRecord<S>): SectorMarkerData[] {
  const before = orderMarkers(data, module, record.stateBefore, record.orders);
  const after = orderMarkers(data, module, record.stateAfter, record.orders);
  return after.map((m, i) => ({
    ...m,
    menBefore: before[i].men,
    ...(m.works !== undefined ? { worksBefore: before[i].works } : {}),
    ...(record.results[m.id] !== undefined ? { result: record.results[m.id] } : {}),
  }));
}
