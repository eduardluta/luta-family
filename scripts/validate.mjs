#!/usr/bin/env node
/**
 * validate.mjs — check data/family.js, the file people actually edit.
 *
 *   node scripts/validate.mjs
 *
 * Exits non-zero on anything that would render as a silently broken tree: an
 * orphaned subtree, a generation that skips a row, a photo that is not there.
 * Runs in CI before every deploy.
 *
 * (build-data.mjs validates the original export instead — a different file, for
 * a different job. This is the one that guards hand edits.)
 */

import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PEOPLE, BRANCHES, ROOT_ID } from '../data/family.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTO_DIR = join(ROOT, 'assets', 'photos');

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const byId = new Map();
for (const p of PEOPLE) {
  if (byId.has(p.id)) fail(`duplicate id "${p.id}" — ids must be unique and permanent`);
  byId.set(p.id, p);
}

const photos = existsSync(PHOTO_DIR) ? new Set(readdirSync(PHOTO_DIR)) : new Set();
const usedPhotos = new Set();

for (const p of PEOPLE) {
  const who = `${p.id} (${p.name})`;

  if (!p.name?.trim()) fail(`${p.id}: missing name`);
  if (!['m', 'f'].includes(p.sex)) fail(`${who}: sex must be 'm' or 'f', got ${JSON.stringify(p.sex)}`);
  if (!Number.isInteger(p.gen) || p.gen < 1) fail(`${who}: gen must be a positive integer`);
  if (p.branch && !BRANCHES[p.branch]) fail(`${who}: unknown branch "${p.branch}"`);

  // Lineage integrity — the failure mode that renders as a floating subtree.
  if (p.parent) {
    const parent = byId.get(p.parent);
    if (!parent) fail(`${who}: parent "${p.parent}" does not exist`);
    else if (parent.gen !== p.gen - 1) {
      fail(`${who}: gen ${p.gen} under "${parent.name}" who is gen ${parent.gen} — must be parent's gen + 1`);
    }
  }

  // Dates
  if (p.birth != null && (p.birth < 1600 || p.birth > 2100)) fail(`${who}: implausible birth year ${p.birth}`);
  if (p.death != null && p.birth != null && p.death < p.birth) {
    fail(`${who}: death ${p.death} precedes birth ${p.birth}`);
  }

  // Photos
  for (const file of [p.photo, ...(p.partners || []).map((q) => q.photo)].filter(Boolean)) {
    usedPhotos.add(file);
    if (photos.size && !photos.has(file)) fail(`${who}: photo "${file}" is not in assets/photos/`);
  }

  for (const [network, url] of Object.entries(p.socials || {})) {
    if (typeof url !== 'string' || !url.trim()) fail(`${who}: empty ${network} link — omit the key instead`);
  }
}

/* Exactly one root, and no cycles: walking up from anyone must terminate. */
const roots = PEOPLE.filter((p) => !p.parent);
if (roots.length !== 1) fail(`expected exactly one root, found ${roots.length}`);
else if (roots[0].id !== ROOT_ID) fail(`ROOT_ID is "${ROOT_ID}" but the rootless person is "${roots[0].id}"`);

for (const p of PEOPLE) {
  const seen = new Set();
  let cur = p;
  while (cur?.parent) {
    if (seen.has(cur.id)) { fail(`${p.id}: ancestry loops through "${cur.id}"`); break; }
    seen.add(cur.id);
    cur = byId.get(cur.parent);
  }
}

for (const file of photos) {
  if (!usedPhotos.has(file)) warn(`assets/photos/${file} is not referenced by anyone`);
}

/* ── report ── */
const gens = new Set(PEOPLE.map((p) => p.gen));
console.log(
  `${PEOPLE.length} people · ${gens.size} generations · ` +
  `${PEOPLE.filter((p) => p.photo).length} portraits · ` +
  `${PEOPLE.filter((p) => p.bio).length} biographies`
);

for (const w of warnings) console.log(`  warning: ${w}`);
if (!errors.length) {
  console.log(warnings.length ? `\nok, with ${warnings.length} warning(s)` : '\nok');
  process.exit(0);
}
console.error(`\n${errors.length} error(s):`);
for (const e of errors) console.error(`  ${e}`);
process.exit(1);
