#!/usr/bin/env node
/**
 * build-data.mjs — one-time transform of the design prototype's data into the
 * site's hand-editable data file.
 *
 * The prototype scraped birthplace / profession / residence out of Albanian bio
 * prose with regexes on every render. That is fine for a mockup and wrong for an
 * archive: the same guess got recomputed forever and nobody could correct it.
 * Here the guess runs once, lands in `data/family.js` as an ordinary field, and
 * a human can fix it in place.
 *
 *   node scripts/build-data.mjs            # write data/family.js
 *   node scripts/build-data.mjs --report   # print what was derived, write nothing
 *
 * Re-running OVERWRITES data/family.js and discards hand corrections. Once the
 * family starts editing, this script has done its job — keep it for reference.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'scripts', '_source-luta-data.js');
const OUT = join(ROOT, 'data', 'family.js');
const reportOnly = process.argv.includes('--report');

const raw = readFileSync(SOURCE, 'utf8');
const data = JSON.parse(raw.replace(/^\s*window\.LUTA_DATA\s*=\s*/, '').trim().replace(/;$/, ''));

/* ── years ────────────────────────────────────────────────────────────────
   The source records uncertainty honestly and we keep it. Three shapes:
     "1945"            → born 1945, living
     "1903-1978"       → born 1903, died 1978
     "1921/22-1980 †"  → sources disagree on the birth year; † flags the record
   `birth`/`death` take the FIRST year of any "/" pair so sorting and maths have
   a number to work with; `years` keeps the full human-readable string. */
function parseYears(s) {
  const out = { years: s || '', birth: null, death: null, uncertain: false };
  if (!s) return out;
  if (s.includes('†') || s.includes('/')) out.uncertain = true;
  const clean = s.replace(/†/g, '').trim();
  if (!/\d/.test(clean)) return out;                    // e.g. "i njohur si Haxhi Ramë Luta"
  const [birthPart, deathPart] = clean.split(/\s*[-–]\s*/);
  const first = (part) => {
    const m = (part || '').match(/\d{4}/);
    return m ? Number(m[0]) : null;
  };
  out.birth = first(birthPart);
  out.death = first(deathPart);
  return out;
}

/* ── narrative fields, derived once ─────────────────────────────────────── */
// A place name: initial capital, then any letters. The continuation has to allow
// capitals or all-caps names truncate — "SHBA" came out as "SH".
const PLACE = '[A-ZÇË][A-Za-zÇËçë]+';

// The source writes "më" where standard Albanian writes "në", inconsistently.
const IN = '(?:në|më)';

/* The bio prose is full of typos and abbreviations, so a match is not a place
   just because it is capitalised — "punon në SH.P Peshkatarija" yielded "SH".
   Anything too short, or carrying a period, is a company or an initial. */
function sanePlace(s) {
  return s && s.length >= 3 && !s.includes('.') ? s : '';
}

function parsePlace(bio) {
  const m = bio.match(new RegExp(`lindi ${IN} (fshatin\\s+)?(${PLACE})`));
  if (!m) return '';
  const place = sanePlace(m[2]);
  return place ? (m[1] ? 'fshati ' : '') + place : '';
}
function parseProfession(bio) {
  const m = bio.match(/puno\w*\s+(?:[^,.]*?\s)?si\s+([a-zçë][^,.;]*)/i);
  if (!m) return '';
  let p = m[1].trim();
  const cut = p.indexOf(' në ');
  if (cut > 0) p = p.slice(0, cut);
  return p.charAt(0).toUpperCase() + p.slice(1);
}
function parseResidence(bio) {
  // "jeton në X" / "jetom më fshatin X" / "kalon në X". Prefer the match nearest
  // the verb: a later " në " in the same sentence is usually the employer.
  const m =
    bio.match(new RegExp(`jeto\\w*[^.]{0,40}?${IN} (?:fshatin\\s+)?(${PLACE})`)) ||
    bio.match(new RegExp(`kalon(?:ë)? ${IN} (${PLACE})`));
  return m ? sanePlace(m[1]) : '';
}

/* ── sex ──────────────────────────────────────────────────────────────────
   Albanian agrees adjectives and participles with gender, so the person dialog
   needs this to write "i lindur" vs "e lindur". The prototype guessed on every
   render from the name ending; we guess once and write it down so it can be
   corrected. Evidence, strongest first:
     1. has children — the source lists descent patrilineally ("nga i ati X")
     2. a known-male name that ends in -a/-e and would otherwise misclassify
     3. name ending: -a/-e reads female in Albanian, anything else male */
const MALE_NAMES = new Set([
  'rame', 'rama', 'mustafa', 'mustafe', 'avdulla', 'avdullah', 'zenulla', 'zenullah',
  'lutfulla', 'lutfullah', 'hamza', 'isa', 'musa', 'ilirjan', 'ardijan', 'arijan',
]);
function deriveSex(node, hasChildren) {
  if (hasChildren) return 'm';
  const given = node.name.split(/\s+/)[0].toLowerCase().replace(/ë/g, 'e');
  if (MALE_NAMES.has(given)) return 'm';
  return /[ae]$/.test(given) ? 'f' : 'm';
}

/* ── transform ────────────────────────────────────────────────────────── */
const childCount = new Map();
for (const n of data.nodes) {
  if (n.parent) childCount.set(n.parent, (childCount.get(n.parent) || 0) + 1);
}

const derived = { place: 0, profession: 0, residence: 0 };
const nodes = data.nodes.map((n) => {
  const bio = n.bio || '';
  const { years, birth, death, uncertain } = parseYears(n.years);

  const birthPlace = parsePlace(bio);
  const profession = parseProfession(bio);
  const residence = parseResidence(bio);
  if (birthPlace) derived.place++;
  if (profession) derived.profession++;
  if (residence) derived.residence++;

  // Socials survive; phone numbers do not. ~120 of these people are living and
  // this is a public domain — a field that exists is a field that gets filled.
  const socials = Object.fromEntries(
    Object.entries(n.socials || {}).filter(([, v]) => v && String(v).trim())
  );

  const out = {
    id: n.id,
    parent: n.parent,
    gen: n.gen,
    branch: n.branch,
    name: n.name,
    sex: deriveSex(n, childCount.has(n.id)),
    years,
    birth,
    death,
  };
  if (uncertain) out.uncertain = true;
  if (n.photo) out.photo = n.photo.replace(/^photos\//, '');
  if (birthPlace) out.birthPlace = birthPlace;
  if (profession) out.profession = profession;
  if (residence) out.residence = residence;
  if (n.partners?.length) {
    out.partners = n.partners.map((p) => {
      const q = { name: p.name };
      if (p.photo) q.photo = p.photo.replace(/^photos\//, '');
      if (p.married) q.married = p.married;
      return q;
    });
  }
  if (Object.keys(socials).length) out.socials = socials;
  if (bio) out.bio = bio;
  if (n.union_note) out.unionNote = n.union_note;
  if (n.source_note) out.sourceNote = n.source_note;
  return out;
});

/* ── integrity ───────────────────────────────────────────────────────────
   Cheap and worth it: a family tree with a broken parent link renders as a
   silently orphaned subtree rather than an error. */
const ids = new Set(nodes.map((n) => n.id));
const byId = new Map(nodes.map((n) => [n.id, n]));
const problems = [];
for (const n of nodes) {
  if (n.parent && !ids.has(n.parent)) problems.push(`${n.id}: parent "${n.parent}" does not exist`);
  if (n.parent && byId.get(n.parent) && byId.get(n.parent).gen !== n.gen - 1) {
    problems.push(`${n.id}: gen ${n.gen} under a gen ${byId.get(n.parent).gen} parent`);
  }
  if (n.birth && n.death && n.death < n.birth) problems.push(`${n.id}: dies (${n.death}) before birth (${n.birth})`);
}
const roots = nodes.filter((n) => !n.parent);
if (roots.length !== 1) problems.push(`expected exactly 1 root, found ${roots.length}`);

/* ── report ──────────────────────────────────────────────────────────── */
const stats = {
  people: nodes.length,
  generations: Math.max(...nodes.map((n) => n.gen)),
  photos: nodes.filter((n) => n.photo).length,
  partnerPhotos: nodes.reduce((a, n) => a + (n.partners || []).filter((p) => p.photo).length, 0),
  bios: nodes.filter((n) => n.bio).length,
  living: nodes.filter((n) => n.birth && !n.death).length,
  uncertain: nodes.filter((n) => n.uncertain).length,
  female: nodes.filter((n) => n.sex === 'f').length,
  male: nodes.filter((n) => n.sex === 'm').length,
};
console.log('people           %d across %d generations', stats.people, stats.generations);
console.log('photos           %d people + %d spouses', stats.photos, stats.partnerPhotos);
console.log('bios             %d', stats.bios);
console.log('sex (derived)    %d m / %d f', stats.male, stats.female);
console.log('uncertain dates  %d', stats.uncertain);
console.log('derived from bio %d birthplace, %d profession, %d residence',
  derived.place, derived.profession, derived.residence);
console.log(problems.length ? `\n!! ${problems.length} integrity problem(s):` : '\nintegrity    ok');
problems.forEach((p) => console.log('   ' + p));

if (reportOnly) {
  console.log('\n--- derived fields, for eyeballing ---');
  for (const n of nodes) {
    if (n.birthPlace || n.profession || n.residence) {
      console.log(`  ${n.name.padEnd(28)} place=${(n.birthPlace || '—').padEnd(14)} prof=${(n.profession || '—').padEnd(22)} res=${n.residence || '—'}`);
    }
  }
  process.exit(problems.length ? 1 : 0);
}

/* ── emit ────────────────────────────────────────────────────────────────
   One person per line. Prettier would explode each into 20 lines and make the
   file unreadable as a list of people — which is what it is, and what anyone
   hand-editing it needs to see. */
const header = `/**
 * Familja Luta — the family record.
 *
 * ${stats.people} people across ${stats.generations} generations, from the family history written by
 * Xhafer (Lutfulla) Luta. This file is the archive; everything on the site is
 * rendered from it. It is meant to be edited BY HAND — add a person, fix a
 * date, attach a photo.
 *
 * Fields
 *   id          stable, never reuse or change one (comments are keyed to it)
 *   parent      id of the father, or null for the root
 *   gen         generation, 1–${stats.generations}. Must always be parent's gen + 1.
 *   branch      one of the keys in BRANCHES below
 *   name        full name as written in the source
 *   sex         'm' | 'f' — Albanian needs it for grammatical agreement
 *   years       the human-readable string, kept verbatim from the source
 *   birth/death numbers for sorting; null when unknown
 *   uncertain   true when the sources disagree — the site shows a † marker
 *   photo       filename in assets/photos/
 *   partners    spouses, with optional photo and marriage year
 *   socials     { instagram, facebook, linkedin, tiktok } — omit if none
 *   bio         verbatim from the family history, in the original Albanian
 *   unionNote   which marriage these children came from
 *   sourceNote  a recorded contradiction in the source document
 *
 * NOTE ON birthPlace / profession / residence: these were extracted once by
 * script from the bio prose (see scripts/build-data.mjs) and are GUESSES.
 * Correct them freely — nothing regenerates them.
 *
 * Adding a person: give them a new unique id, set parent/gen/branch, and that
 * is all. Layout, search, counts and the map all follow automatically.
 */

export const BRANCHES = ${JSON.stringify(data.branches, null, 2)};

export const PEOPLE = [
`;

const body = nodes.map((n) => '  ' + JSON.stringify(n)).join(',\n');
const footer = `
];

/** Root of the tree — the one person with no recorded father. */
export const ROOT_ID = ${JSON.stringify(roots[0].id)};
`;

writeFileSync(OUT, header + body + footer, 'utf8');
console.log('\nwrote %s (%d KB)', OUT.replace(ROOT + '/', ''), Math.round((header + body + footer).length / 1024));
process.exit(problems.length ? 1 : 0);
