// The player's avatar: the living figure (src/ui/avatar) in a framed portrait, on the parchment
// backdrop. While the figure renders (and on the web build, where Skia isn't loaded) a soft
// parchment silhouette stands in, with no text.
import { StyleSheet, View } from 'react-native';
import { avatarCatalogue, type Outfit } from '../../game/avatar';
import { wardrobeData } from '../../game/wardrobe';
import { AvatarFigure } from '../avatar/AvatarFigure';
import { usePlayerOutfit } from '../avatar/playerOutfit';
import { useSkin } from '../skin/SkinProvider';

export type AvatarVariant = 'full' | 'bust';

const { bustCrop } = avatarCatalogue.anchors;
/** Height over width: the whole 2:3 figure, or the catalogue's bust crop (also 2:3). */
export const AVATAR_ASPECT: Readonly<Record<AvatarVariant, number>> = { full: 1.5, bust: bustCrop.h / bustCrop.w };

interface Props {
  /** Width in points; the height follows the variant's shape. */
  readonly size: number;
  readonly variant: AvatarVariant;
  /** An outfit to show instead of the player's own (the dressing room's trial outfit). */
  readonly outfit?: Outfit;
  /** Breathe and blink (default); off for still captures. */
  readonly animate?: boolean;
}

/** The free parchment backdrop (the only one drawn yet). */
const BACKDROP = wardrobeData.backdrops.find((b) => b.id === 'parchment')?.colour;

export function AvatarView({ size, variant, outfit, animate = true }: Props) {
  const worn = usePlayerOutfit();
  return (
    <AvatarFrame size={size} variant={variant}>
      <AvatarFigure
        outfit={outfit ?? worn}
        width={size}
        variant={variant}
        animate={animate}
        shadow={variant === 'full'}
        fallback={<Silhouette size={size} variant={variant} />}
      />
    </AvatarFrame>
  );
}

function AvatarFrame({ size, variant, children }: { size: number; variant: AvatarVariant; children: React.ReactNode }) {
  const { profile } = useSkin();
  const border = Math.max(2, size * 0.03);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Avatar"
      style={[
        styles.frame,
        {
          width: size,
          height: size * AVATAR_ASPECT[variant],
          borderWidth: border,
          borderRadius: size * 0.08,
          borderColor: profile.avatarFrame,
          backgroundColor: BACKDROP ?? profile.avatarFill,
        },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { margin: -border }]}>{children}</View>
    </View>
  );
}

/** The stand-in: a parchment silhouette laid out on the full 2:3 portrait (the bust shows its top). */
function Silhouette({ size, variant }: { size: number; variant: AvatarVariant }) {
  const { profile } = useSkin();
  const full = size * AVATAR_ASPECT.full;
  const head = size * 0.36;
  return (
    <View style={{ width: size, height: size * AVATAR_ASPECT[variant] }}>
      <View
        style={[
          styles.part,
          { width: head, height: head, borderRadius: head / 2, left: (size - head) / 2, top: full * 0.2, backgroundColor: profile.avatarSilhouette },
        ]}
      />
      <View
        style={[
          styles.part,
          {
            width: size * 0.74,
            height: full * 0.5,
            left: size * 0.13,
            top: full * 0.2 + head * 1.05,
            borderTopLeftRadius: size * 0.37,
            borderTopRightRadius: size * 0.37,
            backgroundColor: profile.avatarSilhouette,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  part: { position: 'absolute' },
});
