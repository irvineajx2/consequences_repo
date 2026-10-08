// Shared layout and typography. The panel and buttons take their colours and fonts from the skin
// (src/ui/skin); this file holds sizes, spacing and the title screen's styles.
import { Platform } from 'react-native';

export const colors = {
  background: '#0d0b09',
  parchment: '#ead9b8',
  parchmentMuted: '#b9a888',
  gold: '#c9a45c',
} as const;

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

/** The panel never covers more than this share of the screen (bottom up); its content scrolls. */
export const panelMaxScreenShare = '35%';

/**
 * Sizes for skinned text; fonts and colours come from the skin. Kept compact so a scene's caption,
 * narration and first option fit in the capped panel, with line heights of at least 1.3x so wrapped
 * lines never crowd each other.
 */
export const textSizes = {
  caption: { fontSize: 11, letterSpacing: 1, lineHeight: 15 },
  heading: { fontSize: 19, lineHeight: 25 },
  body: { fontSize: 15, lineHeight: 21 },
  muted: { fontSize: 13, lineHeight: 18 },
  button: { fontSize: 15, lineHeight: 20 },
} as const;

export const type = {
  title: { fontFamily: fonts.serif, fontSize: 40, color: colors.parchment },
  heading: { fontFamily: fonts.serif, fontSize: 26, color: colors.parchment },
  caption: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  body: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, color: colors.parchment },
  muted: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, color: colors.parchmentMuted },
} as const;
