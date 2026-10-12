# Task 11: XP, levels and gold

Read `CLAUDE.md` first. Task 10 must be merged.

## Goal

Reward every completed run with XP, show the player's level and rank on the title screen with a
progress bar, and award gold the first time each ending is reached. Spending gold (the shop) is a
later task; this one only earns and displays it.

## Provided

`src/data/progression.json` (unzip `task11-progression.zip` into the repo root). Every number below
comes from it; nothing is hard-coded.

## 1. The rules

**XP for a run** (any run that reaches an ending, including failures and alternate endings):

```
run XP = round( (perDecision x decisions made + newEndingBonus if the ending is new) x ruler tier )
```

- Decisions made counts every decision the player took, including auto and branch scenes.
- "New" means the player has never reached that ending with that ruler before.
- Tiers: Elizabeth 1.0, Caesar 1.25 (harder rulers pay more per decision).
- Abandoning a run earns nothing. There is no other source of XP.

**Levels:** the XP needed to go from level L to L+1 is `base + step x (L - 1)` = 150, 225, 300, 375...
Each level needs 75 more XP than the last. `base` (150) is the average XP of one typical run across
the current rulers, so level 2 takes about one run, and each later level takes about half a run more
than the one before. Measured on simulated players: level 5 after about 5 runs, level 7 after about
10, level 11 after about 25, level 15 after about 50 and level 22 after about 100. There is no
level cap.

**Rank:** a title from `ranks` by level (Novice, Scribe, Chronicler, Historian, Sage, Keeper of Ages).

**Gold:** awarded only the first time an ending is reached:

```
gold = round( bands[band of this ending] x ruler tier )
```

Each ending's band (common, uncommon, rare, legendary) is in `currency.endings`, set from how often
players reach it. Gold is therefore capped: Elizabeth's endings hold 740 in total and Caesar's 1,214.
It cannot be farmed by replaying.

## 2. Pure logic (`src/game/progression.ts`)

- `xpToNext(level)`, `levelFromTotalXp(totalXp)` returning `{ level, xpIntoLevel, xpForLevel }`,
  `rankTitle(level)`.
- `scoreRun(rulerId, runResult, rulerProfile)` returning a breakdown:
  `{ decisions, decisionXp, newEnding, newEndingXp, tier, totalXp, gold }`.
- `applyRunRewards(profile, rulerId, runResult)` returning the new profile plus
  `{ breakdown, levelBefore, levelAfter, rankBefore, rankAfter }`.
- **Idempotent:** each run gets an id when it starts (store it in the run save). Rewards are applied
  once per run id: keep the last 100 awarded run ids in the profile and ignore repeats. A crash after
  awarding must never award twice; a crash before awarding must still award on next launch.

**Worked examples for tests:**
- Elizabeth's historical path (17 decisions, Gloriana, first time): 170 + 100 = **270 XP**, **80 gold**
  (rare). From zero: level 2 with 120 of 225 XP.
- The same run again: **170 XP, 0 gold.**
- Caesar's historical path (22 decisions, Ides of March, first time): (220 + 100) x 1.25 = **400 XP**,
  **100 gold** (rare 80 x 1.25).
- `levelFromTotalXp`: 0 -> level 1; 149 -> 1; 150 -> 2; 375 -> 3; 4,050 -> 10; 15,675 -> 20.
- Every ending of every ruler has a band (test fails if a ruler adds an ending without one).

## 3. Profile and migration

- Profile version 3 adds a global `progression`: `{ totalXp, gold, awardedRunIds }`. XP and gold are
  shared across rulers.
- **Migration from version 2:** credit existing players fairly. For every ending already reached,
  award its new-ending XP and gold as if earned then. For every completed run before this version,
  award `migration.xpPerEarlierRun` (120) XP, since earlier runs' lengths were not recorded. Test it.

## 4. Title screen

Under the wordmark, above the buttons, a compact **level plate** in the skin's style:
- A gold medallion with the level number, the rank title beside it in Cinzel.
- An XP bar under it showing progress into the current level, with small text "1,240 / 1,500 XP".
- The player's gold total with a coin icon at the right. Until a coin icon is drawn, use a small gold
  disc drawn in code.
- Keep it clear of the wordmark and the buttons on a small and a large screen.

## 5. End-of-run rewards

After the ending (and before or within the end-of-run chronicle, whichever reads better), show a
**Rewards** panel:
- The breakdown, line by line: "14 decisions x 10 = 140", "Ruler difficulty x1.25", "New ending
  +125", total XP.
- The XP bar fills with an animation from the old value to the new; each level gained plays a short
  level-up moment showing the new level, and the new rank title if it changed.
- Gold: "+100 Gold, new ending" when earned. When not, show one line explaining the rule: "Gold is
  awarded only for endings you haven't reached before." That line is what teaches players to explore.

## 6. Endings screen

Each ending card shows its band (Common, Uncommon, Rare, Legendary) and its gold reward, including on
locked endings ("??? · Legendary · 188 Gold"). This tells players what is worth hunting without
revealing how to get it.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass, including all worked examples above.
- On a phone: the title screen shows level, rank, XP bar and gold. A first Gloriana run shows
  +270 XP and +80 Gold with the bar filling and a level-up to 2; replaying it shows +170 XP, 0 gold
  and the explanation line.
- Force-closing the app on the rewards panel and reopening never double-awards.
- An existing install with progress migrates and shows a sensible level immediately.
- Committed on branch `task-11-xp-and-gold`.

## Out of scope

The shop and spending gold, the avatar, achievements, the daily challenge.
