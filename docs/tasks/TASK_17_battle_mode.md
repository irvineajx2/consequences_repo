# Task 17: Battle mode, with Alesia as the first battle

Read `CLAUDE.md` first. Tasks 13–16 must be merged (Task 15 provides the profile and achievements; Task 14 the meter scale). The design is in the Expansion Plan doc, tab **"Battle mode: Alesia"**; the art prompts in **"Battle mode image prompts"**. This is a **new game mode** alongside the ruler runs, with its own runtime. Work on branch `task-17-battle-mode`.

## The mode in brief

The player commands one famous battle on a painted map divided into **sectors**. A battle has **five phases**. In each phase the player:

1. sets **sliders**: cohorts across the sectors and a reserve, and cavalry across the plain, foraging patrols and a reserve;
2. chooses the **commander's position** (a sector, or the camp);
3. chooses **one move** from the phase's list (build, scout, sortie, feint and so on);
4. **resolves** the phase: each sector's defence is compared with the enemy's pressure under a **hidden plan**, fixed at the start of the run, and the map shows the result.

**Decision scenes** interrupt at set moments, in the same illustrated style as ruler scenes. Battles can **end early**, or reach a **graded outcome** (gold, silver, bronze or stalemate), plus **unlockable endings** for particular kinds of victory. Everything is deterministic: no dice.

## Provided

Unzip `task-17-battle-mode.zip` into the repo root:

| Path | What it is |
| --- | --- |
| `content/battles/alesia/battle.json` | Alesia's data: sectors, pools and slider steps, moves per phase, scenes and when they occur, the four hidden plans' pressure tables, tuning values, result bands, outcomes, unlockables, economy and image ids |
| `content/battles/alesia/text.en.json` | All player-facing text: intro, sectors, phases, moves, result lines, scenes, outcomes, unlockables, plan reveals and scouting clues |
| `content/battles/alesia/fixtures.json` | 867 golden fixtures from the reference model: plan, full strategy, outcome, unlocks and final state |
| `tools/battle_sim/` | The reference model (`battle.py`), the simulator (`sim.py`) and Caesar's sketched historical plan (`hist.py`) |

Images and `alesia_map_sectors.json` (the sector positions on the map) come separately from the art chat. Build with placeholders; see section 5.

## 1. The battle runtime (do this first)

Port `tools/battle_sim/battle.py` to TypeScript as the battle runtime, and keep the Python as the reference. **`battle.py` is the specification:** the order of operations inside a phase matters, so follow it exactly:

- scenes applied before phases 2 and 4;
- the move's immediate effects;
- the enemy pressure (scaled by the relief army's strength and Alesia's hunger);
- reserve use (the reserve goes **where the commander stands**);
- the crisis scene in phase 5;
- sector resolution into bands;
- early-ending checks (death, trapped);
- per-sector consequences;
- the move's after-effects;
- upkeep;
- the remaining early-ending checks;
- at the end of phase 5, the outcome and the medal.

Unlockables are evaluated when the battle ends.

**Every fixture must pass:** given the plan and the strategy, the runtime reproduces `outcome`, `unlocks` and the `final` state values. Sliders are in steps: cohorts in tenths of the current cohort total across `[inner, plain, rea, north, reserve]`, cavalry in fifths of the current cavalry across `[plain, patrol, reserve]`.

**Make it data-driven where it's practical.** Pressures, tuning values, bands, slider steps, the moves available per phase, scenes and outcomes come from `battle.json`. Move effects and scene effects may stay as code for now, but put them in one Alesia-specific module behind a small interface, so a second battle can supply its own. If the data file and `battle.py` ever disagree, `battle.py` wins; tell me.

**The hidden plan** is chosen when the battle starts, deterministically from a seed stored with the run, and is never shown until the result card. Saving and resuming a battle mid-way must keep the same plan.

## 2. Flow and screens

1. **Battles menu:** reached from the title screen (a new Battles button) and listing every battle as a card (`ALC1` for Alesia, plus the mode banner `BMODE1`). Locked battles show their unlock rule: **"Complete a run as Julius Caesar."** Any Caesar ending unlocks Alesia, including endings reached before this task ships; check existing saves on first load.
2. **Intro:** the battle's intro text over the day map.
3. **The battle map screen,** for each phase:
   - the map image for the phase (`ALMAP1` day for phases 1–3, `ALMAP2` night for phase 4, `ALMAP3` final day for phase 5), with the five sectors marked using `alesia_map_sectors.json`;
   - for each sector: its name, a **men** bar (cohorts committed) and a **morale** bar, and after resolution its result icon (held, strained, breach);
   - the commander token on the chosen sector;
   - a header with the phase title and the resources: grain, morale, allies and cohorts;
   - the **phase panel** in the lower third:
     - the cohort sliders and the cavalry sliders, in their steps, always totalling 100%;
     - the commander position (tap a sector, or the camp);
     - the move buttons for the phase, with their icons and one-line descriptions;
     - a **Commit** button.
4. **Resolution:** the map animates the result gently, in keeping with the living-painting style: dust or torchlight over attacked sectors, bars settling to their new values. A short report lists each sector's result line from the text. If the move was **scout**, show the plan's scouting clue.
5. **Decision scenes** appear at their set points (`battle.json` `scenes`) using the existing scene panel: riders before phase 2, the Mandubii before phase 4, the crisis in phase 5 after the player commits, and the surrender after a victory.
6. **Result card:**
   - the outcome image and text;
   - the medal;
   - any unlockable endings earned, with their images;
   - **the enemy's plan revealed** (name and reveal text);
   - "Caesar's real result: a decisive victory";
   - XP and gold earned.

Respect Reduce Motion. The map screen must work on the smallest supported phone, with the sliders comfortable to use with a thumb.

## 3. Progression, profile and achievements

- **XP:** every battle earns XP per phase played, at the same per-decision rate as a tier-2 ruler run, plus the existing bonus for a first-time ending.
- **Gold:**
  - for each **first-time** ending and unlockable ending, at the ruler-run rate;
  - **plus a separate one-off reward for each medal at each battle:** the first gold, first silver and first bronze each pay once (provisionally 100, 60 and 30, from `battle.json`, to be set in the balance pass). A player who wins gold first can still earn the silver and bronze rewards later.
- All of this goes through the existing progression ledger, so nothing is paid twice.
- **Profile:** add a **Battles** section: for each battle, best medal, endings and unlockables found ("4 of 9 endings, 2 of 7 unlockables"), and which hidden plans the player has faced. Unreached endings and unlockables show as "???", per the profile's no-spoiler rules.
- **Achievements** (with Task 15's system; placeholder badge art):
  - **First Command:** finish any battle;
  - **Gold at Alesia;**
  - **Every Plan:** win against all four of Alesia's hidden plans;
  - **Alesia Complete:** every unlockable ending at Alesia, hidden until earned.

## 4. Text

Use `text.en.json` throughout; nothing player-facing is hard-coded. Sector result lines use `{sector}` placeholders. Run the existing content lint on it (the budgets match the ruler text).

## 5. Images and sector positions

Register the battle images through the Task 12 pipeline, under `assets/battles/alesia/images/`, with the ids in `battle.json` `images`. The banner and icons are mode-wide, under `assets/ui/skins/tudor/battles/`:

- medals: `medal_gold`, `medal_silver`, `medal_bronze`, `medal_none`;
- move icons named by move id;
- the commander token and sector-state icons: `commander`, `roman_sector`, `enemy_pressure`, `breach`, `held`, `strained`.

The art is coming from the art chat; until it arrives, use placeholders and make the app run with any image missing.

`alesia_map_sectors.json` gives each sector's anchor point and rough outline as fractions of the map image. Until it arrives, use rough placeholder positions (inner: centre; plain: left; rea: top left; north: top and right; camp: bottom right of the battlefield area), and load them from the same file shape so the real file just replaces it.

## 6. Simulator

Make the repo's simulator able to run battles: Alesia under all four plans, with sliders in their steps. Report, for the four player types in `sim.py` (careless; thoughtful but never reading the plan; reading the plan by phase 4; scouting in phase 1):

- the early-ending rate;
- the medal and gold rates;
- the unlockables reached;
- a check that no single strategy wins gold against every plan.

Expected (reference model): careless players end early about a third of the time; thoughtful players who read the plan win gold about half the time, those who don't never do; the best all-round strategy wins gold against at most three plans. Small differences from sampling are fine.

**Known gaps:**
- "Gaul Rises Behind You" (allies reaching zero) is rare and has no fixture; cover it with a unit test that drives allies to zero.
- Scouting's balance may change in a later version (it currently costs a building turn). Keep the move effects in data or one module so that's a small change.

## Tests

- **Every fixture passes** in the TypeScript runtime and in `battle.py`.
- **Slider rules:** totals always 100%, steps respected, sliders rescale correctly when cohorts are lost.
- **The plan stays fixed and hidden** until the result card, including across save and resume.
- **Unlocking:** a profile with any Caesar ending unlocks Alesia; one without doesn't.
- **Rewards:** first-time ending gold, medal rewards and XP are paid once each, through the ledger, including gold then silver then bronze in that order.
- **Spoilers:** the profile and the Battles menu never name an unreached ending, unlockable or hidden achievement.
- **Unit tests** for each early ending, including Gaul Rises Behind You.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- All 867 fixtures pass; every earlier ruler's fixtures still pass.
- From the title screen, a player with a Caesar ending can open Battles, start Alesia, play all five phases with sliders, commander position and moves, see the decision scenes at their points, and reach a result card showing the medal, any unlockables, the revealed plan and the rewards.
- A battle can end early in each of the five ways.
- The Battles section of the profile and the four achievements work.
- The app runs with all battle art missing (placeholders) and picks up the real images and `alesia_map_sectors.json` when added.
- Committed on branch `task-17-battle-mode`, with a short report: how the runtime is structured for future battles, any differences between `battle.json` and `battle.py`, the simulator numbers, and screenshots of the map screen on a small and a large phone.
