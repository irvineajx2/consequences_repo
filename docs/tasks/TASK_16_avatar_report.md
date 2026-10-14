# Task 16 report: living avatar v1

## The renderer

- `src/game/avatar.ts`: the catalogue types and `renderPlan()`, a direct port of `render()` in
  `tools/avatar/render_reference.py` (masks, hair, top extension, overlay clip, shirt strip, full
  items), giving the layers in ascending layer order (ties in insertion order).
- `src/ui/avatar/drawAvatar.ts`: draws a plan with Skia. Erase masks are drawn with
  `BlendMode.DstOut` inside a `saveLayer`, through a colour matrix that turns the greyscale mask
  into alpha (a greyscale PNG otherwise decodes as opaque grey). Row cut-offs are clip rectangles.
- **The same function** runs on the phone (into offscreen surfaces) and headless in Node
  (`npm run check-avatar`, through Skia's CanvasKit), so the checker tests the app's own renderer.

## The checker (`npm run check-avatar`)

Validates the catalogue (files exist, numeric layers, masks 8-bit greyscale, pieces RGBA PNG,
positions inside the canvas), renders all 10 reference cases and compares them with the PNGs:
**all 10 pass** (mean difference under 1, no pixel over 8). It also writes contact sheets (every base
in every set, every hat on every base) and the app render beside the reference for cases 03, 05 and
09, to `avatar-sheets/` (gitignored). The renders match the references visually as well.

## How the figure animates

The outfit is rendered twice into offscreen Skia images (eyes open, eyes closed) and cached (the
last 6 outfits). On screen nothing is re-composited:

- **Breathing (mesh warp):** the cached image is drawn through Skia `Vertices` with an
  `ImageShader`, on a mesh of six points in three rows: the top of the canvas, `waistBandY` and the
  bottom. Only the top row moves: it rises by up to 1% of the height above the waist
  (`-waistBandY x k`, k easing 0 to 0.01 and back, 4.5 s cycle), so everything above the waist
  stretches linearly and everything below stays put. A piecewise-linear warp, exact, and cheap.
- **Weight shift:** the whole figure turns under half a degree (0.4) about (`feetCentreX`,
  `groundLineY`) on a 10 s sine.
- **Blink:** the eyes-closed image is drawn over the open one at full opacity for about 120 ms, at
  2.5-6 s intervals, about one in five a double blink. The intervals come from a seeded sequence,
  not `Math.random`.
- **Equip reaction:** a small bounce (to 1.03 and back, about the feet) when the outfit changes.
- **Reduce Motion:** blink only. **Off-screen:** the frame callback and blink timers stop when the
  screen loses focus.

## Placements

Title screen bust (the catalogue's `bustCrop`) beside the level medallion; profile avatar space
(Task 15's `AvatarView`, now the living figure on the parchment backdrop and rank plinth); full
figure beside the XP breakdown on the end-of-run rewards panel; dressing room; share card (a still
captured with Skia's `makeImageFromView`, shown in the app).

## Data and screens

- **Profile version 5:** the avatar outfit with the public identity fields (nickname, featured
  achievement); owned items in the progression ledger (`wardrobe`: when, how, gold paid), each
  recorded once. Older saves migrate with the default outfit (look 1, starter clothes).
- **Dressing room:** choose a look (6), try any item on for free, buy with gold, see how an item
  unlocks, wear an outfit once everything in it is owned.
- **Prices** are null (price TBC, buying blocked). For testing, `src/data/avatar.json` gives dev
  prices (Puritan 25, Courtier 60) that apply only while the hidden testing switch is on (long-press
  the version number).
- **Avatar lab** (from the dressing room, testing switch on): look, head, top, bottoms, eyes closed
  and the 10 reference cases as presets, on the lab background.
- **Backdrops:** the data model holds five (parchment free; four priced TBC, art to come); the
  plinth takes the rank colour.

## What didn't fit

- **Unlock rules with no matching achievement.** Mariner ("Reach an Elizabeth ending at sea") and
  Trooper ("Win a battle as Charles") had no Task 15 achievement. Agreed with AJ: two new visible
  achievements, **Sea Dog** (any of Gloriana, Mistress of the Seas or Pyrrhic Victory, the Armada
  fought at sea) and **Royalist Victory** (Charles's `absolute_king`, the one ending only reached by
  winning the war). Badges for both still to come.
- **Share card export** is not wired: AJ chose no export package for now. The card is captured and
  shown in the app.
- **`catalogue.layers` is null**, although the task says the layer scale is there; every piece
  carries its own layer, which is what the renderer uses.
- **The legionary has no shirt strip** (`piece: null`), and the reference renderer would crash on
  legionary bottoms worn with no top; the app simply draws nothing for it.
- **Courtier's hair mask for b5 is null** (close-cropped hair needs none): skipped, as the reference
  does.
- **The bust is 2:3**, the catalogue's `bustCrop`; Task 15's placeholder bust was square.
- **Skia** (`@shopify/react-native-skia`, named in the task) is a native module: the app needs a new
  build (EAS) before the avatar appears on a phone. Its install script copies prebuilt libraries and
  is approved in `package.json` (`allowScripts`).
- **The web build** doesn't load Skia's CanvasKit, so it shows the silhouette stand-in.
- **Title screen:** the Profile button now has its own row; three skinned buttons across didn't
  fit their labels on a phone (Task 15's "Chronicle" wrapped).

## Not yet seen

The breathing, blinking and Reduce Motion behaviour, purchases persisting across restarts, and the
share card on a phone: they need an APK. The rendering itself is checked headless against every
reference case.
