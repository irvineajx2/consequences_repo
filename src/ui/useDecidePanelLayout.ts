import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type DecidePanelLayout, decidePanelLayout } from './decidePanelLayout';
import { useSkin } from './skin/SkinProvider';
import { panelMaxScreenShare, spacing, textSizes } from './theme';

/** Fractions like '35%' as numbers. */
const share = (percent: string) => Number.parseFloat(percent) / 100;

/** Choice-scene panel sizing for this screen, skin and number of options. */
export function useDecidePanelLayout(optionCount: number): DecidePanelLayout {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { panel, button } = useSkin();
  return decidePanelLayout(height, optionCount, {
    bottomInset: insets.bottom,
    outerGap: spacing.sm,
    panelPadding: panel.contentPadding.vertical,
    buttonHeight: button.minHeight,
    buttonGap: spacing.sm,
    narrationLineHeight: textSizes.body.lineHeight,
    readShare: share(panelMaxScreenShare),
  });
}
