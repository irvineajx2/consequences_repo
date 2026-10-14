// The living avatar on screen: the cached render of an outfit (src/ui/avatar/avatarRender), breathing,
// shifting its weight, blinking and bouncing when an item goes on. Skia only; no per-frame
// compositing of the art layers.
import { Blur, Canvas, FilterMode, Group, ImageShader, MipmapMode, Oval, Vertices, vec } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { avatarCatalogue as cat, type Outfit } from '../../game/avatar';
import { type AvatarImages, outfitKey, useAvatarImages } from './avatarRender';

export type FigureVariant = 'full' | 'bust';

interface Props {
  readonly outfit: Outfit;
  /** Width in points; the height follows the variant (2:3 for both: the bust is the bust crop). */
  readonly width: number;
  readonly variant: FigureVariant;
  /** Breathe, sway and blink (default). Off: a still figure (the lab, captures). */
  readonly animate?: boolean;
  /** A soft shadow on the floor under the feet (full figures). */
  readonly shadow?: boolean;
  /** Drawn while the outfit renders, or where Skia can't draw (the web build). */
  readonly fallback?: React.ReactNode;
  /** Hold the eyes closed (the lab). */
  readonly eyesClosed?: boolean;
}

const [W, H] = cat.canvas;
const { waistBandY: WAIST, feetCentreX: FEET_X, groundLineY: GROUND, bustCrop: CROP } = cat.anchors;

// Motion, from the task: breathing stretches up to about 1% above the waist on a 4-5 s cycle;
// weight shifts under half a degree around the feet over 10 s; blinks last about 120 ms every
// 2.5-6 s, sometimes twice.
const BREATH_MS = 4500;
const BREATH_STRETCH = 0.01;
const SWAY_MS = 10000;
const SWAY_DEGREES = 0.4;
const BLINK_MS = 120;

/** The mesh: three rows (top, waistband, bottom); the top row rises as the chest fills. */
const TEXTURES = [vec(0, 0), vec(W, 0), vec(0, WAIST), vec(W, WAIST), vec(0, H), vec(W, H)];
const INDICES = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4];
/** The figure is drawn well below its art's size: smooth it with mipmaps. */
const SAMPLING = { filter: FilterMode.Linear, mipmap: MipmapMode.Linear };

/** A deterministic sequence for blink timing (no randomness anywhere; it only needs to look natural). */
function blinkSequence(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function AvatarFigure(props: Props) {
  const images = useAvatarImages(props.outfit);
  const crop = props.variant === 'bust' ? CROP : { x: 0, y: 0, w: W, h: H };
  if (Platform.OS === 'web' || images === null) {
    return <View style={{ width: props.width, height: (crop.h * props.width) / crop.w }}>{props.fallback ?? null}</View>;
  }
  return <LivingFigure {...props} images={images} />;
}

/** The figure once rendered: animation only runs here, never while the art loads. */
function LivingFigure({
  outfit,
  width,
  variant,
  animate = true,
  shadow = false,
  eyesClosed = false,
  images,
}: Props & { images: AvatarImages }) {
  const focused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const moving = animate && focused && !reduceMotion;
  const blinking = animate && focused;

  const t = useSharedValue(0);
  const blink = useSharedValue(0);
  const bounce = useSharedValue(1);
  useFrameCallback((frame) => {
    t.value = frame.timeSinceFirstFrame;
  }, moving);

  // Blink: closed for ~120 ms at 2.5-6 s intervals, about one time in five twice.
  const key = outfitKey(outfit);
  useEffect(() => {
    if (!blinking) return;
    const next = blinkSequence([...key].reduce((h, c) => Math.imul(h, 31) + c.charCodeAt(0), 7));
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const double = next() < 0.2;
        blink.value = withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1, { duration: BLINK_MS }),
          withTiming(0, { duration: 0 }),
          ...(double ? [withTiming(0, { duration: 140 }), withTiming(1, { duration: 0 }), withTiming(1, { duration: BLINK_MS }), withTiming(0, { duration: 0 })] : []),
        );
        schedule();
      }, 2500 + next() * 3500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blinking, key, blink]);

  // A small bounce when an item is put on (not on first showing, not with Reduce Motion).
  const firstKey = useRef(key);
  useEffect(() => {
    if (key === firstKey.current || reduceMotion || !animate) return;
    bounce.value = withSequence(withTiming(1.03, { duration: 130, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 8 }));
  }, [key, reduceMotion, animate, bounce]);

  const crop = variant === 'bust' ? CROP : { x: 0, y: 0, w: W, h: H };
  const scale = width / crop.w;
  const height = crop.h * scale;

  const vertices = useDerivedValue(() => {
    // Ease in and out of each breath.
    const k = BREATH_STRETCH * (0.5 - 0.5 * Math.cos((2 * Math.PI * t.value) / BREATH_MS));
    const top = -WAIST * k;
    return [vec(0, top), vec(W, top), vec(0, WAIST), vec(W, WAIST), vec(0, H), vec(W, H)];
  });
  const transform = useDerivedValue(() => {
    const angle = ((SWAY_DEGREES * Math.PI) / 180) * Math.sin((2 * Math.PI * t.value) / SWAY_MS);
    return [
      { translateX: -crop.x * scale },
      { translateY: -crop.y * scale },
      { scale },
      // Weight shift and bounce turn about the feet.
      { translateX: FEET_X },
      { translateY: GROUND },
      { rotate: angle },
      { scale: bounce.value },
      { translateX: -FEET_X },
      { translateY: -GROUND },
    ];
  });
  const closedOpacity = useDerivedValue(() => (eyesClosed ? 1 : blink.value));

  return (
    <Canvas style={{ width, height }}>
      {shadow && variant === 'full' && (
        <Group transform={[{ scale }]}>
          <Oval x={FEET_X - 190} y={GROUND - 22} width={380} height={44} color="rgba(40, 28, 16, 0.28)">
            <Blur blur={10} />
          </Oval>
        </Group>
      )}
      <Group transform={transform}>
        <Vertices vertices={vertices} textures={TEXTURES} indices={INDICES}>
          <ImageShader image={images.open} sampling={SAMPLING} />
        </Vertices>
        <Vertices vertices={vertices} textures={TEXTURES} indices={INDICES} opacity={closedOpacity}>
          <ImageShader image={images.closed} sampling={SAMPLING} />
        </Vertices>
      </Group>
    </Canvas>
  );
}
