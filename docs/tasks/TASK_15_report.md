# Task 15 report: player profile

Everything works offline. New: `src/app/profile.tsx`, `src/ui/profile/` (AvatarView, Badge, sections,
data hook), `src/game/achievements.ts`, `profileView.ts` (memoised selectors), `rarity.ts`,
`nickname.ts`, `src/data/achievements.json`, `features.json`, each ruler's `rarity.json`, and
`tools/rarity.py` (`npm run rarity -- <ruler>`). The profile save is now version 4 (migration tested).

## Rarity tables (1,000,000 history-leaning runs each, 55% historical choices)

**Elizabeth I**

| Ending | Share | Tier |
| --- | --- | --- |
| assassinated | 23.29% | Common |
| habsburg_queen | 22.50% | Common |
| dudleys_wife | 17.45% | Common |
| scottish_succession | 13.30% | Common |
| pyrrhic | 6.90% | Common |
| french_match | 6.86% | Common |
| invasion | 3.32% | Uncommon |
| gloriana (historical) | 3.06% | Uncommon |
| bankrupt | 1.71% | Uncommon |
| protestant_revolt | 0.997% | Rare |
| deposed | 0.345% | Rare |
| catholic_rising | 0.206% | Rare |
| mistress (outperform) | 0.076% | Epic |

**Julius Caesar**

| Ending | Share | Tier |
| --- | --- | --- |
| prosecuted | 22.38% | Common |
| defeated_gaul | 18.48% | Common |
| defeated_pharsalus | 17.33% | Common |
| ruined_debt | 11.05% | Common |
| republic_endures | 8.36% | Common |
| enemy_state | 7.30% | Common |
| lost_britain | 3.97% | Uncommon |
| died_catiline | 3.74% | Uncommon |
| ides (historical) | 2.31% | Uncommon |
| king_rome | 2.24% | Uncommon |
| second_sulla | 1.49% | Uncommon |
| lord_nile | 0.616% | Rare |
| daggers_dark | 0.283% | Rare |
| mutiny | 0.259% | Rare |
| uneasy_crown | 0.165% | Rare |
| pater_patriae (outperform) | 0.024% | Epic |
| mob | 0.0012% (12 runs) | Legendary |

**Charles I**

| Ending | Share | Tier |
| --- | --- | --- |
| crowned_figurehead | 27.95% | Common |
| army_melts | 13.69% | Common |
| set_aside | 10.24% | Common |
| bankrupt | 9.34% | Common |
| axe (historical) | 7.80% | Common |
| broken_turnham | 5.77% | Common |
| beaten_by_scots | 5.45% | Common |
| over_water | 5.08% | Common |
| king_in_north | 4.85% | Uncommon |
| saints_rule | 3.13% | Uncommon |
| king_returns | 2.41% | Uncommon |
| no_popery | 2.11% | Uncommon |
| abdication | 0.985% | Rare |
| absolute_king | 0.846% | Rare |
| scots_gates | 0.312% | Rare |
| long_live (outperform) | 0.017% | Epic |
| ireland_ablaze | 0.0065% | Legendary |

No ending was reached in fewer than 10 runs, so none was forced to Legendary. Also measured, for
achievement rarity: runs visiting any branch scene (Elizabeth 0%, Caesar 59.4%, Charles 82.0%) and
runs matching every decision (Elizabeth 0.0031%, Caesar and Charles 1 run in a million each).

## Where the task and the code differed

- **Two rarity systems.** Task 11's gold bands (common, uncommon, rare, legendary; set by hand for
  Elizabeth and Caesar, provisionally for Charles) are separate from this task's ending rarity (five
  tiers from the simulator). They disagree in places (Gloriana: gold band Rare, rarity Uncommon;
  Caesar's mutiny: gold band Legendary, rarity Rare). I left the gold bands alone: the endings
  screen still shows them, and the profile shows the new tiers. Worth deciding whether to unify.
- **Run stats mostly existed.** Runs played, endings with first-reached dates, branch scenes visited
  and chronicle entries were already in the profile. Only the best decisions matched was missing: it
  is recorded from now on (with the date of that run). Older saves show "Not yet" until their next run.
- **Faithful Copy** is derived from that best match (an all-historical run is the historical path,
  since the game is deterministic), so it can't be backfilled from older saves.
- **Caesar had no short name**, so his titles would read "Julius Caesar" and his badge ids
  `julius_caesar_*`. I added `short_name: "Caesar"` to his text, giving "In Their Footsteps: Caesar"
  and `caesar_history`, as the task names them.
- **Rank names** in progression.json match the task (Chronicler, Sage).
- **Ending links:** there is no per-ending chronicle entry. Tapping a reached ending opens that ruler's
  Endings screen, where its card is; tapping a ruler card opens their Chronicle.
- **The level medallion:** the whole level plate is tappable (the medallion included), so screen
  readers get one button with the full label.
- **Achievement rarity** (for the default featured achievement): achievements one reign can earn use
  their simulated share (the most achievable ruler's, for general ones); those that take many reigns
  (Off the Map, Every Road, the ranks) count as rarer than any single-reign one, later in the list
  being rarer.
- **Profile save fields:** `identity` (nickname, featuredAchievementId) sits with the other public
  fields; achievements are in the progression ledger, with their dates.
- **Reduce Motion:** nothing on the profile animates (no counters), so there is nothing to switch off.
- **Badges:** no art yet; every badge shows the placeholder. `badges.json` lists the 17 expected
  files, and `npm run images` registers them when they arrive (and lists those still missing).

## Not done

- **Screenshots** (new player, mid-game, completionist; small and large phone; title before and
  after): the in-app browser pane stayed hidden, so the app could not be drawn. They can be taken
  when the window is in front, or from a phone build.
- **Opening within one frame:** the view is memoised and computed once per profile load, but I
  have not measured it on a phone.
