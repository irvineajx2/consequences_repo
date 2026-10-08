import ui from '../data/ui.en.json';

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
