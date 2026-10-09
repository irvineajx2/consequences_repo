# Task 7: Title screen, ruler select, prologue and era cards

Read `CLAUDE.md` first. Task 6 must be merged.

## Goal

Give the game a proper opening and a sense of time passing: a title screen with the wordmark, a
ruler-select screen, a prologue slide, and a card at the start of each era. Also set the app icon
and splash screen.

## 1. Move the pending images into place

Move everything in `assets/rulers/elizabeth-i/pending/` (`ERA1`-`ERA4`, `P1`, `TITLE`, `R1`) into
`assets/rulers/elizabeth-i/images/`, delete `pending/`, and run `npm run images`.

The image registry test currently accepts only image ids used by `rules.json`. Extend it to accept
ids used by `ui.json` as well (section 2). Unknown ids must still fail.

## 2. Presentation data (`ui.json`, no rules)

Add to `src/data/rulers/elizabeth-i/ui.json`:

```json
{
  "prologue": { "image": "P1" },
  "eras": [
    { "id": "era1", "startsAt": "s01", "image": "ERA1" },
    { "id": "era2", "startsAt": "s07", "image": "ERA2" },
    { "id": "era3", "startsAt": "s11", "image": "ERA3" },
    { "id": "era4", "startsAt": "s15", "image": "ERA4" }
  ],
  "title": { "background": "TITLE" },
  "rulerCard": { "image": "R1" }
}
```

Test: every `startsAt` is a scene id in `rules.json`, eras are in scene order, and every image id
here exists in the registry.

## 3. Text (add to `text.en.json`)

```json
{
  "prologue": {
    "caption": "Hatfield, November 1558",
    "text": "A rider gallops up the drive at Hatfield with news from London. After years of danger and suspicion, everything is about to change."
  },
  "eras": {
    "era1": { "title": "The New Queen", "years": "1558–1562",
      "text": "England is small, poor and bitterly divided, and few expect its new queen to last. You must prove them wrong." },
    "era2": { "title": "The Queen of Scots", "years": "1568–1573",
      "text": "Ten years into your reign. Across the border, Scotland's lords have turned on their queen, and her troubles are about to become yours." },
    "era3": { "title": "The Sea Dogs", "years": "1577–1585",
      "text": "Nearly twenty years on, England's sailors are growing bold, and rich, at Spain's expense. The sea may decide your reign." },
    "era4": { "title": "The Enterprise of England", "years": "1586–1588",
      "text": "Philip of Spain has run out of patience. In the Escorial he plans the Enterprise of England: an armada to end your reign." }
  },
  "ruler": {
    "name": "Elizabeth I",
    "subtitle": "England, 1558–1588",
    "tagline": "Inherit a broken kingdom. Survive plots, rebellions and the might of Spain."
  }
}
```

Add UI strings:
"Begin reign", "Coming soon", "More rulers on the way", "discovered", "endings". Extend the
completeness test to cover the prologue, every era in `ui.json`, and the ruler text.

## 4. Session: prologue and era cards

Add two view types to `src/game/session.ts`: `prologue` and `era` (era id, image id, displayed state).

**Order of views:**
- A new run starts with the prologue, then the era 1 card, then scene 1.
- When the run moves into a scene belonging to a new era, show that era's card before the scene.
  An era begins at its `startsAt` scene; a scene belongs to the last era whose start is at or before
  it. If the `startsAt` scene is skipped (scene 15 when Mary is not held captive), the card still
  appears, before the next scene shown.
- Each era card appears at most once per run.
- If the run ends before an era begins (an early finale or a failure), that era's card never appears.
- **Drift animates on the era card.** The era card's displayed state is the resolved state, which
  includes the era's drift; the meters animate there, not on the following scene. The scene after
  the card shows the same state, so nothing animates twice.
- Resuming a saved run opens straight at the next scene, with no prologue or era card.

**Session tests:**
- The historical path shows: prologue, era 1, s01 ... s06, era 2, s07 ... s10, era 3, s11 ... s14,
  era 4, s15 ... s17, then the finale beats and the ending.
- A golden case where Mary is not captive at scene 15 shows the era 4 card before s16.
- A golden case with an early finale or failure before scene 15 never shows the era 4 card.
- Treasury animates on the era 2 card (drift), not on s07.
- Resume shows no prologue or era card.

## 5. Screens

**Prologue and era cards** use the same full-screen image layout as scenes, with the skin's panel.
- **Prologue:** caption, text, and a Continue button.
- **Era card:** the era title in Cinzel, the years beneath it, then the text, and Continue. Show the
  meters strip as usual, so the drift animates here.

**Title screen** (replaces the current one):
- The TITLE image full-screen.
- The wordmark (`assets/ui/branding/wordmark.png`), about 85% of the screen width, keeping its
  aspect ratio, centred, with its top just below the safe area (about 8-10% down on a notched
  phone). The sword may overlap the top of the throne canopy; that is intended.
- Buttons stacked in the lower third, using the skin: "Continue reign" (only when a run save exists),
  "New reign", "Chronicle", "Endings".
- The app version in small text at the bottom.

**Ruler select** (after "New reign"; keep Task 6's confirmation when a run would be discarded):
- Elizabeth's card: the R1 portrait (3:4) in a frame, with the name, subtitle and tagline, and her
  progress from the profile: "X of 17 discovered" and "Y of 13 endings". A "Begin reign" button.
- Beside or below it, one "Coming soon" card: a darkened silhouette with "More rulers on the way",
  not tappable. Do not name any future ruler.
- Rulers come from a small registry (`src/data/rulers/index.ts`) listing only `elizabeth-i`, so
  adding a ruler later means adding an entry, not changing the screen.

## 6. App icon and splash screen

Using `assets/branding/` (already in the repo): `icon.png` as the iOS and main icon,
`adaptive-icon.png` as the Android adaptive icon foreground on background `#141830`, and
`splash-logo.png` as the splash image on `#141830`. Configure them in `app.json` the way the current
Expo SDK expects. These only show in a real build, not Expo Go, so check the configuration with
`npx expo config` and `npx expo-doctor` instead.

## Acceptance criteria

- `npm test`, `npx tsc --noEmit` and `npx expo-doctor` pass.
- On a phone: title screen with the wordmark clear of the notch; New reign, then ruler select, then
  the prologue, the era 1 card and scene 1. A full historical run shows all four era cards, with
  drift animating on cards 2, 3 and 4. Continue reign resumes without any card.
- No placeholder images remain anywhere in a full historical run.
- Committed on branch `task-07-title-prologue-eras`.

## Out of scope

Audio, settings, analytics, builds, store, cosmetics, alternate-ending epilogues.
