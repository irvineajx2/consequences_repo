// Draws an avatar render plan with Skia. The same function runs on the phone (into offscreen
// images) and headless in Node (the checker, through CanvasKit), so the checker tests the app's
// own renderer. Only Skia's pure type module is imported, never its native module.
import { BlendMode, ClipOp, type SkCanvas, type SkImage, type Skia } from '@shopify/react-native-skia/lib/commonjs/skia/types';
import { type AvatarCatalogue, avatarCatalogue, type DrawOp } from '../../game/avatar';

/**
 * Turns a greyscale mask into alpha (alpha = its grey level) so that drawing it with DstOut erases
 * alpha x (1 - mask / 255), as the reference does. A greyscale PNG otherwise decodes as opaque grey.
 */
/** The Skia API, as on the phone or from CanvasKit in Node. */
export type SkiaApi = Skia;

const GREY_TO_ALPHA = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0];

/**
 * Draws the plan onto `canvas` (the full catalogue canvas, 1024 x 1536, at 1:1). `images` holds
 * every image the plan names, decoded. With `background`, the canvas is filled with it first
 * (the lab and the checker); without, the figure is drawn on transparency.
 */
export function drawAvatar(
  skia: SkiaApi,
  canvas: SkCanvas,
  plan: readonly DrawOp[],
  images: Readonly<Record<string, SkImage>>,
  background?: string,
  cat: AvatarCatalogue = avatarCatalogue,
): void {
  const [W, H] = cat.canvas;
  if (background !== undefined) canvas.drawColor(skia.Color(background));
  const image = (name: string) => {
    const found = images[name];
    if (!found) throw new Error(`Avatar image "${name}" is not loaded`);
    return found;
  };
  const at = (name: string) => cat.files[name];
  const erase = skia.Paint();
  erase.setBlendMode(BlendMode.DstOut);
  erase.setColorFilter(skia.ColorFilter.MakeMatrix(GREY_TO_ALPHA));

  for (const op of plan) {
    const clipped = op.fromY !== undefined || op.toY !== undefined;
    if (clipped) {
      canvas.save();
      const from = op.fromY ?? 0;
      canvas.clipRect(skia.XYWHRect(0, from, W, (op.toY ?? H) - from), ClipOp.Intersect, false);
    }
    const piece = at(op.image);
    if (op.masks.length > 0) {
      // Erase within a layer of its own, then lay it over what is already drawn.
      canvas.saveLayer();
      canvas.drawImage(image(op.image), piece.x, piece.y);
      for (const m of op.masks) canvas.drawImage(image(m), at(m).x, at(m).y, erase);
      canvas.restore();
    } else {
      canvas.drawImage(image(op.image), piece.x, piece.y);
    }
    if (clipped) canvas.restore();
  }
}
