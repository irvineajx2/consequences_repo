"""Monte Carlo balance report for any ruler, on the reference engine (engine.py).

Measures (as used to balance Caesar and Charles):
  - how often each ending is reached, under uniform play and history-leaning play (55% historical);
  - the historical ending's and the outperform ending's rates under history-leaning play;
  - among history-leaning runs that outperform, the most common departure from history;
  - foresight: copying history for k decisions, deviating at decision k+1 and then playing well
    (a one-step-lookahead player valuing states by the finale score), the latest decision at which
    any run still outperforms.
The game itself is deterministic; this tool samples player choices with a seeded RNG.

Usage (from the repo root): python tools/simulate.py src/data/rulers/<ruler>/rules.json [RUNS] [FORESIGHT_TRIALS]
"""
import sys, random
from collections import Counter
sys.path.insert(0, __file__.rsplit("/", 1)[0] if "/" in __file__ else ".")
from engine import Engine

RULES = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 200000
TRIALS = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
E = Engine(RULES)
CATEGORY = {e: (v["category"] if isinstance(v, dict) else v) for e, v in E.d["endings"].items()}
HISTORICAL = [e for e, c in CATEGORY.items() if c == "historical"]
OUTPERFORM = [e for e, c in CATEGORY.items() if c == "outperformed"]
LEAN = 0.55
rng = random.Random(7)


def play(pick):
    """pick(n, opts) -> option, n = decisions so far. Returns (ending, log of (scene, option, historical, branch))."""
    st = E.start(); log = []
    for i, sc in enumerate(E.scenes):
        mode, opts = E.options(i, st)
        if mode != "skip":
            o = pick(len(log), opts)
            log.append((sc["id"], o["id"], bool(o["historical"]), bool(sc.get("branch"))))
            st, end = E.choose(i, st, o)
            if end: return end, log
        st, end, _, _ = E.resolve(i, st)
        if end: return end, log


def hist(opts): return [o for o in opts if o["historical"]]
def uniform(opts): return rng.choice(opts)
def lean(opts):
    h = hist(opts)
    if h and rng.random() < LEAN: return h[0]
    return rng.choice([o for o in opts if not o["historical"]] or opts)
def copy(opts): return (hist(opts) or opts)[:1][0]


def main():
    print(f"{RULES}: {len(E.scenes)} scenes, {len(CATEGORY)} endings")
    end, hl = play(lambda n, o: copy(o))
    print(f"historical path: {len(hl)} decisions -> {end}\n")
    rates = {}
    for name, policy in (("uniform", uniform), ("history-leaning (55%)", lean)):
        C = Counter(); dev = Counter(); wins = 0
        for _ in range(N):
            end, log = play(lambda n, o: policy(o)); C[end] += 1
            if end in OUTPERFORM and policy is lean:
                wins += 1
                for x in {(s, o) for s, o, h, b in log if not h and not b}: dev[x] += 1
        rates[name] = C
        print(f"=== {name}, {N:,} runs ===")
        for e, c in sorted(CATEGORY.items(), key=lambda x: -C[x[0]]):
            print(f"  {e:22} {c:13} {C[e] / N * 100:8.3f}%")
        if policy is lean:
            print(f"  historical ending ({', '.join(HISTORICAL)}): {sum(C[e] for e in HISTORICAL) / N * 100:.2f}%")
            print(f"  outperform ending ({', '.join(OUTPERFORM)}): {wins / N * 100:.4f}%  ({wins} runs)")
            for (s, o), c in dev.most_common(5):
                print(f"    departure {s}:{o:14} in {c / max(1, wins) * 100:5.1f}% of outperforming runs")
        print()
    print(f"=== foresight: copy history for k decisions, deviate at k+1, then play greedily ({TRIALS} trials each) ===")
    latest = 0
    for k in range(len(hl)):
        w = sum(1 for t in range(TRIALS) if greedy(k, EPSILONS[t % len(EPSILONS)]) in OUTPERFORM)
        if w: latest = k + 1
        print(f"  deviate at decision {k + 1:2} ({hl[k][0]}): {w} outperforming / {TRIALS}")
    print(f"LATEST: decision {latest} of {len(hl)}")


# The foresight player: after deviating, it looks one decision ahead and takes the option whose
# result scores best on the finale (an outperform ending scores highest, any other ending lowest),
# with some noise, and a random option with probability epsilon.
EPSILONS = (0.15, 0.35, 0.6)


def value(st): return E.finale_score(st) + rng.gauss(0, 8)


def greedy(k, eps):
    st = E.start(); n = 0
    for i, sc in enumerate(E.scenes):
        mode, opts = E.options(i, st)
        if mode != "skip":
            if n < k: o = copy(opts)
            else:
                cand = [x for x in opts if not (n == k and x["historical"])] or opts
                if rng.random() < eps: o = rng.choice(cand)
                else:
                    def worth(x):
                        s2, end = E.choose(i, st, x)
                        if end: return 1e9 if end in OUTPERFORM else -1e9
                        return value(s2)
                    o = max(cand, key=worth)
            n += 1
            st, end = E.choose(i, st, o)
            if end: return end
        st, end, _, _ = E.resolve(i, st)
        if end: return end


if __name__ == "__main__":
    main()
