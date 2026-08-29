/**
 * model.js — everything the rest of the site asks about the family record.
 *
 * data/family.js is a flat list. This turns it into the shapes the UI needs
 * (lookup by id, children of a person, a lineage back to the root, a view of
 * a spouse) and holds the Albanian-language rules — roman numerals, name
 * shortening, and the diacritic-insensitive search key.
 */

import { PEOPLE, BRANCHES, ROOT_ID } from '../../data/family.js';

export { PEOPLE, BRANCHES, ROOT_ID };

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const GENERATIONS = Math.max(...PEOPLE.map((p) => p.gen));

const byId = new Map(PEOPLE.map((p) => [p.id, p]));
const children = new Map();
for (const p of PEOPLE) {
  if (!p.parent) continue;
  if (!children.has(p.parent)) children.set(p.parent, []);
  children.get(p.parent).push(p);
}

export const get = (id) => byId.get(id) || null;
export const childrenOf = (id) => children.get(id) || [];
export const parentOf = (p) => (p && p.parent ? byId.get(p.parent) : null);

/** First name only. The tree labels generations 4+ this way — full names at
 *  118px would collide, and within a branch the given name is unambiguous. */
export const given = (p) => p.name.split(/\s+/)[0];

/** Generations 1–3 are the ancestral line, three people the whole family knows
 *  by their full formal name. Below that the given name carries it. */
export const treeLabel = (p) => (p.gen <= 3 ? p.name : given(p));

export const initials = (p) =>
  p.name.split(/\s+/).slice(0, 2).map((t) => t[0]).join('');

/** The displayable life-years, minus the uncertainty dagger (shown separately). */
export function lifespan(p) {
  const y = (p.years || '').replace(/†/g, '').trim();
  return /\d/.test(y) ? y.replace(/\s*[-–]\s*/g, '–') : '';
}

/** Root-down chain of ancestors, ending with the person themselves. */
export function lineage(p) {
  const chain = [];
  for (let cur = p; cur; cur = parentOf(cur)) chain.unshift(cur);
  return chain;
}

export const branchLabel = (p) =>
  p.branch && p.branch !== 'ancestral' ? (BRANCHES[p.branch] || {}).label || '' : '';

/**
 * Search key. Albanian has ë and ç, which people routinely type as e and c,
 * and j/i alternate in older spellings of the same name (Rexhep/Rexhip). Folding
 * all three means "xhafer" finds "Xhafer" and "gjyljeta" finds "Gjyljeta".
 */
export const searchKey = (s) =>
  (s || '').toLowerCase().replaceAll('ë', 'e').replaceAll('ç', 'c').replaceAll('j', 'i');

/* ── counts for the header ───────────────────────────────────────────────── */
export const STATS = {
  generations: GENERATIONS,
  names: PEOPLE.length + PEOPLE.reduce((a, p) => a + (p.partners || []).length, 0),
  photos:
    PEOPLE.filter((p) => p.photo).length +
    PEOPLE.reduce((a, p) => a + (p.partners || []).filter((q) => q.photo).length, 0),
};

/* ── spouses ─────────────────────────────────────────────────────────────
   Partners are recorded on the person, not as entries of their own, yet each
   deserves a page. "<personId>-p<index>" names one — the same convention the
   photo files already use (mjo6-p0.jpg) — so the id survives the API's
   personId check and a partner's page can collect suggestions like anyone
   else's. The index makes partner order in family.js load-bearing: append,
   never reorder. */
export const partnerId = (person, index) => `${person.id}-p${index}`;

/**
 * A partner as the UI wants it. The archive writes years inside the name
 * string, verbatim from the source — "Kismete Dobroshi (1962-1992)" — so the
 * view splits them apart for display.
 */
export function partnerView(person, index) {
  const partner = (person.partners || [])[index];
  if (!partner) return null;
  const m = /^(.*?)\s*\((\d{4})(?:\s*[-–]\s*(\d{4}))?\)$/.exec(partner.name || '');
  return {
    id: partnerId(person, index),
    index,
    person,
    partner,
    name: m ? m[1] : (partner.name || ''),
    years: m ? (m[3] ? `${m[2]}–${m[3]}` : m[2]) : '',
    birth: m ? Number(m[2]) : null,
    birthDate: partner.birthDate || '',
    photo: partner.photo || '',
    bio: partner.bio || '',
  };
}

/**
 * The children of one marriage. With a single spouse there is nothing to
 * disambiguate. With several, a child belongs to the spouse its `union` names;
 * a child the source never attributed appears on the person's page but on no
 * spouse's, because guessing at someone's mother is not the archive's job.
 */
export function childrenOfUnion(person, index) {
  const kids = childrenOf(person.id);
  if ((person.partners || []).length <= 1) return kids;
  return kids.filter((c) => c.union === index);
}

/** Resolves a partner id back to its view, or null for anything else. */
export function getPartner(id) {
  const m = /^(.+)-p(\d+)$/.exec(id || '');
  if (!m) return null;
  const person = byId.get(m[1]);
  return person ? partnerView(person, Number(m[2])) : null;
}
