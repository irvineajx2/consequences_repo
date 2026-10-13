// An achievement badge. Earned: its art, or until the art exists a gold circle with the title's
// initial. Unearned: the empty badge base, darkened (as the meters' drained copies are), so a hidden
// achievement shows nothing of itself.
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSkin } from '../skin/SkinProvider';

export const BADGE_SIZE = 56;

interface Props {
  readonly id: string;
  /** Only used for an earned badge's placeholder initial. */
  readonly title: string;
  readonly earned: boolean;
  readonly size?: number;
}

/** How dark an unearned badge base is drawn. */
const UNEARNED_SHADE = 'rgba(8, 6, 10, 0.62)';

export function Badge({ id, title, earned, size = BADGE_SIZE }: Props) {
  const skin = useSkin();
  const { badges } = skin.profile;
  const box = { width: size, height: size };
  const circle = { ...box, borderRadius: size / 2 };
  if (earned) {
    const art = badges[id];
    if (art !== undefined) return <Image source={art} style={box} resizeMode="contain" />;
    return (
      <View style={[styles.centre, circle, { backgroundColor: skin.profile.badgeFill }]}>
        <Text style={{ fontFamily: skin.fonts.caption, color: skin.profile.badgeText, fontSize: size * 0.45 }}>
          {title.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }
  const base = badges.badge_base;
  return (
    <View style={box}>
      {base !== undefined ? (
        <Image source={base} style={box} resizeMode="contain" />
      ) : (
        <View style={[circle, { backgroundColor: skin.profile.badgeFill }]} />
      )}
      <View style={[StyleSheet.absoluteFill, circle, { backgroundColor: UNEARNED_SHADE }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
});
