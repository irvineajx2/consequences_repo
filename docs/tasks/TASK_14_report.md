# Task 14 report: fixes

## Fix 1: Elizabeth's prologue and era 1 images

**Cause: a stale image disk cache on Android.** It was none of the four suspects in the task: the
ruler lookup was already right (every image resolves from the run's own ruler id, and no ids
collide across rulers).

On Android a bundled image loads by its numeric resource id, and those ids are assigned to the file
names in alphabetical order. expo-image's default cache policy keeps decoded images on disk keyed
by that id, and the disk cache survives app updates. The first APK was built before ERA1-ERA4, P1,
R1 and TITLE moved into Elizabeth's images, so inserting them shifted every later id:

| Position | First APK | Now |
| --- | --- | --- |
| 24 | M1 (Mary's execution) | **ERA1** |
| 25 | T1 | ERA2 |
| 26 | X1 | ERA3 |
| 27 | X10 | ERA4 |
| 28 | X2 | M1 |
| 29 | **X3 (Pyrrhic Victory)** | **P1** |

That is exactly what AJ saw: the Hatfield prologue showing the Pyrrhic Victory ending, and "The New
Queen" showing Mary's execution. Scenes 01-17 sort first, kept their ids, and looked right. Other
images after ERA1 (beats, endings) could show the same fault.

**Fix:** every ruler image now draws through one component, `RulerImage`, from an explicit ruler id
and image id, cached in memory only (the images are bundled, so the disk cache gains nothing). The
session screen passes the run's ruler id down explicitly. The stale cache earlier builds left on the
phone is cleared at startup.

## Fix 2: meter icons 20% larger

One shared factor, `iconScale: 1.2`, in the Tudor skin's meter layout. Every icon size is multiplied
by it, along with everything sized with the icon (drained copy, shadow, glow, `effectPadPt`, shadow
offset, placeholder medals). Each icon keeps its own size relative to the others.

**Icons to re-export at 1.2x** (the masters aren't in the repo, so the @3x files are being upscaled
slightly). Each with its `_empty`, `_shadow` and `_glow` layers, at @1x, @2x and @3x:

| Icon | @3x now | @3x needed |
| --- | --- | --- |
| Elizabeth: treasury, authority, navy, succession | 120 px tall | 144 px |
| Elizabeth: religion_church (marker) | 90 px | 108 px |
| Elizabeth: religion_keys, religion_bible | 72 px | 86 px |
| Caesar: fortune, legions, people, senate, glory | 120 px | 144 px |

Charles's sheet isn't made yet: export it at the new size (fill icons 48 pt tall).

## Fix 3: meters spread evenly

**Why Caesar's differed:** the row was one strip of icons at their natural widths with a fixed gap,
centred on screen. Elizabeth's wide Religion gauge made her strip nearly full-width; Caesar's narrow
icons made a short strip in the middle. There were no per-ruler settings.

**Now:** one layout for every ruler. The row spans the screen inside the margins and safe area, split
into equal units; each icon is centred in its slot. A two-sided gauge takes **two** units (AJ's choice:
a 130 pt gauge cannot fit one equal slot without being squeezed to half its width), so Elizabeth's
Religion keeps roughly its old width. On narrow phones every icon shrinks by the same factor, just
enough to keep the gap between neighbours.

Icon scale by screen width (1.2 is the full 20% increase; before this task, Elizabeth's row shrank to
0.906 on an iPhone SE and the others drew at 1.0):

| Ruler | 320 pt (SE) | 375 pt | 390 pt | 430 pt |
| --- | --- | --- | --- | --- |
| Elizabeth | 0.95 | 1.17 | 1.20 | 1.20 |
| Caesar | 1.16 | 1.20 | 1.20 | 1.20 |
| Charles | 1.20 | 1.20 | 1.20 | 1.20 |

## Screenshots

To follow: the meter row for each ruler on a small (320 pt) and large (430 pt) phone.
