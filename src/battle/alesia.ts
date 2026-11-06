// Alesia's own rules: its move and scene effects, its state and its outcome, as
// tools/battle_sim/battle.py (the specification) gives them. Tuning values come from battle.json; the
// numbers here are the effects battle.py writes as code. A second battle supplies its own module.
// Pure TypeScript.
import type { BattleData, BattleModule, SectorResult } from './types';

export interface AlesiaState {
  /** Cohorts left (the cohort pool's size). */
  readonly coh: number;
  /** Cavalry left (the cavalry pool's size). */
  readonly cav: number;
  readonly grain: number;
  readonly morale: number;
  readonly allies: number;
  /** The relief army's strength (100 at the start). */
  readonly relief: number;
  /** Alesia's hunger. */
  readonly hunger: number;
  /** Fortification per fighting sector. */
  readonly works: Readonly<Record<string, number>>;
  readonly breaches: number;
  readonly everbreach: boolean;
  /** Vercingetorix broke out. */
  readonly escaped: boolean;
  /** A sortie beat the relief army in the open. */
  readonly hunter: boolean;
  readonly clues: number;
  /** The Mandubii were let through. */
  readonly mandthrough: boolean;
  readonly feinted: boolean;
  /** Set by the last phase: the relief army destroyed. */
  readonly destroyed?: boolean;
  /** Set by the last phase: where the commander stood. */
  readonly cmd5?: string;
}

/** Starting values battle.json does not give (battle.py's play()). */
const START = { coh: 100, cav: 20, morale: 60, allies: 50, relief: 100, hunger: 40 } as const;

/** The moves that send the reserve to the commander's sector. */
const RESERVE_MOVES = ['shiftres', 'labienus', 'leadres'];

export function createAlesiaModule(data: BattleData): BattleModule<AlesiaState> {
  const t = data.tuning as unknown as {
    readonly wallBase: number;
    readonly startWorks: { readonly inner: number; readonly outer: number };
    readonly goldMinCohorts: number;
    readonly goldMinMorale: number;
    readonly buildGain: number;
    readonly breachMorale: number;
    readonly deathMorale: number;
    readonly startGrain: number;
    readonly upkeep: number;
  };
  const sectors = data.sectors.filter((s) => data.terrain[s] !== undefined);
  const outer = sectors.filter((s) => s !== 'inner');
  const mapWorks = (works: Readonly<Record<string, number>>, f: (k: string, v: number) => number) =>
    Object.fromEntries(Object.entries(works).map(([k, v]) => [k, f(k, v)]));

  return {
    initialState: () => ({
      ...START,
      grain: t.startGrain,
      works: Object.fromEntries(sectors.map((k) => [k, k === 'inner' ? t.startWorks.inner : t.startWorks.outer])),
      breaches: 0,
      everbreach: false,
      escaped: false,
      hunter: false,
      clues: 0,
      mandthrough: false,
      feinted: false,
    }),

    poolSize: (s, pool) => (pool === 'cohorts' ? s.coh : pool === 'cavalry' ? s.cav : 0),

    resource: (s, id) => {
      const values: Record<string, number> = { cohorts: s.coh, cavalry: s.cav, grain: s.grain, morale: s.morale, allies: s.allies };
      return values[id] ?? 0;
    },

    works: (s, sector) => s.works[sector] ?? 0,

    applySceneBefore(s, sceneId, choice) {
      if (sceneId === 'riders') {
        if (choice === 'chase') return { ...s, relief: s.relief - 10, morale: s.morale - 5, cav: s.cav - 4 };
        if (choice === 'terms') return { ...s, allies: s.allies + 15, relief: s.relief - 3, grain: s.grain - 5 };
        return s;
      }
      if (sceneId === 'mandubii') {
        if (choice === 'through') return { ...s, allies: s.allies + 10, mandthrough: true };
        if (choice === 'keepout') return { ...s, morale: s.morale - 5 };
        return { ...s, works: mapWorks(s.works, (_k, v) => v + 0.1), grain: s.grain - 15, allies: s.allies - 10 };
      }
      return s;
    },

    applyMoveBefore(s, ctx) {
      switch (ctx.move) {
        case 'build':
          return {
            ...s,
            works: mapWorks(s.works, (k, v) => (k !== 'inner' ? v + t.buildGain : v + t.buildGain / 2)),
            grain: s.grain - 5,
          };
        case 'forests':
          return { ...s, works: mapWorks(s.works, (_k, v) => v + 0.15), grain: s.grain - 4 };
        case 'forage':
          return { ...s, grain: s.grain + 25 };
        case 'scout':
          return { ...s, clues: s.clues + 1 };
        case 'harass':
          return { ...s, hunger: s.hunger + 10, morale: s.morale + 2 };
        default:
          return s;
      }
    },

    adjustPressure(s, ctx) {
      const press = ctx.pressure;
      const rel = s.relief / 100;
      for (const k of outer) press[k] *= rel;
      press.inner *= 1 - (s.hunger - 40) / 150;
      if (ctx.phase === 4 && s.mandthrough) press.inner *= 1.15;
      if (s.feinted && ctx.phase === 4) press.plain *= 0.8;
      if (ctx.move === 'light') press.plain *= 0.85;
      const next = ctx.move === 'feint' ? { ...s, feinted: true } : s;
      if (next.escaped) press.inner *= 0.3;
      return next;
    },

    useReserve(s, ctx) {
      // The reserve goes where the commander stands; Labienus's veterans fight a little harder.
      if (RESERVE_MOVES.includes(ctx.move) && sectors.includes(ctx.commander)) {
        ctx.men[ctx.commander] += ctx.men.reserve * (ctx.move === 'labienus' ? 1.2 : 1.0);
        ctx.men.reserve = 0;
      }
      return s;
    },

    applySceneDuring(s, sceneId, choice, ctx) {
      if (sceneId !== 'crisis') return s;
      if (choice === 'sendlab' || choice === 'yourself') {
        // The scene reveals where the main blow falls: the sector most outmatched.
        let crisis = sectors[0];
        let worst = -Infinity;
        for (const k of sectors) {
          const gap = ctx.pressure[k] - ctx.men[k] * s.works[k] * data.terrain[k];
          if (gap > worst) {
            worst = gap;
            crisis = k;
          }
        }
        if (choice === 'sendlab') {
          ctx.men[crisis] += ctx.men.reserve * 0.5 * 1.2;
          ctx.men.reserve *= 0.5;
        } else {
          ctx.commander = crisis;
        }
        return s;
      }
      // Abandon Mont Réa: its attackers spill onto the north and the plain.
      ctx.pressure.north += ctx.pressure.rea * 0.5;
      ctx.pressure.plain += ctx.pressure.rea * 0.3;
      ctx.pressure.rea = 0;
      return { ...s, morale: s.morale - 10 };
    },

    defence(s, k, ctx) {
      const mf = 0.7 + s.morale / 200;
      let d = (ctx.men[k] + t.wallBase) * s.works[k] * data.terrain[k] * mf;
      if (k === 'plain') d += ctx.cavalry.plain * (ctx.move === 'german' ? 2.0 : 1.2);
      return d;
    },

    earlyEndingAfterFighting(s, ctx, res) {
      const breached = sectors.filter((k) => res[k] === 'breach');
      if (ctx.finalPhase && ctx.commander !== 'camp' && res[ctx.commander] === 'breach' && s.morale < t.deathMorale) return 'death';
      if (breached.includes('inner') && breached.some((k) => k !== 'inner')) return 'trapped';
      return null;
    },

    applyConsequences(s, ctx, res) {
      let next = s;
      for (const k of sectors) {
        const here = ctx.commander === k;
        if (res[k] === 'breach') {
          next = {
            ...next,
            coh: next.coh - 8,
            morale: next.morale - (here ? Math.floor(t.breachMorale / 2) : t.breachMorale),
            allies: next.allies - 5,
            everbreach: true,
            breaches: next.breaches + 1,
            escaped: next.escaped || (k === 'inner' && ctx.plan === 'breakout' && ctx.phase === 2),
          };
        } else if (res[k] === 'strained') {
          next = { ...next, coh: next.coh - 3, morale: next.morale - (here ? 2 : 5) };
        } else if (res[k] === 'held') {
          next = { ...next, morale: next.morale + 2 };
        }
      }
      return next;
    },

    applyMoveAfter(s, ctx, res) {
      if (ctx.move === 'sortie') {
        if (res.plain === 'easy' && ctx.cavalry.plain >= 12) return { ...s, relief: s.relief - 15, hunter: true, morale: s.morale + 5 };
        return { ...s, coh: s.coh - 8, morale: s.morale - 10 };
      }
      if (ctx.move === 'german' && (res.plain === 'held' || res.plain === 'easy')) return { ...s, relief: s.relief - 5, morale: s.morale + 5 };
      if (ctx.move === 'counter' && res.plain === 'easy') return { ...s, relief: s.relief - 10 };
      return s;
    },

    applyUpkeep(s, ctx) {
      let grain = s.grain - (t.upkeep + (s.mandthrough ? 6 : 0));
      // The long hunger raids foragers that patrols don't guard.
      if (ctx.plan === 'hunger' && ctx.cavalry.patrol < 12) grain -= 14;
      return { ...s, grain, hunger: s.hunger + 12, morale: Math.min(100, s.morale) };
    },

    earlyEndingAfterUpkeep(s) {
      if (s.morale <= 0) return 'army_breaks';
      if (s.grain <= 0) return 'siege_lifted';
      if (s.allies <= 0) return 'gaul_rises';
      return null;
    },

    finalOutcome(s, ctx, res) {
      if (sectors.some((k) => res[k] === 'breach')) return { outcome: 'stalemate', state: s };
      const held = (r: SectorResult) => r === 'held' || r === 'easy' || r === 'none';
      const destroyed = s.relief <= 40 || (ctx.move === 'cavround' && ctx.cavalry.reserve >= 12 && outer.every((k) => held(res[k])));
      const state = { ...s, destroyed, cmd5: ctx.commander };
      if (s.coh < 60 || s.morale < 25) return { outcome: 'bronze', state };
      // A decisive victory needs the army still strong; `destroyed` as recorded is unchanged.
      const decisive = destroyed && !(s.coh < t.goldMinCohorts || s.morale < t.goldMinMorale);
      return { outcome: decisive ? 'gold' : 'silver', state };
    },

    unlocks(outcome, s, sc, phasesCompleted) {
      const un: string[] = [];
      if (outcome === 'gold' || outcome === 'silver' || outcome === 'bronze') {
        if (
          outcome === 'gold' &&
          sc.riders === 'letgo' &&
          sc.mandubii === 'keepout' &&
          (sc.crisis === 'sendlab' || sc.crisis === 'yourself') &&
          sc.surrender === 'triumph' &&
          !s.escaped
        )
          un.push('throws_down_arms');
        if (s.cmd5 === 'rea' || sc.crisis === 'yourself') un.push('red_cloak');
        if (!s.everbreach) un.push('iron_ring');
        if (s.hunter) un.push('hunter_hunted');
        if (sc.mandubii === 'through' && sc.surrender === 'spare') un.push('clemency');
        if (s.escaped && s.destroyed) un.push('eagle_free');
      }
      if (outcome === 'trapped' && phasesCompleted >= 3) un.push('gaul_unbound');
      return un;
    },
  };
}

