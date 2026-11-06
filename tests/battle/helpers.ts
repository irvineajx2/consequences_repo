import fixtureFile from '../../content/battles/alesia/fixtures.json';
import { nextStep, planForSeed, type Strategy } from '../../src/battle';
import { getBattle } from '../../src/data/battles';
import { act, type BattleSession, newBattleSession } from '../../src/game/battleSession';

export interface Fixture {
  readonly name: string;
  readonly plan: string;
  readonly strategy: Strategy;
  readonly outcome: string;
  readonly unlocks: readonly string[];
  readonly final: Readonly<Record<string, number | boolean>>;
}

export const fixtures = (fixtureFile as unknown as { fixtures: Fixture[] }).fixtures;
export const alesia = getBattle('alesia');

/** The first fixture reaching an outcome (and, if given, earning an unlockable). */
export function fixtureFor(outcome: string, unlock?: string): Fixture {
  const found = fixtures.find((f) => f.outcome === outcome && (unlock === undefined || f.unlocks.includes(unlock)));
  if (!found) throw new Error(`No fixture reaches ${outcome}`);
  return found;
}

/** A seed that picks the given plan. */
export function seedFor(plan: string): string {
  for (let i = 0; i < 1000; i++) if (planForSeed(`seed-${i}`, alesia.battle.data.plans) === plan) return `seed-${i}`;
  throw new Error(`No seed picks ${plan}`);
}

/** Plays a strategy through a session, action by action, as the app does. */
export function playSession(fx: Fixture, runId = `run-${fx.name}`, upTo = Infinity): BattleSession {
  let session = newBattleSession(alesia, runId, seedFor(fx.plan));
  for (let i = 0; i < upTo; i++) {
    const step = nextStep(alesia.battle, session.run);
    if (step.kind === 'finished') break;
    session =
      step.kind === 'scene'
        ? act(alesia, session, { kind: 'scene', choice: fx.strategy.scenes[step.sceneId] })
        : act(alesia, session, { kind: 'orders', orders: fx.strategy.phases[String(step.phase)] });
  }
  return session;
}
