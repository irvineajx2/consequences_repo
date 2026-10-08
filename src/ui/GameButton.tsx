import { Pressable, StyleSheet, Text } from 'react-native';
import { NineSlice } from './skin/NineSlice';
import { useSkin } from './skin/SkinProvider';
import { useSkinTextStyles } from './skin/textStyles';
import { spacing } from './theme';

interface Props {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  /** Overrides the skin's minimum height, e.g. to fit a crowded panel. */
  readonly minHeight?: number;
}

/** A full-width skinned button. Long labels wrap and the button grows; nothing is truncated. */
export function GameButton({ label, onPress, disabled = false, minHeight }: Props) {
  const skin = useSkin();
  const { button } = skin;
  const text = useSkinTextStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && { opacity: button.disabledOpacity },
        pressed && { transform: [{ scale: button.pressed.scale }] },
      ]}
    >
      {({ pressed }) => (
        <NineSlice
          frame={button.frame}
          scale={button.scale}
          images={skin.images}
          contentPadding={button.contentPadding}
          tint={pressed ? button.pressed.overlay : undefined}
          style={[styles.frame, { minHeight: minHeight ?? button.minHeight }]}
        >
          <Text style={[text.button, styles.label]}>{label}</Text>
        </NineSlice>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
  frame: { justifyContent: 'center' },
  label: { textAlign: 'center' },
});
