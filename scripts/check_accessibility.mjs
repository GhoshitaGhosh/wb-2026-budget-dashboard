import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'budget-frontend', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'budget-frontend', 'style.css'), 'utf8');

assert.match(html, /<html lang="en">/);
assert.match(html, /class="skip-link" href="#main-content"/);
assert.match(html, /<main id="main-content">/);
assert.match(html, /aria-label="Primary navigation"/);
assert.match(html, /<caption/);
assert.match(html, /<dialog[^>]+aria-labelledby=/);
assert.doesNotMatch(html, /onclick=/i);
assert.match(css, /:focus-visible/);
assert.match(css, /prefers-reduced-motion/);
console.log('Static accessibility contract checks passed.');
