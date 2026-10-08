import { Image } from 'expo-image';
import { type ReactNode, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getImage } from './images';
import { SkinPanel } from './skin/SkinPanel';
import { useSkin } from './skin/SkinProvider';
import { panelMaxScreenShare, spacing } from './theme';

interface Props {
  readonly image: string;
  /** Text that scrolls when it does not fit. */
  readonly children: ReactNode;
  /** Buttons below the text. They never scroll. */
  readonly footer?: ReactNode;
  /**
   * A fixed parchment height (points). Without it the panel fits its content, up to the bottom
   * `panelMaxScreenShare` of the screen.
   */
  readonly panelHeight?: number;
  /** Open the text scrolled to its end (e.g. narration that finishes on a question). */
  readonly scrollToEnd?: boolean;
  /** Changing this remounts the text area, resetting its scroll position. */
  readonly scrollKey?: string;
}

/** A full-screen image with the skin's panel over its lower part. The image never shrinks. */
export function SceneFrame({ image, children, footer, panelHeight, scrollToEnd, scrollKey }: Props) {
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  const scroll = useRef<ScrollView>(null);
  const fixed = panelHeight !== undefined;
  return (
    <View style={[styles.root, { backgroundColor: skin.colors.screenBackground }]}>
      <Image source={getImage(image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      <View
        style={[
          styles.panelArea,
          !fixed && { maxHeight: panelMaxScreenShare },
          {
            paddingBottom: insets.bottom + spacing.sm,
            paddingLeft: insets.left + spacing.sm,
            paddingRight: insets.right + spacing.sm,
          },
        ]}
      >
        <SkinPanel style={fixed ? { height: panelHeight } : styles.shrink}>
          <View style={fixed ? styles.fill : styles.shrink}>
            <ScrollView
              key={scrollKey}
              ref={scroll}
              style={fixed ? styles.fill : styles.scroll}
              onContentSizeChange={() => {
                if (scrollToEnd) scroll.current?.scrollToEnd({ animated: false });
              }}
            >
              {children}
            </ScrollView>
            {footer}
          </View>
        </SkinPanel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panelArea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shrink: { flexShrink: 1 },
  fill: { flex: 1 },
  scroll: { flexGrow: 0, flexShrink: 1 },
});
