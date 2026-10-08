#!/usr/bin/env node
/**
 * Fills a ruler's text.en.json with an entry for every scene, option, beat and ending in its
 * rules.json, and a name for every meter its ui.json shows. Existing text is never overwritten,
 * so this is safe to re-run after rules change.
 *
 * Option text defaults to the option's label, scene captions to "<title>, <year>" and beat
 * captions to the beat id. Narration, consequence, beat and ending text are placeholders. When an
 * option id appears in several variants of a scene with different labels, the first label goes in
 * `options` and the others go in `variants.<index>.options` (same for consequences).
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

const fill = (obj, key, value) => {
  if (obj[key] === undefined) obj[key] = value;
  return obj[key];
};

fill(text, 'ruler', {});
fill(text.ruler, 'name', rules.ruler);
fill(text.ruler, 'short_name', rules.ruler);
fill(text, 'meters', {});
fill(text, 'scenes', {});
fill(text, 'beats', {});
fill(text, 'endings', {});

// Hidden meters get no name, so they cannot be shown by mistake.
const shownMeters = ui ? ui.meters.filter((m) => m.visible).map((m) => m.id) : Object.keys(rules.meters);
for (const id of shownMeters) fill(fill(text.meters, id, {}), 'name', id);

for (const scene of rules.scenes) {
  const entry = fill(text.scenes, scene.id, {});
  fill(entry, 'caption', `${scene.title}, ${scene.year}`);
  fill(entry, 'narration', NARRATION);
  fill(entry, 'options', {});
  fill(entry, 'consequences', {});

  const variants = scene.variants || [{ options: scene.options }];
  const baseLabels = {};
  variants.forEach((variant, index) => {
    for (const option of variant.options || []) {
      if (baseLabels[option.id] === undefined) {
        baseLabels[option.id] = option.label;
        fill(entry.options, option.id, option.label);
        fill(entry.consequences, option.id, CONSEQUENCE);
      } else if (baseLabels[option.id] !== option.label) {
        const override = fill(fill(entry, 'variants', {}), String(index), {});
        fill(fill(override, 'options', {}), option.id, option.label);
        fill(fill(override, 'consequences', {}), option.id, CONSEQUENCE);
      }
    }
  });
}

for (const id of Object.keys(rules.beats || {})) {
  const entry = fill(text.beats, id, {});
  fill(entry, 'caption', id);
  fill(entry, 'text', BEAT);
}

for (const [id, ending] of Object.entries(rules.endings)) {
  const entry = fill(text.endings, id, {});
  fill(entry, 'title', ending.title);
  fill(entry, 'text', ENDING);
}

fs.writeFileSync(textPath, JSON.stringify(text, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), textPath)}`);
