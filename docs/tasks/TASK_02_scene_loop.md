# Task 2: Playable scene loop

Read `CLAUDE.md` first. Task 1 must be merged: `npm test` green.

## Goal

A player can open the app, start a run as Elizabeth I, play every scene from the Council to the
finale, and reach an ending, on a real phone through Expo Go. Real images are used where they exist;
a placeholder is shown where they don't. Meter animations, the end-of-run chronicle, saving and
story-beat slides are later tasks.

## Packages

Install with `npx expo install`: `expo-image`, `expo-linear-gradient`. Nothing else.

## 1. Text file

Create `src/data/rulers/elizabeth-i/text.en.json`, keyed by the ids in `rules.json`:

```json
{
  "scenes": {
    "s01": {
      "caption": "Hatfield, November 1558",
      "narration": "[Narration to be written]",
      "options": { "cecil": "Appoint Cecil and the moderates" },
      "consequences": { "cecil": "[Consequence to be written]" }
    }
  },
  "endings": {
    "gloriana": { "text": "[Ending text to be written]" }
  }
}
```

- Generate entries for every scene, every option in every variant, and every ending.
- Option text defaults to the option's `label` from `rules.json`; captions use the scene title and
  year. Narration, consequence and ending text are placeholders; AJ will write them.
- Add a test that every scene, option and ending id in `rules.json` has text, and that the text
  file has no ids that `rules.json` lacks.

Text never lives in `rules.json` or in components.

## 2. Image registry

Metro cannot `require` images by a computed path, so images need a generated registry.

- Images live in `assets/rulers/elizabeth-i/images/`, named by the image ids in `rules.json`
  (`01.png`, `B1.png`, `X3.png`, ...). Accept `.png`, `.jpg` and `.webp`.
- Add `scripts/build-image-registry.js` that scans that folder and writes
  `src/ui/imageRegistry.ts`: a map from image id to a static `require(...)`. Add an npm script
  `images` that runs it.
- Add `assets/placeholder.png` (a plain dark parchment-coloured image is fine) and a helper
  `getImage(id)` that returns the placeholder for missing ids.
- Add a test that every image id in the registry is used by `rules.json`. Missing images are
  allowed; unknown ones are an error, because they usually mean a typo in a filename.

## 3. Game session (pure TypeScript, `src/game/session.ts`)

A thin layer over `src/core` that turns the engine into screens, so components hold no logic.
No React imports. It exposes the current view as a discriminated union:

- `scene`: scene index and id, mode (`choice` or `auto`), and the options to show.
- `consequence`: the option just chosen, before moving on.
- `ending`: ending id, finale score (if any), early flag, the decision history.

Actions: `start()`, `choose(optionId)`, `continue()`. Skipped scenes are passed through
automatically and never produce a view. Every action returns a new session; nothing mutates.

Tests: playing the historical choices through the session reaches `gloriana` with 17 historical
matches; an option with `end` goes straight to the ending view; a skipped scene never appears as a
view (use a golden case where Mary is not captive at scene 15).

## 4. Screens (Expo Router)

- **`app/index.tsx` (title):** game name, "Elizabeth I" as the only ruler, a Play button.
- **`app/play.tsx` (scene loop):** holds the session in `useReducer`.
  - **Scene view:** the image fills the screen (9:16, `contentFit="cover"`). The bottom panel sits
    over the lower part of the image with a dark gradient behind it for legibility. It contains
    the caption, the narration and one button per option. If the content is taller than the panel,
    the panel scrolls; the image never shrinks.
  - **Auto scenes:** same layout with the option text shown as narration and a single Continue button.
  - **Consequence view:** the same image stays; the panel shows the consequence text and Continue.
  - **Ending view:** the ending's image (X1-X13), its title, the ending text, the finale score if
    there is one, and "Decisions matching Elizabeth: N of M" counting only non-auto decisions.
    Buttons: Play again, and Back to title.
- No historical information is shown after a decision. Do not reveal which option was historical
  anywhere except the ending view's count.
- Respect safe areas on notched phones. Use one shared style file for colours and fonts so a later
  task can theme it.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass, including all Task 1 tests.
- On a phone through Expo Go: a full run following Elizabeth's choices reaches Gloriana with
  "17 of 17"; marrying Dudley at scene 5 goes straight to Dudley's Wife; a run without Walsingham
  and Mary held captive ends at Babington in Assassinated.
- Existing images in the images folder display in their scenes after `npm run images`.
- No game rules in components or `app/`; everything comes from the session.
- Committed on branch `task-02-scene-loop`.

## Out of scope

Meter display and animation, era transition cards, story-beat slides (B1, B2, T1, D1, M1, A1-A4),
the end-of-run chronicle, saving, audio, ads, purchases.
