import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSkin } from '../skin/SkinProvider';
import { spacing, textSizes } from '../theme';

interface Props {
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  /** Buttons pinned below the scrolling content. */
  readonly footer?: ReactNode;
}

/** A full-screen list page on the skin's dark background: title, scrolling content, footer. */
export function ScreenScaffold({ title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const skin = useSkin();
  const heading = { fontFamily: skin.fonts.caption, color: skin.screen.text };
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: skin.colors.screenBackground,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.sm,
          paddingLeft: insets.left + spacing.sm,
          paddingRight: insets.right + spacing.sm,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[textSizes.heading, heading]}>{title}</Text>
        {subtitle !== undefined && (
          <Text style={[textSizes.muted, { fontFamily: skin.fonts.body, color: skin.screen.mutedText }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      {footer !== undefined && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.sm, marginBottom: spacing.sm, gap: 2 },
  scroll: { flex: 1 },
  content: { gap: spacing.sm, paddingBottom: spacing.sm },
  footer: { paddingTop: spacing.xs },
});
