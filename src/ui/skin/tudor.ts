// The default skin: AJ's parchment panel and navy buttons. Values from docs/skins/tudor/tudor.skin.json.
import type { Skin } from './types';

export const tudorSkin: Skin = {
  id: 'tudor',
  name: 'Tudor',
  panel: {
    frame: { prefix: 'panel', inset: 110 },
    fill: { image: 'panel_fill', inset: 12 },
    ornaments: [
      { image: 'panel_ornament_top', anchor: 'top-center' },
      { image: 'panel_ornament_bottom', anchor: 'bottom-center' },
    ],
    scale: 0.27,
    contentPadding: { horizontal: 26, vertical: 22 },
  },
  button: {
    frame: { prefix: 'button', inset: 112, hasCentre: true },
    scale: 0.2,
    minHeight: 56,
    contentPadding: { horizontal: 26, vertical: 12 },
    pressed: { overlay: 'rgba(0,0,0,0.22)', scale: 0.98 },
    disabledOpacity: 0.5,
  },
  colors: {
    panelText: '#3B2A1A',
    panelCaption: '#7A5223',
    buttonText: '#F1E2BF',
    screenBackground: '#1C1A1F',
  },
  fonts: { caption: 'Cinzel', body: 'EB Garamond', button: 'EB Garamond' },
  images: {
    panel_tl: require('../../../assets/ui/skins/tudor/panel_tl.png'),
    panel_t: require('../../../assets/ui/skins/tudor/panel_t.png'),
    panel_tr: require('../../../assets/ui/skins/tudor/panel_tr.png'),
    panel_l: require('../../../assets/ui/skins/tudor/panel_l.png'),
    panel_r: require('../../../assets/ui/skins/tudor/panel_r.png'),
    panel_bl: require('../../../assets/ui/skins/tudor/panel_bl.png'),
    panel_b: require('../../../assets/ui/skins/tudor/panel_b.png'),
    panel_br: require('../../../assets/ui/skins/tudor/panel_br.png'),
    panel_fill: require('../../../assets/ui/skins/tudor/panel_fill.png'),
    panel_ornament_top: require('../../../assets/ui/skins/tudor/panel_ornament_top.png'),
    panel_ornament_bottom: require('../../../assets/ui/skins/tudor/panel_ornament_bottom.png'),
    button_tl: require('../../../assets/ui/skins/tudor/button_tl.png'),
    button_t: require('../../../assets/ui/skins/tudor/button_t.png'),
    button_tr: require('../../../assets/ui/skins/tudor/button_tr.png'),
    button_l: require('../../../assets/ui/skins/tudor/button_l.png'),
    button_c: require('../../../assets/ui/skins/tudor/button_c.png'),
    button_r: require('../../../assets/ui/skins/tudor/button_r.png'),
    button_bl: require('../../../assets/ui/skins/tudor/button_bl.png'),
    button_b: require('../../../assets/ui/skins/tudor/button_b.png'),
    button_br: require('../../../assets/ui/skins/tudor/button_br.png'),
  },
};
