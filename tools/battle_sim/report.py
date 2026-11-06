"""Balance report for a battle, on the reference model (battle.py), with sliders in their steps.

For each of sim.py's four player types (careless; thoughtful but never reading the plan; reading the
plan from the attacks by phase 4; scouting in phase 1), playing every hidden plan equally often:
  - the early-ending rate;
  - the medal rates (gold, silver, bronze) and the gold-medal rate per plan;
  - the unlockable endings reached;
then a dominance check (no single strategy should win gold against every plan), and the share of
battles reaching each ending and unlockable across the four types, with the provisional gold band
that share gives (as the rulers' bands: common >= 5%, uncommon >= 1%, rare >= 0.1%, else legendary).

The battle is deterministic; this tool samples player strategies with a seeded RNG.

Usage (from the repo root): python tools/simulate.py battle alesia [BATTLES_PER_TYPE] [CLIMB_ITERS]
"""
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import battle as model  # noqa: E402
import sim  # noqa: E402

EARLY = sim.EARLY
MEDALS = ("gold", "silver", "bronze")
PLAYERS = [
    ("careless", lambda p: sim.casual()),
    ("thoughtful, never reads the plan", lambda p: sim.thoughtful(None)),
    ("thoughtful, reads the plan by phase 4", lambda p: sim.thoughtful(p, 4)),
    ("thoughtful, scouts in phase 1", lambda p: sim.thoughtful(p, 2, True)),
]


def pct(n, d):
    return f"{n / d * 100:.1f}%" if d else "-"


def band(share):
    return "common" if share >= 0.05 else "uncommon" if share >= 0.01 else "rare" if share >= 0.001 else "legendary"


def main(argv):
    battle_id = argv[0] if argv else "alesia"
    if battle_id != "alesia":
        sys.exit(f"Only alesia has a reference model so far (got {battle_id}).")
    n = int(argv[1]) if len(argv) > 1 else 20000
    iters = int(argv[2]) if len(argv) > 2 else 2500
    sim.rng.seed(int(os.environ.get("SEED", 1)))
    plans = model.PLANS
    all_outcomes, all_unlocks, total = Counter(), Counter(), 0

    print(f"Battle report: {battle_id}, {n:,} battles per player type, plans in turn ({', '.join(plans)})\n")
    for label, gen in PLAYERS:
        outcomes, unlocks, by_plan = Counter(), Counter(), {p: Counter() for p in plans}
        for i in range(n):
            plan = plans[i % len(plans)]
            o, u, _ = model.play(plan, gen(plan))
            outcomes[o] += 1
            by_plan[plan][o] += 1
            unlocks.update(u)
        all_outcomes.update(outcomes)
        all_unlocks.update(unlocks)
        total += n
        early = sum(v for k, v in outcomes.items() if k in EARLY)
        print(f"== {label}")
        print(f"   early ending: {pct(early, n)}   any medal: {pct(sum(outcomes[m] for m in MEDALS), n)}")
        print("   medals: " + "  ".join(f"{m} {pct(outcomes[m], n)}" for m in MEDALS) + f"  stalemate {pct(outcomes['stalemate'], n)}")
        print("   early endings: " + "  ".join(f"{k} {pct(outcomes[k], n)}" for k in sorted(EARLY)))
        print("   gold by plan: " + "  ".join(f"{p} {pct(c['gold'], sum(c.values()))}" for p, c in by_plan.items()))
        print("   unlockables: " + ("  ".join(f"{k} {pct(v, n)}" for k, v in unlocks.most_common()) or "none"))
        print()

    print("== Dominance: the best strategy found for each plan, against every plan (rows: built for; columns: actual)")
    best = {p: sim.climb(lambda x, p=p: sim.ev(p, x)[0], iters=iters)[0] for p in plans}
    print(" " * 12 + "".join(f"{q:>14}" for q in plans))
    worst = 0
    for p in plans:
        row = [model.play(q, best[p])[0] for q in plans]
        worst = max(worst, sum(o == "gold" for o in row))
        print(f"{p:>12}" + "".join(f"{o:>14}" for o in row))
    robust = sim.climb(lambda x: sum(sim.ev(q, x)[0] for q in plans), iters=iters + 500, restarts=8)[0]
    robust_gold = sum(model.play(q, robust)[0] == "gold" for q in plans)
    print(f"   most robust single strategy: {', '.join(f'{q} {model.play(q, robust)[0]}' for q in plans)}")
    print(f"   gold against at most {max(worst, robust_gold)} of {len(plans)} plans "
          f"({'OK: no strategy wins gold against every plan' if max(worst, robust_gold) < len(plans) else 'CHECK: one strategy wins gold everywhere'})")
    print(f"   Caesar's historical plan: {', '.join(f'{q} {model.play(q, sim.H)[0]}' for q in plans)}")
    print()

    print(f"== Shares across all four player types ({total:,} battles) and provisional gold bands")
    for k in sorted(sim.RANK, key=lambda e: -all_outcomes[e]):
        print(f"   ending {k:14} {pct(all_outcomes[k], total):>7}  {band(all_outcomes[k] / total)}")
    for k in ["throws_down_arms", "red_cloak", "iron_ring", "hunter_hunted", "clemency", "eagle_free", "gaul_unbound"]:
        print(f"   unlock {k:16} {pct(all_unlocks[k], total):>7}  {band(all_unlocks[k] / total)}")


if __name__ == "__main__":
    main(sys.argv[1:])
