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
