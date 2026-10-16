// The default skin: AJ's parchment panel and navy buttons. Panel, button, colour and font values
// come from docs/skins/tudor/tudor.skin.json; the illustrated meters and their sizes from
// assets/ui/skins/tudor/meters/.
import caesarMeterFile from '../../../assets/ui/skins/tudor/meters/julius-caesar/meters.json';
import charlesMeterFile from '../../../assets/ui/skins/tudor/meters/charles-i/meters.json';
import cleopatraMeterFile from '../../../assets/ui/skins/tudor/meters/cleopatra/meters.json';
import meterFile from '../../../assets/ui/skins/tudor/meters/meters.json';
import progressionLayout from '../../../assets/ui/skins/tudor/progression/progression_ui.json';
import rankFile from '../../../assets/ui/skins/tudor/progression/rank_ui.json';
import { tudorBadges } from './tudorBadges';
import type { Skin } from './types';

/** AJ's meter sizes, minus the file's note. */
const { _note: _meterNote, ...elizabethMeterMetrics } = meterFile;
const { _note: _caesarMeterNote, ...caesarMeterMetrics } = caesarMeterFile;
const { _note: _rankNote, ...rankArt } = rankFile;
// Later rulers' sheets give every piece one height (48 pt, the art drawn for the 1.2x icon scale)
// and its aspect. Their names would clash with Elizabeth's (all have a treasury), so their pieces
// are registered as <ruler>_<piece>. Charles's Church gauge is drawn at Elizabeth's Religion
// gauge's proportions: ends 24 pt and marker 30 pt before scaling, padding in proportion.
interface RulerMeterFile {
  readonly heightPt: number;
  readonly effectPadPt: number;
  readonly pieces: Readonly<Record<string, { readonly aspect: number }>>;
}
const prefixedMetrics = (file: RulerMeterFile, prefix: string, gaugeHeights: Readonly<Record<string, number>> = {}) =>
  Object.fromEntries(
    Object.entries(file.pieces).map(([piece, { aspect }]) => {
      const heightPt = gaugeHeights[piece] ?? file.heightPt;
      const effectPadPt = (file.effectPadPt * heightPt) / file.heightPt;
      return [`${prefix}${piece}`, { heightPt, aspect, effectPadPt }];
    }),
  );
const charlesMeterMetrics = prefixedMetrics(charlesMeterFile, 'charles_', { church_puritan: 24, church_high: 24, church_marker: 30 });
const cleopatraMeterMetrics = prefixedMetrics(cleopatraMeterFile, 'cleopatra_');
// Image names are unique across rulers, so one table sizes them all.
const meterMetrics = { ...elizabethMeterMetrics, ...caesarMeterMetrics, ...charlesMeterMetrics, ...cleopatraMeterMetrics };

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
      'julius-caesar': {
        fortune: { full: 'fortune', empty: 'fortune_empty' },
        legions: { full: 'legions', empty: 'legions_empty' },
        people: { full: 'people', empty: 'people_empty' },
        senate: { full: 'senate', empty: 'senate_empty' },
        glory: { full: 'glory', empty: 'glory_empty' },
      },
      // Charles I's sheet: chest, mace, lobster-tail helmet, crown; plain book, church, mitre.
      'charles-i': {
        treasury: { full: 'charles_treasury', empty: 'charles_treasury_empty' },
        parliament: { full: 'charles_parliament', empty: 'charles_parliament_empty' },
        church: { marker: 'charles_church_marker', left: 'charles_church_puritan', right: 'charles_church_high' },
        army: { full: 'charles_army', empty: 'charles_army_empty' },
        majesty: { full: 'charles_majesty', empty: 'charles_majesty_empty' },
      },
      // Cleopatra's sheet: grain jar, Pharos, Isis crown, galley prow, Roman helmet.
      cleopatra: {
        treasury: { full: 'cleopatra_treasury', empty: 'cleopatra_treasury_empty' },
        alexandria: { full: 'cleopatra_alexandria', empty: 'cleopatra_alexandria_empty' },
        divinity: { full: 'cleopatra_divinity', empty: 'cleopatra_divinity_empty' },
        fleet: { full: 'cleopatra_fleet', empty: 'cleopatra_fleet_empty' },
        rome: { full: 'cleopatra_rome', empty: 'cleopatra_rome_empty' },
      },
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
      // Julius Caesar
      fortune: require('../../../assets/ui/skins/tudor/meters/julius-caesar/fortune.png'),
      fortune_empty: require('../../../assets/ui/skins/tudor/meters/julius-caesar/fortune_empty.png'),
      fortune_glow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/fortune_glow.png'),
      fortune_shadow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/fortune_shadow.png'),
      glory: require('../../../assets/ui/skins/tudor/meters/julius-caesar/glory.png'),
      glory_empty: require('../../../assets/ui/skins/tudor/meters/julius-caesar/glory_empty.png'),
      glory_glow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/glory_glow.png'),
      glory_shadow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/glory_shadow.png'),
      legions: require('../../../assets/ui/skins/tudor/meters/julius-caesar/legions.png'),
      legions_empty: require('../../../assets/ui/skins/tudor/meters/julius-caesar/legions_empty.png'),
      legions_glow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/legions_glow.png'),
      legions_shadow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/legions_shadow.png'),
      people: require('../../../assets/ui/skins/tudor/meters/julius-caesar/people.png'),
      people_empty: require('../../../assets/ui/skins/tudor/meters/julius-caesar/people_empty.png'),
      people_glow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/people_glow.png'),
      people_shadow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/people_shadow.png'),
      senate: require('../../../assets/ui/skins/tudor/meters/julius-caesar/senate.png'),
      senate_empty: require('../../../assets/ui/skins/tudor/meters/julius-caesar/senate_empty.png'),
      senate_glow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/senate_glow.png'),
      senate_shadow: require('../../../assets/ui/skins/tudor/meters/julius-caesar/senate_shadow.png'),
      // Charles I (files named without the charles_ prefix)
      charles_army: require('../../../assets/ui/skins/tudor/meters/charles-i/army.png'),
      charles_army_empty: require('../../../assets/ui/skins/tudor/meters/charles-i/army_empty.png'),
      charles_army_glow: require('../../../assets/ui/skins/tudor/meters/charles-i/army_glow.png'),
      charles_army_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/army_shadow.png'),
      charles_majesty: require('../../../assets/ui/skins/tudor/meters/charles-i/majesty.png'),
      charles_majesty_empty: require('../../../assets/ui/skins/tudor/meters/charles-i/majesty_empty.png'),
      charles_majesty_glow: require('../../../assets/ui/skins/tudor/meters/charles-i/majesty_glow.png'),
      charles_majesty_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/majesty_shadow.png'),
      charles_parliament: require('../../../assets/ui/skins/tudor/meters/charles-i/parliament.png'),
      charles_parliament_empty: require('../../../assets/ui/skins/tudor/meters/charles-i/parliament_empty.png'),
      charles_parliament_glow: require('../../../assets/ui/skins/tudor/meters/charles-i/parliament_glow.png'),
      charles_parliament_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/parliament_shadow.png'),
      charles_treasury: require('../../../assets/ui/skins/tudor/meters/charles-i/treasury.png'),
      charles_treasury_empty: require('../../../assets/ui/skins/tudor/meters/charles-i/treasury_empty.png'),
      charles_treasury_glow: require('../../../assets/ui/skins/tudor/meters/charles-i/treasury_glow.png'),
      charles_treasury_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/treasury_shadow.png'),
      charles_church_high: require('../../../assets/ui/skins/tudor/meters/charles-i/church_high.png'),
      charles_church_high_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/church_high_shadow.png'),
      charles_church_marker: require('../../../assets/ui/skins/tudor/meters/charles-i/church_marker.png'),
      charles_church_marker_glow: require('../../../assets/ui/skins/tudor/meters/charles-i/church_marker_glow.png'),
      charles_church_marker_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/church_marker_shadow.png'),
      charles_church_puritan: require('../../../assets/ui/skins/tudor/meters/charles-i/church_puritan.png'),
      charles_church_puritan_shadow: require('../../../assets/ui/skins/tudor/meters/charles-i/church_puritan_shadow.png'),
      // Cleopatra (files named without the cleopatra_ prefix)
      cleopatra_alexandria: require('../../../assets/ui/skins/tudor/meters/cleopatra/alexandria.png'),
      cleopatra_alexandria_empty: require('../../../assets/ui/skins/tudor/meters/cleopatra/alexandria_empty.png'),
      cleopatra_alexandria_glow: require('../../../assets/ui/skins/tudor/meters/cleopatra/alexandria_glow.png'),
      cleopatra_alexandria_shadow: require('../../../assets/ui/skins/tudor/meters/cleopatra/alexandria_shadow.png'),
      cleopatra_divinity: require('../../../assets/ui/skins/tudor/meters/cleopatra/divinity.png'),
      cleopatra_divinity_empty: require('../../../assets/ui/skins/tudor/meters/cleopatra/divinity_empty.png'),
      cleopatra_divinity_glow: require('../../../assets/ui/skins/tudor/meters/cleopatra/divinity_glow.png'),
      cleopatra_divinity_shadow: require('../../../assets/ui/skins/tudor/meters/cleopatra/divinity_shadow.png'),
      cleopatra_fleet: require('../../../assets/ui/skins/tudor/meters/cleopatra/fleet.png'),
      cleopatra_fleet_empty: require('../../../assets/ui/skins/tudor/meters/cleopatra/fleet_empty.png'),
      cleopatra_fleet_glow: require('../../../assets/ui/skins/tudor/meters/cleopatra/fleet_glow.png'),
      cleopatra_fleet_shadow: require('../../../assets/ui/skins/tudor/meters/cleopatra/fleet_shadow.png'),
      cleopatra_rome: require('../../../assets/ui/skins/tudor/meters/cleopatra/rome.png'),
      cleopatra_rome_empty: require('../../../assets/ui/skins/tudor/meters/cleopatra/rome_empty.png'),
      cleopatra_rome_glow: require('../../../assets/ui/skins/tudor/meters/cleopatra/rome_glow.png'),
      cleopatra_rome_shadow: require('../../../assets/ui/skins/tudor/meters/cleopatra/rome_shadow.png'),
      cleopatra_treasury: require('../../../assets/ui/skins/tudor/meters/cleopatra/treasury.png'),
      cleopatra_treasury_empty: require('../../../assets/ui/skins/tudor/meters/cleopatra/treasury_empty.png'),
      cleopatra_treasury_glow: require('../../../assets/ui/skins/tudor/meters/cleopatra/treasury_glow.png'),
      cleopatra_treasury_shadow: require('../../../assets/ui/skins/tudor/meters/cleopatra/treasury_shadow.png'),
    },
    layout: { iconScale: 1.2, fillHeight: 40, balanceWidth: 130, gap: 9, margin: 12, shadowOffset: 2 },
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
  progression: {
    images: {
      bar_left: require('../../../assets/ui/skins/tudor/progression/bar_left.png'),
      bar_mid: require('../../../assets/ui/skins/tudor/progression/bar_mid.png'),
      bar_right: require('../../../assets/ui/skins/tudor/progression/bar_right.png'),
      coin: require('../../../assets/ui/skins/tudor/progression/coin.png'),
      gem_common: require('../../../assets/ui/skins/tudor/progression/gem_common.png'),
      gem_legendary: require('../../../assets/ui/skins/tudor/progression/gem_legendary.png'),
      gem_rare: require('../../../assets/ui/skins/tudor/progression/gem_rare.png'),
      gem_uncommon: require('../../../assets/ui/skins/tudor/progression/gem_uncommon.png'),
      laurel: require('../../../assets/ui/skins/tudor/progression/laurel.png'),
      laurel_major: require('../../../assets/ui/skins/tudor/progression/laurel_major.png'),
      medallion_blue: require('../../../assets/ui/skins/tudor/progression/medallion_blue.png'),
      medallion_gold: require('../../../assets/ui/skins/tudor/progression/medallion_gold.png'),
      medallion_green: require('../../../assets/ui/skins/tudor/progression/medallion_green.png'),
      medallion_purple: require('../../../assets/ui/skins/tudor/progression/medallion_purple.png'),
      medallion_red: require('../../../assets/ui/skins/tudor/progression/medallion_red.png'),
    },
    layout: progressionLayout,
    ranks: rankArt,
    colors: {
      xpFill: '#E2B54F',
      plate: 'rgba(14, 12, 16, 0.62)',
      rank: '#E8BE5C',
      level: '#F4E7C8',
      gold: '#F4E7C8',
    },
  },
  profile: {
    rarity: { common: '#E8D9B0', uncommon: '#5E9A55', rare: '#4A7CC4', epic: '#8A5BC0', legendary: '#E2B54F' },
    rankTint: { blue: '#2B4C7E', green: '#2F6B45', red: '#8E2B2B', purple: '#5E3A82', gold: '#B8862B' },
    avatarFrame: '#C9A045',
    avatarFill: '#E9DBBB',
    avatarSilhouette: 'rgba(122, 82, 35, 0.28)',
    badgeFill: '#C9A045',
    badgeText: '#2A1D10',
    badges: tudorBadges,
  },
  screen: {
    text: '#F1E2BF',
    mutedText: 'rgba(241, 226, 191, 0.65)',
    highlight: '#B8862B',
    highlightFill: 'rgba(201, 160, 69, 0.22)',
    lockedOverlay: 'rgba(12, 10, 14, 0.78)',
  },
};
