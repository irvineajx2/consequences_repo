import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImage } from './images';
import { colors, spacing } from './theme';

interface Props {
  readonly image: string;
  readonly children: ReactNode;
}

/**
 * A full-screen image with a bottom panel over its lower part. The panel scrolls when its content
 * is taller than the space it has; the image never shrinks.
 */
export function SceneFrame({ image, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Image source={getImage(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      <LinearGradient
        colors={colors.panelGradient}
        locations={colors.panelGradientStops}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.panel}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: insets.bottom + spacing.lg,
              paddingLeft: insets.left + spacing.lg,
              paddingRight: insets.right + spacing.lg,
            },
          ]}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '58%' },
  scroll: { flexGrow: 0 },
  content: { paddingTop: spacing.lg },
});
