#!/usr/bin/env node
/**
 * Fills a ruler's text.en.json with an entry for every scene, option and ending in its rules.json.
 * Existing text is never overwritten, so this is safe to re-run after rules change.
 *
 * Option text defaults to the option's label, captions to "<title>, <year>". Narration,
 * consequence and ending text are placeholders. When an option id appears in several variants of a
 * scene with different labels, the first label goes in `options` and the others go in
 * `variants.<index>.options` (same for consequences).
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

const NARRATION = '[Narration to be written]';
const CONSEQUENCE = '[Consequence to be written]';
const ENDING = '[Ending text to be written]';

const fill = (obj, key, value) => {
  if (obj[key] === undefined) obj[key] = value;
  return obj[key];
};

fill(text, 'ruler', {});
fill(text.ruler, 'name', rules.ruler);
fill(text.ruler, 'short_name', rules.ruler);
fill(text, 'scenes', {});
fill(text, 'endings', {});

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

for (const [id, ending] of Object.entries(rules.endings)) {
  const entry = fill(text.endings, id, {});
  fill(entry, 'title', ending.title);
  fill(entry, 'text', ENDING);
}

fs.writeFileSync(textPath, JSON.stringify(text, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), textPath)}`);
