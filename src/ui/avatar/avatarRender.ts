// Renders outfits for display: the art an outfit needs is loaded once and cached, and each outfit is
// drawn twice into offscreen images (eyes open, eyes closed), which are cached too. The figure on
// screen animates those images; it never re-composites the layers per frame.
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import { avatarCatalogue as cat, type Outfit, planImages, renderPlan } from '../../game/avatar';
import { avatarFiles } from './avatarFiles';
import { drawAvatar, type SkiaApi } from './drawAvatar';

export interface AvatarImages {
  readonly open: SkImage;
  readonly closed: SkImage;
}

const art = new Map<string, Promise<SkImage>>();
const renders = new Map<string, Promise<AvatarImages>>();
/** Outfits rendered most recently, newest last: a few are kept so switching back is instant. */
const RENDER_CACHE = 6;

function load(name: string): Promise<SkImage> {
  let p = art.get(name);
  if (!p) {
    const source = avatarFiles[name];
    if (source === undefined) return Promise.reject(new Error(`No avatar file "${name}"`));
    const { uri } = Image.resolveAssetSource(source as number);
    p = Skia.Data.fromURI(uri).then((data) => {
      const image = Skia.Image.MakeImageFromEncoded(data);
      if (!image) throw new Error(`Cannot decode avatar file "${name}"`);
      return image;
    });
    art.set(name, p);
  }
  return p;
}

/** A stable key for an outfit. */
export function outfitKey(o: Outfit): string {
  return [o.base, o.head ?? '-', o.top ?? '-', o.bottoms ?? '-'].join('/');
}

async function renderOnce(outfit: Outfit, eyesClosed: boolean): Promise<SkImage> {
  const plan = renderPlan(outfit, eyesClosed);
  const names = planImages(plan);
  const images = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await load(n)] as const)));
  const [W, H] = cat.canvas;
  const surface = Skia.Surface.MakeOffscreen(W, H) ?? Skia.Surface.Make(W, H);
  if (!surface) throw new Error('Cannot make an offscreen surface');
  // The same Skia object; its type comes from a second copy of the package's declarations.
  drawAvatar(Skia as unknown as SkiaApi, surface.getCanvas() as never, plan, images as never);
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  // A GPU snapshot belongs to its surface's context; a raster copy can be drawn anywhere.
  return snapshot.makeNonTextureImage() ?? snapshot;
}

/** The outfit drawn with eyes open and closed (cached). */
export function renderAvatar(outfit: Outfit): Promise<AvatarImages> {
  const key = outfitKey(outfit);
  let p = renders.get(key);
  if (p) {
    renders.delete(key);
  } else {
    p = Promise.all([renderOnce(outfit, false), renderOnce(outfit, true)]).then(([open, closed]) => ({ open, closed }));
    p.catch(() => renders.delete(key));
  }
  renders.set(key, p);
  while (renders.size > RENDER_CACHE) renders.delete(renders.keys().next().value as string);
  return p;
}

/** The rendered outfit, or null while it renders (or if it can't be). */
export function useAvatarImages(outfit: Outfit): AvatarImages | null {
  const key = outfitKey(outfit);
  const [state, setState] = useState<{ key: string; images: AvatarImages } | null>(null);
  useEffect(() => {
    // The web build doesn't load Skia (CanvasKit): the figure shows its stand-in there.
    if (Platform.OS === 'web') return;
    let cancelled = false;
    renderAvatar(outfit)
      .then((images) => {
        if (!cancelled) setState({ key, images });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The key stands for the outfit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Keep showing the previous outfit until the new one is ready, so changes don't flash.
  return state?.images ?? null;
}
