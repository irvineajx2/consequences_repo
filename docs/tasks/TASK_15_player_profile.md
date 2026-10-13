# Task 15: Player profile

Read `CLAUDE.md` first. Tasks 11 (XP, levels, gold), 11b (rank medallions), 13 (Charles) and 14 must be merged. The design background is in the Expansion Plan doc, tab "History quiz and profile", section "The profile". This task is step 1 of that plan: **everything here works offline.** No accounts, no server.

## Goal

A profile screen that gathers everything the player has achieved, with a reserved space for the avatar, reached from a new Profile button on the title screen. Work on branch `task-15-profile`.

## Ground rules

- **Never spoil discovery.** The game's core is finding endings and paths across runs. The profile may show *how many* endings a ruler has, and their rarity, but **never the name, image or text of an ending, branch scene or achievement the player hasn't reached.** Unreached items show as locked ("???").
- **Read, don't duplicate.** Derive every number from the existing stores (progression ledger, chronicle, saves) through memoised selectors. Add new stored data only where it doesn't exist yet (see "Run stats" below).
- **Everything is data-driven:** a new ruler appears on the profile automatically, with no profile code changes.

## 1. Title screen: the Profile button

- Add a **Profile** button to the title screen, styled with the current skin like the other title buttons, with an accessible label ("Profile").
- **Tapping the level medallion** on the title screen also opens the profile.
- Place it so the title layout stays balanced on the smallest supported screen (iPhone SE size). Include before and after screenshots.

## 2. The profile screen

A single scrolling screen, portrait, in the current skin. Sections, top to bottom:

### 2.1 Header: avatar and identity

| Left (about 40% of the width) | Right |
| --- | --- |
| **The avatar space:** a framed portrait panel in a 2:3 shape, standing on a plinth tinted with the player's rank colour (the rank medallion colours, blue to gold) | Nickname, rank title, level medallion with the level number, XP bar to the next level, and the gold balance |

- **The avatar doesn't exist yet.** Build an `AvatarView` component with the interface the living avatar will use later, `size` and `variant: 'full' | 'bust'`, and for now render a placeholder: a soft parchment silhouette in the frame, with no text. When the avatar arrives (Expansion Plan, tab "Living avatar v1"), only `AvatarView`'s internals change.
- The profile header uses `variant: 'full'`. Build the `bust` variant too (the same placeholder, cropped to the upper part), so the title screen can use it later.
- **Featured achievement:** directly below the header, a full-width banner showing the player's featured achievement: its badge, title, the date earned and its rarity where it has one. See 2.6.
- **Nickname:** stored locally, default "Chronicler". Tapping it lets the player edit it: up to 20 characters, letters, numbers, spaces and simple punctuation, with a basic word filter. Nicknames will be synced and moderated when accounts arrive; keep the validation in one function so the server can reuse the rules.

### 2.2 Summary tiles

Four tiles in a row (two by two on small screens):

| Tile | Shows |
| --- | --- |
| Endings | Endings reached / total, across all rulers |
| Matched history | Number of rulers whose historical ending the player has reached |
| Outdid history | Number of rulers whose outperform ending the player has reached |
| Achievements | Earned / total |

### 2.3 Endings by rarity

One row per rarity tier, showing a coloured marker, the tier name and "reached / total in this tier" across all rulers. Tapping a row expands it to list endings in that tier grouped by ruler: reached endings by name (tapping one opens its chronicle entry, if that screen exists), unreached ones as "???".

**Rarity tiers:**

| Tier | Share of history-leaning runs reaching the ending | Colour |
| --- | --- | --- |
| Common | 5% or more | Parchment |
| Uncommon | 1% to 5% | Green |
| Rare | 0.1% to 1% | Blue |
| Epic | 0.01% to 0.1% | Purple |
| Legendary | Below 0.01% | Gold |

**Rarity data:**

- Generate it once per ruler with the repo's simulator, under **history-leaning play** (55% historical choices), at least 1,000,000 runs, and store it as data, `endingRarity` per ruler (the share and the tier for every ending).
- Add a script, `npm run rarity -- <ruler>`, that regenerates it, and run it for Elizabeth, Caesar and Charles.
- Never compute rarity at runtime.
- A test fails if any ending of any ruler has no rarity.
- If an ending is reached in fewer than 10 simulated runs, classify it Legendary and note it in the script output.

Global rarity from real players replaces this later, when the server exists; keep the lookup behind one function so the source can change.

### 2.4 Rulers

One card per ruler, in release order, using the ruler card image (`KR1` and its equivalents, placeholder if missing). Each card shows:

| Stat | Example |
| --- | --- |
| Runs played | 14 |
| Best decisions matched | 17 of 23 |
| Best result | The best ending category reached: Outperformed, Historical, Alternate, Fallen short or Fallen |
| Endings | 6 of 17 |
| Uncharted paths | Branch scenes visited: 4 of 22 |
| Chronicle | Chronicle entries unlocked, as a percentage |

- Rulers the player hasn't unlocked appear greyed, with the unlock rule shown, and no stats.
- Tapping a card opens that ruler's chronicle, if that screen exists.

### 2.5 Achievements

A grid of badges: earned ones in colour with the date earned; unearned ones as darkened silhouettes of the empty badge base. Tapping a badge shows its title and description. **Hidden** achievements show "???" for both until earned.

The featured achievement carries a small marker in the grid.

### 2.6 Featured achievement

The player chooses one earned achievement to feature on their profile: the one they're most proud of.

- **Choosing:** the detail view of any earned achievement has a "Feature on profile" button. Choosing a new one replaces the old. The featured one shows "Featured" instead, and can be un-featured.
- **Default:** until the player chooses, the banner shows their rarest earned achievement, labelled "Rarest achievement" rather than "Featured", so it's clear the game picked it. Rarity for achievements is the history-leaning share of runs that earn it, where the simulator can measure it; otherwise order by how late in the list it falls.
- **No achievements yet:** the banner shows the empty badge base with "Earn achievements to feature one here".
- **Never unearned:** only earned achievements can be featured. If saved data ever points to an achievement that isn't earned or no longer exists, fall back to the default.
- **Stored locally** with the profile, as `featuredAchievementId`, and included in the save migration. It will be shown to other players when profiles go online, so keep it with the other public profile fields (nickname, avatar).

### 2.7 Weekly quiz (reserved)

A card reading "Weekly history quiz: coming soon", behind a feature flag `quiz` that is off. It reserves the layout slot for season points, tier and best percentile later.

## Badge art

AJ is generating the badge images. Until they arrive, use a placeholder badge (a plain gold circle with the achievement's initial) through the same image lookup, so the art drops in without code changes.

- Each badge is a square transparent PNG named by achievement id (`first_reign`, `uncharted`, ..., `elizabeth_history`, ...), in `assets/ui/skins/tudor/achievements/`, exported at @1x, @2x and @3x for a 56 pt badge, with a `badges.json` listing them.
- `badge_base` is the empty badge. Unearned achievements render it darkened (as the meters' `_empty` versions are made), not a separate image per achievement.
- Per-ruler badges for future rulers follow the naming pattern `<ruler>_history`, `<ruler>_outdone`, `<ruler>_every_road`. If a ruler's badge is missing, use the placeholder.

## 3. Run stats (new stored data, only where missing)

Check what already exists. If the stores don't already record these, add a small per-ruler stats record, updated when a run ends and saved with the rest of the progress:

- runs played;
- best decisions matched, and on which run;
- endings reached, with first-reached dates (may already be in the ledger);
- branch scenes ever visited (may already be in the chronicle as "uncharted paths").

Backfill from existing data where possible when the app first loads with this version (for example, endings already in the ledger). Where history can't be recovered, start counting from now; don't invent numbers. Add a save-format migration with a test, following the existing save versioning.

## 4. Achievements: the first set

No achievement system exists yet. Add a minimal one: a data file of achievements, each with an id, title, description, an optional `hidden` flag, and a condition **derived from data the game already records**, checked when a run ends and when the app loads. Earned achievements are recorded in the progression ledger with the date, once, like first-time endings. No gold rewards yet.

The first set (16):

| Id | Title | Condition | Hidden |
| --- | --- | --- | --- |
| `first_reign` | First Reign | Finish any run | No |
| `uncharted` | Uncharted | Visit a branch scene for the first time | No |
| `off_the_map` | Off the Map | Visit 10 different branch scenes across all rulers | No |
| `faithful_copy` | Faithful Copy | Match every decision in a single run | No |
| `<ruler>_history` (×3) | In Their Footsteps: Elizabeth / Caesar / Charles | Reach that ruler's historical ending | No |
| `<ruler>_outdone` (×3) | Better Than History: Elizabeth / Caesar / Charles | Reach that ruler's outperform ending | Yes |
| `<ruler>_every_road` (×3) | Every Road: Elizabeth / Caesar / Charles | Reach every ending of that ruler | No |
| `legendary` | Against All Odds | Reach any Legendary-rarity ending | No |
| `rank_chronicler` | Chronicler | Reach the rank of Chronicler | No |
| `rank_sage` | Sage | Reach the rank of Sage | No |

Generate the per-ruler entries from the ruler list, so a new ruler gets its three automatically. Use the current rank names from `progression.json`; if they differ from the table, follow the data and note it. Check every achievement against existing saves on first load, so players who already qualify receive them (as a single "achievements earned" notice, not one popup each).

## 5. Accessibility and polish

- Supports the system font size: tiles and rows grow rather than truncate.
- Every tile, row and badge has a screen-reader label with its full meaning ("Endings: 23 of 51 reached").
- Respects Reduce Motion (no animated counters when it's on).
- Fast to open: selectors are memoised, and the screen renders within one frame of navigation on a mid-range phone.

## Tests

- **No spoilers:** with a profile that has reached some endings, render the screen and assert that the names of unreached endings, branch scenes and hidden achievements appear nowhere in the output.
- **Selectors:** every number on the screen, computed from fixture saves (a new player, a mid-game player, a completionist), matches the expected values.
- **Rarity data:** every ending of every ruler has a share and a tier, and tiers match the thresholds.
- **New ruler:** adding a test ruler to the data makes it appear in the rulers section, the rarity rows and the per-ruler achievements, with no code change.
- **Achievements:** each condition is earned exactly once, including when backfilled from an existing save.
- **Migration:** an old save loads, migrates and keeps all its progress.
- **Featured achievement:** choosing, replacing and un-featuring work; the default shows the rarest earned achievement with the "Rarest achievement" label; an unearned or unknown id falls back to the default; a player with no achievements sees the empty state.
- **Navigation:** the title screen's Profile button and level medallion both open the profile; back returns to the title screen.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- The Profile button and the level medallion open the profile from the title screen.
- The profile shows the avatar space (placeholder), identity, the featured achievement banner, summary tiles, endings by rarity, all three rulers, achievements and the reserved quiz card.
- A player can feature any earned achievement, and it persists after closing the app.
- Rarity data exists for every ending of Elizabeth, Caesar and Charles, generated by `npm run rarity`.
- No unreached ending, branch scene or hidden achievement is named anywhere on the profile.
- A short report with screenshots (new player, mid-game, completionist; small and large phone), the rarity table for each ruler, and anything in this task that didn't match the existing code and how it was handled.
