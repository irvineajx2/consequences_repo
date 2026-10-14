# Task 16: Living avatar v1 (renderer, dressing room, placements)

Read this whole file before starting. Design background is in the Expansion Plan doc, "Living avatar v1" tab; where this file and that tab disagree, **this file wins** (the art test changed several things: square-on pose, no per-base hat-hair images, numbered layers).

## What's in this drop

| Path | What |
|---|---|
| `assets/avatar/avatar.catalogue.json` | Everything the app needs: bases, items, layer numbers, file positions, anchors, unlock rules |
| `assets/avatar/pieces/*.png` | Cut art layers (RGBA), cropped to content |
| `assets/avatar/masks/*.png` | Greyscale erase masks (white = erase), cropped to content |
| `tools/avatar/render_reference.py` | The reference renderer. Pure Python + Pillow + numpy. **The app's output must match it.** |
| `docs/avatar/reference/` | Expected renders (`cases.json` lists the inputs for each PNG) and three contact sheets |

All coordinates are on a fixed **1024 × 1536** canvas. Every file entry in `catalogue.files` has `file`, `x`, `y`: draw the cropped image at `(x, y)` on the canvas.

## The model

- **6 bases** (`b1`–`b6`). Each has pieces: `thighs` (−1), `body` (0), `eyesClosed` (1), `arms` (65), optional `frontHair` (80), `hands` (90), plus a `bandHideMask`.
- **9 items.** `slot: "set"` items have pieces `head`, `top`, `topExtension`, `sleeves`, `bottoms`, `shirtStrip`, and optionally `overlay` (the sash) and `back` (the legionary's cloak). `slot: "full"` (the senator) has `head` and `full`; equipping it clears top and bottoms, and equipping a top or bottoms clears it. The starter has no head piece.
- The player equips **head**, **top** and **bottoms** independently, from any items (e.g. trooper top + court-lady skirt + mariner cap). Picking an item's top equips its `top`, `topExtension`, `sleeves`, `overlay` and `back` pieces together.

### Layer numbers (the core rule)

Every piece has a `layer`. Draw everything in **ascending layer order**; ties keep insertion order (as in the reference). Clothing always sits above the base body. Whether a top goes over or under bottoms is decided only by their numbers: doublets are 40 and breeches 30, so the doublet goes over; the court skirt is 60, so it goes over any top. The scale is in `catalogue.layers`. New items in future just pick a number; no code change.

## The render algorithm

Implement exactly what `render()` in `tools/avatar/render_reference.py` does. Summary:

1. **Body erase masks.** If a top/full item is worn, erase the base `body` with `item.topBodyHide`, and erase `arms` with `item.topArmsHide`. If bottoms are worn, erase `body` with `bottomsItem.bottomsBodyHide` **and** `base.bandHideMask`, and `arms` with `bottomsItem.bottomsArmsHide`.
2. **Hair.** If the head item has `hairHide`, erase both `body` and `frontHair` with `hairHide[baseId]` (greyscale: alpha × (1 − mask/255)).
3. **Top extension.** If bottoms come from a different item and `bottoms.waist > top.waist + 4`, draw `topExtension` with everything below `bottoms.waist + 6` cut away.
4. **Overlay clip.** If the top has `overlayTop` and the bottoms' layer is above the top's layer, cut the bottoms piece above row `overlayTop` (so the skirt stops under the sash).
5. **Shirt strip** (layer 10) is drawn only when bottoms are worn with **no** top.
6. Background `#CBCACA` in the lab; transparent elsewhere (backdrop sits behind).

Erase masks are multiplicative alpha: `alpha_out = alpha × (1 − mask)`. In Skia that's drawing the mask into a saveLayer with `BlendMode.DstOut`.

## Performance approach (recommended)

Don't composite 15 layers every frame. When the outfit or base changes, render the figure **twice** into offscreen Skia images, eyes open and eyes closed (`eyesClosed` adds the patch at layer 1). Cache both. Animate the cached image, and swap to the closed one for a blink. This is pixel-identical to the reference and cheap to animate.

## Animation (Skia, no Rive in v1)

Anchors are in `catalogue.anchors`.

| Motion | How |
|---|---|
| Breathing | Mesh-warp the cached figure: stretch about 1% vertically above `waistBandY`, eased, 4–5 s cycle |
| Weight shift | Rotate under 0.5° around (`feetCentreX`, `groundLineY`), 10 s drift |
| Blink | Swap to the eyes-closed image for about 120 ms at random 2.5–6 s intervals, occasional double blink |
| Equip reaction | Small bounce once when an item is put on |

Respect Reduce Motion (blink only). Pause when off-screen. Head tilt is out of scope for v1 (the head isn't a separate layer).

## Screens and data

1. **Avatar lab** (dev screen): pick base, head, top, bottoms, eyes closed; shows the render. Use it to compare against `docs/avatar/reference/`.
2. **Dressing room:** choose base; try any item for free; buy with gold or see the unlock rule. `unlock.type` is `free`, `gold` (price is `null` for now: show "price TBC" and block buying until the balance pass sets prices) or `achievement` (`rule` text; wire to the matching achievement IDs from Task 15). Ownership goes through the progression ledger so a purchase/unlock is recorded once. The profile stores base, equipped head/top/bottoms (or full) and owned items.
3. **Placements:** title screen bust crop (`anchors.bustCrop`) beside the level medallion; profile avatar space from Task 15; end-of-run full figure; share card as a still capture.
4. Backdrops and plinths: art isn't made yet. Ship with a plain parchment backdrop (free) and a soft floor shadow, with the data model ready for 5 backdrops and rank-coloured plinths.

Each item has a `note` (historical blurb) and `rulerSet`; show the note in the dressing room. Never reveal achievement unlocks that would spoil a hidden ending: show the `rule` only if Task 15 already treats that achievement as visible, otherwise "Unlocked by an achievement".

## Tests and checker

- `npm run check-avatar`: validate the catalogue (every referenced file exists, every piece has a numeric layer, masks are greyscale, positions inside the canvas), then render every case in `docs/avatar/reference/cases.json` with the app's renderer (a Node/Skia headless path is fine) and compare with the PNGs. Pass at mean absolute difference under 1 and no pixel over 8 (lossless assets should give 0).
- Also produce a contact sheet of every base × every set, plus every hat on every base, into a gitignored folder, for eyeballing new art.
- `python tools/avatar/render_reference.py` regenerates three sample renders; keep it in the repo as the source of truth.

## Asset handling

Keep pieces and masks **lossless** (PNG, or lossless WebP if the image pipeline converts). Lossy compression will put halos round every cut. Masks must stay 8-bit greyscale.

## Done when

- The avatar lab reproduces every reference case.
- The figure breathes and blinks smoothly on AJ's phone, and holds still with Reduce Motion on.
- A test item can be bought with real gold (with a temporary dev price) and worn, and it persists across restarts.
- The avatar appears on the title screen, profile and end of run, and the share card exports.
- Report back with: screenshots of the lab matching cases 03, 05 and 09; how the mesh warp is done; anything in this file that didn't fit the existing code.
