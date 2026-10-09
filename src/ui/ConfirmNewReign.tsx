import { Modal, StyleSheet, Text, View } from 'react-native';
import { GameButton } from './GameButton';
import { SkinPanel } from './skin/SkinPanel';
import { useSkin } from './skin/SkinProvider';
import { useSkinTextStyles } from './skin/textStyles';
import { strings } from './strings';
import { spacing } from './theme';

interface Props {
  readonly visible: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Asks before beginning a reign that would discard the one in progress. */
export function ConfirmNewReign({ visible, onConfirm, onCancel }: Props) {
  const skin = useSkin();
  const text = useSkinTextStyles();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: skin.screen.lockedOverlay }]}>
        <SkinPanel style={styles.dialog}>
          <Text style={text.body}>{strings.confirmNewReign}</Text>
          <GameButton label={strings.confirmDiscard} onPress={onConfirm} />
          <GameButton label={strings.keepReign} onPress={onCancel} />
        </SkinPanel>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  dialog: { alignSelf: 'stretch' },
});
