#!/usr/bin/env node
/**
 * Fills a ruler's text.en.json with an entry for every scene, beat and ending in its rules.json, a
 * consequence for every option that does not end the run, a chronicle note per main scene (never
 * for branch scenes), and a name for every meter its ui.json shows. Existing text is never
 * overwritten, so this is safe to re-run after rules change.
 *
 * Option labels and ending titles are not copied: the game falls back to the rules for those, and a
 * text file only needs `options` / `title` where it overrides them. Scene captions default to
 * "<title>, <year>", beat captions to the beat id; narration, consequence, beat and ending text are
 * placeholders. When an option id appears in several variants of a scene with different labels, its
 * consequences for the later variants go in `variants.<index>.consequences`.
 *
 * Usage: node scripts/generate-text.js [ruler-id]   (default: elizabeth-i)
 */
const fs = require('fs');
const path = require('path');

const ruler = process.argv[2] || 'elizabeth-i';
const dir = path.join(__dirname, '..', 'src', 'data', 'rulers', ruler);
const rules = JSON.parse(fs.readFileSync(path.join(dir, 'rules.json'), 'utf8'));
const textPath = path.join(dir, 'text.en.json');
const text = fs.existsSync(textPath) ? JSON.parse(fs.readFileSync(textPath, 'utf8')) : {};
const uiPath = path.join(dir, 'ui.json');
const ui = fs.existsSync(uiPath) ? JSON.parse(fs.readFileSync(uiPath, 'utf8')) : null;

const NARRATION = '[Narration to be written]';
const CONSEQUENCE = '[Consequence to be written]';
const BEAT = '[Beat text to be written]';
const ENDING = '[Ending text to be written]';
const CHRONICLE = '[Historical note to be written]';
const AUTO_NARRATION = '[Auto narration to be written]';

const fill = (obj, key, value) => {
  if (obj[key] === undefined) obj[key] = value;
  return obj[key];
};

fill(text, 'ruler', {});
fill(text.ruler, 'name', rules.ruler);
fill(text.ruler, 'subtitle', '[Subtitle to be written]');
fill(text.ruler, 'tagline', '[Tagline to be written]');
if (ui && ui.prologue) {
  fill(text, 'prologue', {});
  fill(text.prologue, 'caption', '[Caption to be written]');
  fill(text.prologue, 'text', '[Prologue to be written]');
}
fill(text, 'eras', {});
for (const era of (ui && ui.eras) || []) {
  const entry = fill(text.eras, era.id, {});
  fill(entry, 'title', era.id);
  fill(entry, 'years', '[Years]');
  fill(entry, 'text', '[Era text to be written]');
}
fill(text, 'meters', {});
fill(text, 'scenes', {});
fill(text, 'beats', {});
fill(text, 'endings', {});
fill(text, 'chronicle', {});

// Hidden meters get no name, so they cannot be shown by mistake.
const shownMeters = ui ? ui.meters.filter((m) => m.visible).map((m) => m.id) : Object.keys(rules.meters);
for (const id of shownMeters) fill(fill(text.meters, id, {}), 'name', id);

for (const scene of rules.scenes) {
  const entry = fill(text.scenes, scene.id, {});
  fill(entry, 'caption', scene.year ? `${scene.title}, ${scene.year}` : scene.title);
  fill(entry, 'narration', NARRATION);
  if ((scene.variants || []).some((v) => v.auto)) fill(entry, 'auto_narration', AUTO_NARRATION);
  fill(entry, 'consequences', {});

  // An option ends the run if it has `end`, or both branches of one of its conds end it.
  const alwaysEnds = (o) => o.end !== undefined || (o.cond || []).some((c) => c.then.end && c.else && c.else.end);
  const variants = scene.variants || [{ options: scene.options }];
  const baseLabels = {};
  variants.forEach((variant, index) => {
    for (const option of variant.options || []) {
      if (alwaysEnds(option)) continue;
      if (baseLabels[option.id] === undefined) {
        baseLabels[option.id] = option.label;
        fill(entry.consequences, option.id, CONSEQUENCE);
      } else if (baseLabels[option.id] !== option.label) {
        const override = fill(fill(entry, 'variants', {}), String(index), {});
        fill(fill(override, 'consequences', {}), option.id, CONSEQUENCE);
      }
    }
  });
}

for (const scene of rules.scenes) {
  if (!scene.branch) fill(fill(text.chronicle, scene.id, {}), 'note', CHRONICLE);
}

for (const id of Object.keys(rules.beats || {})) {
  const entry = fill(text.beats, id, {});
  fill(entry, 'caption', id);
  fill(entry, 'text', BEAT);
}

for (const [id, ending] of Object.entries(rules.endings)) {
  const entry = fill(text.endings, id, {});
  // No title: the game takes it from the rules (or the ending id) unless the text overrides it.
  fill(entry, 'text', ENDING);
}

fs.writeFileSync(textPath, JSON.stringify(text, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), textPath)}`);
