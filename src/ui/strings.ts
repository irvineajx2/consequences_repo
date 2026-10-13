import ui from '../data/strings.en.json';

export const strings = ui;

/** Replaces `{name}` placeholders in a UI string. */
export function format(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** The display name of an ending category (e.g. "fallen_short" -> "Fallen short"). */
export function categoryLabel(category: string): string {
  return (strings.categories as Record<string, string>)[category] ?? category;
}

/** A whole number with thousands separators ("1,240"), the same on every platform. */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** The display name of an ending band (e.g. "legendary" -> "Legendary"). */
export function bandLabel(band: string): string {
  return (strings.bands as Record<string, string>)[band] ?? band;
}

/** A date as "12 Oct 2026", the same on every platform (from an ISO timestamp). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${strings.months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The display name of an ending rarity tier. */
export function rarityLabel(tier: string): string {
  return (strings.rarityTiers as Record<string, string>)[tier] ?? tier;
}

/** A share (0..1) as a short percentage: "3%", "0.4%", "0.02%". */
export function formatShare(share: number): string {
  const pct = share * 100;
  const digits = pct >= 10 ? 0 : pct >= 1 ? 1 : pct >= 0.1 ? 2 : 3;
  return `${Number(pct.toFixed(digits))}%`;
}
