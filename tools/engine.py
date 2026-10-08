"""Reference rules engine: interprets elizabeth_rules.json.
The Unity C# engine must implement exactly these semantics; parity is checked by tests."""
import json

OPS = {"==": lambda a, b: a == b, "!=": lambda a, b: a != b, "<": lambda a, b: a < b,
       "<=": lambda a, b: a <= b, ">": lambda a, b: a > b, ">=": lambda a, b: a >= b,
       "in": lambda a, b: a in b}

class Engine:
    def __init__(self, path):
        self.d = json.load(open(path))
        self.lo, self.hi = self.d["meter_range"]
        self.scenes = self.d["scenes"]

    def start(self):
        return {**self.d["meters"], **self.d["flags"]}

    def test(self, st, clauses):
        return all(OPS[op](st[var], val) for var, op, val in (clauses or []))

    def apply(self, st, eff):
        st = dict(st)
        for k, v in eff.get("add", {}).items():
            st[k] = max(self.lo, min(self.hi, st[k] + v))
        st.update(eff.get("set", {}))
        return st

    def options(self, i, st):
        """Returns (mode, options): mode is 'choice', 'auto' or 'skip'."""
        sc = self.scenes[i]
        for v in sc.get("variants", [{"options": sc.get("options")}]):
            if self.test(st, v.get("if")):
                if v.get("skip"): return "skip", []
                return ("auto" if v.get("auto") else "choice"), v["options"]

    def choose(self, i, pre, opt):
        """Apply one option. Returns (state, ending|None). All conditions read the pre-scene state."""
        st, end, _ = self.choose_with_beats(i, pre, opt)
        return st, end

    def choose_with_beats(self, i, pre, opt):
        """As choose, plus the story beats to show after this decision, in order:
        the option's own beats, then the beat of each event branch that fired."""
        if "end" in opt: return pre, opt["end"], []
        beats = list(opt.get("beats", []))
        add = dict(opt.get("add", {}))
        for c in self.scenes[i].get("scene_cond", []):          # merged into the option's own adds
            if self.test(pre, c.get("if")):
                for k, v in c["then"].get("add", {}).items(): add[k] = add.get(k, 0) + v
        st = self.apply(pre, {"add": add, "set": opt.get("set", {})})
        for c in opt.get("cond", []):
            branch = c["then"] if self.test(pre, c.get("if")) else c.get("else")
            if branch: st = self.apply(st, branch)
        for ev in self.scenes[i].get("after", []):               # events read the current state
            for b in self.d["events"][ev]["branches"]:
                if self.test(st, b.get("if")):
                    st = self.apply(st, b["then"])
                    if "beat" in b: beats.append(b["beat"])
                    break
        return st, None, beats

    def finale_beats(self):
        return list(self.d["finale"].get("beats", []))

    def failure(self, st):
        for f in self.d["failures"]:
            if self.test(st, f["if"]): return f["end"]

    def finale_score(self, st):
        sc = 0
        for t in self.d["finale"]["terms"]:
            if "over" in t: sc += max(0, st[t["var"]] - t["over"]) * t["mult"]
            elif "var" in t: sc += st[t["var"]] * t["mult"]
            elif self.test(st, t["if"]): sc += t["add"]
        return sc

    def finale(self, st):
        sc = self.finale_score(st)
        for o in self.d["finale"]["outcomes"]:
            if "below" in o and not sc < o["below"]: continue
            if "at_least" in o and not sc >= o["at_least"]: continue
            if not self.test(st, o.get("if")): continue
            return o["end"], sc

    def resolve(self, i, st):
        """After scene i: failure, drift, failure, finale. Returns (state, ending|None, score|None, early)."""
        f = self.failure(st)
        if f: return st, f, None, False
        if self.scenes[i].get("drift_after"):
            for r in self.d["drift"]:
                if self.test(st, r.get("if")): st = self.apply(st, r["then"])
            f = self.failure(st)
            if f: return st, f, None, False
        if i == len(self.scenes) - 1:
            e, sc = self.finale(st); return st, e, sc, False
        ea = self.d["early_finale"]
        until = [s["id"] for s in self.scenes].index(ea["until_scene"])
        if i <= until and self.test(st, ea["if"]):
            e, sc = self.finale(st); return st, e, sc, True
        return st, None, None, False
