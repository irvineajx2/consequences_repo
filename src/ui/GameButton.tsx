import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, type } from './theme';

interface Props {
  readonly label: string;
  readonly onPress: () => void;
}

export function GameButton({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={type.button}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.buttonFill,
    borderRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  pressed: { backgroundColor: colors.buttonFillPressed },
});
