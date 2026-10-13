# Task 14: Fixes: Elizabeth's opening images, meter size and meter spacing

Read `CLAUDE.md` first. Three small fixes, all to the current build. Work on branch `task-14-fixes`, and fix each one as its own commit.

## Fix 1: Elizabeth's prologue and era 1 card show the wrong images

### What happens

When a new Elizabeth playthrough starts, the **prologue** and the **era 1 card** show the wrong images. From scene 1 onwards, every image is correct.

### How to reproduce

Try both of these, and note which ruler's images appear (or whether they are placeholders):

1. Play some of a Caesar or Charles run, return to the title screen, then start a new Elizabeth run.
2. Close the app fully, reopen it, and start a new Elizabeth run.

If the wrong images only appear in case 1, the opening screens are reading the ruler from the previous run. If they appear in case 2 as well, the lookup for Elizabeth's opening images is itself wrong.

### Where to look

Scene images are correct, so the scene image lookup works. The fault is in how the **prologue and era card** find their images. The likely causes, most likely first:

- **They read the ruler from the wrong place:** a global "current ruler" value, the last-played ruler or the previous run's state, which is only updated once scene 1 loads. The opening screens render before that happens.
- **Their image ids are not namespaced by ruler.** Elizabeth's prologue and era card ids may collide with another ruler's in the image registry (Task 12), so the wrong file wins.
- **Elizabeth's ids were never registered under her ruler id** when Caesar was added, and the lookup falls through to another ruler's or a default image.
- **Something is cached:** a memoised selector or image source keyed without the ruler id.

### The fix

- The prologue and era cards must take the ruler id **from the run being started**, passed in explicitly, never from a global or remembered value.
- Every image lookup (prologue, era cards, scenes, beats, endings, ruler card) resolves through one function that takes the ruler id and the image id together.

### Tests

- For every ruler (Elizabeth, Caesar, Charles), starting a new run resolves the prologue and the era 1 card to that ruler's own images.
- Start a run as Caesar, then start a new run as Elizabeth: her prologue and era 1 card are hers. Repeat with Charles then Elizabeth, and Elizabeth then Caesar.
- Every era card for every ruler (including Charles's era variants) resolves to an image registered for that ruler.

In the commit message, say which cause it was.

## Fix 2: meter icons 20% bigger, for every ruler

### The change

Every meter icon is drawn **20% larger** than now, for all rulers: Elizabeth, Caesar and Charles (placeholders included).

### How

- Scale each ruler's configured icon size by 1.2. Icon sizes live in each ruler's `meters.json` (`heightPt`) or the skin config. Multiply each icon's own value: don't replace them with a single number, because some icons are deliberately smaller (one of Elizabeth's was regenerated at a smaller size).
- Scale everything that is sized with the icon by the same factor: the empty and filled layers, the shadow and danger-glow images, and `effectPadPt`, so the glow and shadow stay centred and the same relative size.
- Better still, put the factor in one place (a shared meter scale in the skin) rather than editing every number, so it can be tuned again later.

### Image sharpness

At the larger size, the @3x images need to be 1.2× taller to stay sharp. If the meter-icon pipeline can re-export from the source masters at the new size, do that. If the masters aren't in the repo, keep the current files (a 1.2× upscale is only slightly soft) and list which icons need re-exporting, so AJ can supply them.

### Check

- The danger glow, shadow and fill or drain still line up exactly with each icon at the new size.
- Five meters still fit comfortably in one row on the smallest supported screen width (iPhone SE size), with the spacing from Fix 3.

## Fix 3: meters spread evenly across the full width, the same for every ruler

### What happens

Elizabeth's meters are spread evenly across the screen. Caesar's are clustered together in the middle.

### The rule (for every ruler)

- The meter row spans the **full width of the screen**, inside the usual side padding and safe area.
- The row is divided into **equal-width slots, one per visible meter.** Each icon is centred in its slot.

Equal slots matter: icons have different widths (Caesar's fasces is narrow, his purse is wide), so "equal gaps between icons" would still look uneven. With equal slots, the icons' centres are evenly spaced, which is how Elizabeth's looks now.

### How

- Find why Caesar's row differs from Elizabeth's. It's likely a per-ruler layout (for example, a fixed gap with the row centred, or a fixed row width) instead of the slot layout.
- Make the slot layout **the single meter-row layout** used by every ruler, and remove any per-ruler spacing settings so they can't drift apart again.
- Elizabeth's two-sided Religion gauge and Charles's Church gauge each take one slot, like any other meter. Check that Elizabeth's row looks the same as before (apart from the 20% size increase).

### Check

- For each ruler, the horizontal distance between the centres of neighbouring meters is the same, and the first and last meters are the same distance from their screen edges.
- A layout test asserts this for all three rulers, on a narrow and a wide screen.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass, including the new tests above.
- A fresh Elizabeth run shows her own prologue and era 1 images, whether started cold or after a Caesar or Charles run.
- Meter icons are 20% larger for every ruler, with glow, shadow and fill still aligned.
- All three rulers' meter rows are spread evenly across the full width, with equal slots.
- Screenshots of the meter row for each ruler, on a small and a large phone, attached to the report.
- A short report: which cause Fix 1 turned out to be, and any icons that need re-exporting at the larger size.
