// The player's avatar. The living avatar (Expansion Plan, "Living avatar v1") will replace only this
// component's insides; until then it is a soft parchment silhouette in a frame, with no text.
import { StyleSheet, View } from 'react-native';
import { useSkin } from '../skin/SkinProvider';

export type AvatarVariant = 'full' | 'bust';

/** Height over width: a 2:3 portrait, or the bust cropped square from its upper part. */
export const AVATAR_ASPECT: Readonly<Record<AvatarVariant, number>> = { full: 1.5, bust: 1 };

interface Props {
  /** Width in points; the height follows the variant's shape. */
  readonly size: number;
  readonly variant: AvatarVariant;
}

export function AvatarView({ size, variant }: Props) {
  const { profile } = useSkin();
  const width = size;
  const height = size * AVATAR_ASPECT[variant];
  // The figure is laid out on the full 2:3 portrait; the bust shows only its top.
  const full = size * AVATAR_ASPECT.full;
  const head = size * 0.36;
  const border = Math.max(2, size * 0.03);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Avatar"
      style={[
        styles.frame,
        { width, height, borderWidth: border, borderRadius: size * 0.08, borderColor: profile.avatarFrame, backgroundColor: profile.avatarFill },
      ]}
    >
      <View
        style={[
          styles.part,
          { width: head, height: head, borderRadius: head / 2, left: (width - head) / 2 - border, top: full * 0.2, backgroundColor: profile.avatarSilhouette },
        ]}
      />
      <View
        style={[
          styles.part,
          {
            width: size * 0.74,
            height: full * 0.5,
            left: size * 0.13 - border,
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
