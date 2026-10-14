/**
 * The avatar checker (`npm run check-avatar`): validates the catalogue, then renders every reference
 * case in docs/avatar/reference/cases.json with the app's own renderer (drawAvatar, run headless on
 * Skia's CanvasKit) and compares it with the expected PNG. With AVATAR_SHEETS=1 it also writes
 * contact sheets (every base in every set, every hat on every base) to avatar-sheets/ (gitignored).
 *
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { AlphaType, ColorType, type SkImage, type Skia as SkiaApi } from '@shopify/react-native-skia/lib/commonjs/skia/types';
import { avatarCatalogue as cat, type Outfit, planImages, renderPlan } from '../../src/game/avatar';
import { drawAvatar } from '../../src/ui/avatar/drawAvatar';

const ROOT = path.join(__dirname, '../..');
const ASSETS = path.join(ROOT, 'assets/avatar');
const REFERENCE = path.join(ROOT, 'docs/avatar/reference');
const [W, H] = cat.canvas;

let skia: SkiaApi;
const decoded = new Map<string, SkImage>();

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web');
  // CanvasKit decodes UTF-16 while starting; Expo's test setup swaps in a UTF-8-only TextDecoder.
  const expoDecoder = globalThis.TextDecoder;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.TextDecoder = require('util').TextDecoder;
  try {
    skia = JsiSkApi(await CanvasKitInit({})) as SkiaApi;
  } finally {
    globalThis.TextDecoder = expoDecoder;
  }
});

function decode(file: string): SkImage {
  const cached = decoded.get(file);
  if (cached) return cached;
  const image = skia.Image.MakeImageFromEncoded(skia.Data.fromBytes(new Uint8Array(fs.readFileSync(file))));
  if (!image) throw new Error(`Cannot decode ${file}`);
  decoded.set(file, image);
  return image;
}

/** Renders an outfit with the app's renderer; returns its RGBA pixels. */
function render(outfit: Outfit, eyesClosed: boolean): { image: SkImage; pixels: Uint8Array } {
  const plan = renderPlan(outfit, eyesClosed);
  const images = Object.fromEntries(planImages(plan).map((n) => [n, decode(path.join(ASSETS, cat.files[n].file))]));
  const surface = skia.Surface.Make(W, H)!;
  drawAvatar(skia, surface.getCanvas(), plan, images, cat.backgroundColour);
  surface.flush();
  const image = surface.makeImageSnapshot();
  return { image, pixels: rgba(image) };
}

function rgba(image: SkImage): Uint8Array {
  const info = { width: image.width(), height: image.height(), colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul };
  return image.readPixels(0, 0, info) as Uint8Array;
}

/** PNG header facts: size, bit depth and colour type (0 = greyscale, 6 = RGBA). */
function pngInfo(file: string) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), depth: b[24], colourType: b[25] };
}

describe('the avatar catalogue', () => {
  const masks = new Set<string>();
  for (const base of Object.values(cat.bases)) masks.add(base.bandHideMask);
  for (const item of Object.values(cat.items)) {
    for (const m of [item.topBodyHide, item.topArmsHide, item.bottomsBodyHide, item.bottomsArmsHide]) if (m) masks.add(m);
    // A null hair mask means that base's hair needs no erasing.
    for (const m of Object.values(item.hairHide ?? {})) if (m !== null) masks.add(m);
  }
  // A null piece is one an item doesn't have (the legionary's shirt strip).
  const pieces = [
    ...Object.values(cat.bases).flatMap((b) => [b.thighs, b.body, b.eyesClosed, b.arms, b.hands, ...(b.frontHair ? [b.frontHair] : [])]),
    ...Object.values(cat.items).flatMap((i) => Object.values(i.pieces)),
  ].filter((p): p is { piece: string; layer: number } => p.piece !== null);

  it('names only files that exist, placed inside the canvas', () => {
    const named = new Set([...pieces.map((p) => p.piece), ...masks]);
    for (const name of named) {
      const f = cat.files[name];
      expect([name, f !== undefined]).toEqual([name, true]);
      const file = path.join(ASSETS, f.file);
      expect([name, fs.existsSync(file)]).toEqual([name, true]);
      const { width, height } = pngInfo(file);
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + width).toBeLessThanOrEqual(W);
      expect(f.y + height).toBeLessThanOrEqual(H);
    }
  });

  it('gives every piece a numeric layer', () => {
    for (const p of pieces) expect([p.piece, typeof p.layer]).toEqual([p.piece, 'number']);
  });

  it('keeps masks 8-bit greyscale and pieces RGBA, all PNG (lossless)', () => {
    for (const m of masks) expect([m, pngInfo(path.join(ASSETS, cat.files[m].file))]).toMatchObject([m, { depth: 8, colourType: 0 }]);
    for (const p of pieces) expect([p.piece, pngInfo(path.join(ASSETS, cat.files[p.piece].file)).colourType]).toEqual([p.piece, 6]);
  });
});

describe('the app renderer against the reference renders', () => {
  const cases = JSON.parse(fs.readFileSync(path.join(REFERENCE, 'cases.json'), 'utf8')) as Record<string, Outfit & { eyesClosed?: boolean }>;

  test.each(Object.entries(cases))('%s matches (mean difference under 1, no pixel over 8)', (name, { eyesClosed = false, ...outfit }) => {
    const ours = render(outfit, eyesClosed).pixels;
    const expected = rgba(decode(path.join(REFERENCE, `${name}.png`)));
    expect(ours.length).toBe(expected.length);
    let total = 0;
    let worst = 0;
    for (let i = 0; i < ours.length; i++) {
      const d = Math.abs(ours[i] - expected[i]);
      total += d;
      if (d > worst) worst = d;
    }
    const mean = total / ours.length;
    expect({ name, mean: mean < 1, worst: worst <= 8 }).toEqual({ name, mean: true, worst: true });
  });
});

// Contact sheets for eyeballing new art: only with AVATAR_SHEETS=1 (npm run check-avatar).
const sheets = process.env.AVATAR_SHEETS === '1' ? describe : describe.skip;
sheets('contact sheets', () => {
  const OUT = path.join(ROOT, 'avatar-sheets');
  const SCALE = 0.25;

  function sheet(name: string, rows: Outfit[][]) {
    const cw = W * SCALE;
    const ch = H * SCALE;
    const surface = skia.Surface.Make(cw * Math.max(...rows.map((r) => r.length)), ch * rows.length)!;
    const canvas = surface.getCanvas();
    canvas.drawColor(skia.Color('white'));
    rows.forEach((row, y) =>
      row.forEach((outfit, x) => {
        const { image } = render(outfit, false);
        canvas.drawImageRect(image, skia.XYWHRect(0, 0, W, H), skia.XYWHRect(x * cw, y * ch, cw, ch), skia.Paint());
      }),
    );
    surface.flush();
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${name}.png`), surface.makeImageSnapshot().encodeToBytes());
  }

  it('writes every base in every set, and every hat on every base', () => {
    const bases = Object.keys(cat.bases);
    const items = Object.entries(cat.items);
    sheet(
      'sets',
      bases.map((base) => items.map(([id, item]) => (item.slot === 'full' ? { base, top: id, head: id } : { base, top: id, bottoms: id, head: item.pieces.head ? id : undefined }))),
    );
    const hats = items.filter(([, item]) => item.pieces.head).map(([id]) => id);
    sheet('hats', bases.map((base) => hats.map((head) => ({ base, top: 'starter', bottoms: 'starter', head }))));
    expect(fs.existsSync(path.join(OUT, 'sets.png'))).toBe(true);
  });

  it('writes the app render beside the reference for cases 03, 05 and 09', () => {
    const cases = JSON.parse(fs.readFileSync(path.join(REFERENCE, 'cases.json'), 'utf8')) as Record<string, Outfit & { eyesClosed?: boolean }>;
    for (const name of Object.keys(cases).filter((k) => /^(03|05|09)_/.test(k))) {
      const { eyesClosed = false, ...outfit } = cases[name];
      const ours = render(outfit, eyesClosed).image;
      const theirs = decode(path.join(REFERENCE, `${name}.png`));
      const surface = skia.Surface.Make(W, H / 2)!;
      const canvas = surface.getCanvas();
      canvas.drawColor(skia.Color('white'));
      canvas.drawImageRect(ours, skia.XYWHRect(0, 0, W, H), skia.XYWHRect(0, 0, W / 2, H / 2), skia.Paint());
      canvas.drawImageRect(theirs, skia.XYWHRect(0, 0, W, H), skia.XYWHRect(W / 2, 0, W / 2, H / 2), skia.Paint());
      surface.flush();
      fs.writeFileSync(path.join(OUT, `compare_${name}.png`), surface.makeImageSnapshot().encodeToBytes());
    }
  });
});
