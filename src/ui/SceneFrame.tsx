import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImage } from './images';
import { SkinPanel } from './skin/SkinPanel';
import { useSkin } from './skin/SkinProvider';
import { spacing } from './theme';

interface Props {
  readonly image: string;
  readonly children: ReactNode;
}

/**
 * A full-screen image with the skin's panel over its lower part. The panel's content scrolls when
 * it is taller than the space it has; the image never shrinks.
 */
export function SceneFrame({ image, children }: Props) {
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  return (
    <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]}>
      <Image source={getImage(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      <View
        style={[
          styles.panelArea,
          {
            paddingBottom: insets.bottom + spacing.sm,
            paddingLeft: insets.left + spacing.sm,
            paddingRight: insets.right + spacing.sm,
          },
        ]}
      >
        <SkinPanel style={styles.panel}>
          <ScrollView style={styles.scroll}>{children}</ScrollView>
        </SkinPanel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panelArea: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '62%' },
  panel: { flexShrink: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
