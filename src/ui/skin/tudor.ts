// The default skin: AJ's parchment panel and navy buttons. Panel, button, colour and font values
// come from docs/skins/tudor/tudor.skin.json; the illustrated meters and their sizes from
// assets/ui/skins/tudor/meters/.
import meterFile from '../../../assets/ui/skins/tudor/meters/meters.json';
import type { Skin } from './types';

/** AJ's meter sizes, minus the file's note. */
const { _note: _meterNote, ...meterMetrics } = meterFile;

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
  meters: {
    art: {
      'elizabeth-i': {
        tr: { full: 'treasury', empty: 'treasury_empty' },
        auth: { full: 'authority', empty: 'authority_empty' },
        navy: { full: 'navy', empty: 'navy_empty' },
        succ: { full: 'succession', empty: 'succession_empty' },
        rel: { marker: 'religion_church', left: 'religion_keys', right: 'religion_bible' },
      },
      // Julius Caesar's illustrated meters are still to come: placeholder medals until then.
    },
    metrics: meterMetrics,
    images: {
      authority: require('../../../assets/ui/skins/tudor/meters/authority.png'),
      authority_empty: require('../../../assets/ui/skins/tudor/meters/authority_empty.png'),
      authority_glow: require('../../../assets/ui/skins/tudor/meters/authority_glow.png'),
      authority_shadow: require('../../../assets/ui/skins/tudor/meters/authority_shadow.png'),
      navy: require('../../../assets/ui/skins/tudor/meters/navy.png'),
      navy_empty: require('../../../assets/ui/skins/tudor/meters/navy_empty.png'),
      navy_glow: require('../../../assets/ui/skins/tudor/meters/navy_glow.png'),
      navy_shadow: require('../../../assets/ui/skins/tudor/meters/navy_shadow.png'),
      religion_bible: require('../../../assets/ui/skins/tudor/meters/religion_bible.png'),
      religion_bible_shadow: require('../../../assets/ui/skins/tudor/meters/religion_bible_shadow.png'),
      religion_church: require('../../../assets/ui/skins/tudor/meters/religion_church.png'),
      religion_church_glow: require('../../../assets/ui/skins/tudor/meters/religion_church_glow.png'),
      religion_church_shadow: require('../../../assets/ui/skins/tudor/meters/religion_church_shadow.png'),
      religion_keys: require('../../../assets/ui/skins/tudor/meters/religion_keys.png'),
      religion_keys_shadow: require('../../../assets/ui/skins/tudor/meters/religion_keys_shadow.png'),
      succession: require('../../../assets/ui/skins/tudor/meters/succession.png'),
      succession_empty: require('../../../assets/ui/skins/tudor/meters/succession_empty.png'),
      succession_glow: require('../../../assets/ui/skins/tudor/meters/succession_glow.png'),
      succession_shadow: require('../../../assets/ui/skins/tudor/meters/succession_shadow.png'),
      treasury: require('../../../assets/ui/skins/tudor/meters/treasury.png'),
      treasury_empty: require('../../../assets/ui/skins/tudor/meters/treasury_empty.png'),
      treasury_glow: require('../../../assets/ui/skins/tudor/meters/treasury_glow.png'),
      treasury_shadow: require('../../../assets/ui/skins/tudor/meters/treasury_shadow.png'),
    },
    layout: { fillHeight: 40, balanceWidth: 130, gap: 9, margin: 12, shadowOffset: 2 },
    colors: {
      trackBacking: 'rgba(20, 16, 12, 0.9)',
      trackSafe: '#C9A045',
      trackDanger: '#A3242B',
      chevronUp: '#E2B54F',
      chevronDown: '#C0392B',
      medalFull: '#C9A045',
      medalEmpty: '#5A5246',
      medalRim: '#14100C',
      medalText: '#2A1D10',
      medalGlow: 'rgba(214, 48, 39, 0.85)',
    },
  },
  screen: {
    text: '#F1E2BF',
    mutedText: 'rgba(241, 226, 191, 0.65)',
    highlight: '#B8862B',
    highlightFill: 'rgba(201, 160, 69, 0.22)',
    lockedOverlay: 'rgba(12, 10, 14, 0.78)',
  },
};
