# Task 4: UI skin (panel and buttons)

Read `CLAUDE.md` first. Task 3 must be merged.

## Goal

Replace the plain bottom panel and buttons with AJ's illustrated parchment panel and navy buttons,
drawn so they stay crisp at any size and any text length. Build it as a **skin**, so a later task can
sell alternative cosmetic skins by swapping one object.

## Provided

`ui-skin-tudor/` contains:
- **Panel:** frame slices `panel_tl, t, tr, l, r, bl, b, br` (parchment keyed out, transparent
  interior), a separate `panel_fill` (the parchment, drawn underneath), and two edge ornaments
  (`panel_ornament_top`, `panel_ornament_bottom`).
- **Button:** nine slices `button_tl` ... `button_c`, where the centre is the navy fill.
- `tudor.skin.json`: insets, scales, padding, colours and fonts.
- `preview_panel.png`, `preview_buttons.png`: how the reassembled pieces should look.

Place images in `assets/ui/skins/tudor/` and the JSON values in a typed TypeScript skin module.

## 1. Nine-slice component

React Native's `capInsets` is iOS-only, so build `NineSlice` from separate images (it must look the
same on iOS and Android):

- **Layers, bottom to top:** an optional fill image stretched to the area inside `fill.inset`, then
  the four edge slices stretched along their length, then the four corners at fixed size, then any
  ornaments centred on the top and bottom edges, then the children inside the content padding.
- Display sizes are source pixels × `scale` (points). Corners are never stretched.
- **Seams:** round every position and size with `PixelRatio.roundToNearestPixel`, and extend edge
  and centre slices by one pixel under their neighbours, so no hairline gaps appear on any device.
- Put the geometry in a pure function, `nineSliceLayout(width, height, inset, scale)`, returning
  the rectangle for each piece. Unit-test it: corners have the expected size, pieces tile the full
  width and height with no gaps, and it handles sizes smaller than two corners by clamping
  (corners shrink proportionally rather than overlapping).
- The component measures itself with `onLayout`, so its height follows its content.

## 2. Skin system

- A `Skin` type matching `tudor.skin.json`, plus a `SkinProvider` and `useSkin()` hook. The Tudor
  skin is the default.
- Every colour, font, padding and image used by the panel and buttons comes from the skin. No
  hard-coded colours in these components. A test checks that every image named in the Tudor skin
  exists.

## 3. Fonts

Install with `npx expo install`: `expo-font`, `@expo-google-fonts/cinzel`,
`@expo-google-fonts/eb-garamond`. Load them before the first screen renders (keep the splash
screen up until they are ready). Captions use Cinzel; narration and buttons use EB Garamond.

## 4. Apply it

- **Bottom panel** (scenes, consequences, beats, ending): the parchment panel, caption in Cinzel,
  body text in EB Garamond, colours from the skin. It keeps Task 2's behaviour: sits over the lower
  part of the image and scrolls if the content is too tall.
- **Option buttons:** stacked full-width buttons below the panel's text, each a nine-slice button
  with the label centred. Long labels wrap onto two lines and the button grows; nothing is
  truncated. Pressed state: the skin's dark overlay plus a slight scale-down. Disabled: reduced
  opacity. Use `accessibilityRole="button"` with the label as the accessible name.
- Continue buttons use the same button.

## Acceptance criteria

- `npm test` and `npx tsc --noEmit` pass.
- On a phone: the panel and buttons match the previews; no visible seams or gaps at any edge;
  corner ornaments are not distorted.
- Checked on at least two screen sizes (for example a small and a large phone in Expo Go, or one
  phone plus a simulator).
- The longest option labels (scene 10's "Underfund it; he pays the rest", scene 17's "Fully supply
  powder and shot") display in full.
- Switching the skin object (for example a test skin with different colours) restyles the panel
  and buttons with no component changes.
- Committed on branch `task-04-ui-skin`.

## Out of scope

Meters and animations (next task), purchasing skins, other screens' redesign.
