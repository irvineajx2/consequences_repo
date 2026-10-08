// Shared colours, fonts and spacing. A later task can swap these for a full theme.
import { Platform } from 'react-native';

export const colors = {
  background: '#0d0b09',
  parchment: '#ead9b8',
  parchmentMuted: '#b9a888',
  gold: '#c9a45c',
  buttonFill: 'rgba(234, 217, 184, 0.08)',
  buttonFillPressed: 'rgba(201, 164, 92, 0.28)',
  buttonBorder: 'rgba(201, 164, 92, 0.65)',
  /** Behind the bottom panel, from transparent (top) to near-opaque (bottom). */
  panelGradient: ['rgba(13, 11, 9, 0)', 'rgba(13, 11, 9, 0.82)', 'rgba(13, 11, 9, 0.97)'],
  panelGradientStops: [0, 0.35, 1],
} as const;

export const fonts = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

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
  button: { fontFamily: fonts.serif, fontSize: 17, color: colors.parchment, textAlign: 'center' },
} as const;
