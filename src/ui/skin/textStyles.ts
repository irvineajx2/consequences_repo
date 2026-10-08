import { useMemo } from 'react';
import type { TextStyle } from 'react-native';
import { textSizes } from '../theme';
import { useSkin } from './SkinProvider';
import type { Skin } from './types';

export interface SkinTextStyles {
  readonly caption: TextStyle;
  readonly heading: TextStyle;
  readonly body: TextStyle;
  readonly muted: TextStyle;
  readonly button: TextStyle;
}

/** Text styles for the panel and buttons: sizes from the theme, fonts and colours from the skin. */
export function skinTextStyles(skin: Skin): SkinTextStyles {
  return {
    caption: { ...textSizes.caption, fontFamily: skin.fonts.caption, color: skin.colors.panelCaption },
    heading: { ...textSizes.heading, fontFamily: skin.fonts.caption, color: skin.colors.panelText },
    body: { ...textSizes.body, fontFamily: skin.fonts.body, color: skin.colors.panelText },
    muted: { ...textSizes.muted, fontFamily: skin.fonts.body, color: skin.colors.panelCaption },
    button: { ...textSizes.button, fontFamily: skin.fonts.button, color: skin.colors.buttonText },
  };
}

export function useSkinTextStyles(): SkinTextStyles {
  const skin = useSkin();
  return useMemo(() => skinTextStyles(skin), [skin]);
}
