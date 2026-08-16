/**
 * model.js — everything the rest of the site asks about the family record.
 *
 * data/family.js is a flat list. This turns it into the shapes the UI needs
 * (lookup by id, children of a person, a lineage back to the root) and holds
 * the Albanian-language rules — roman numerals, name shortening, the
 * diacritic-insensitive search key, and grammatical agreement.
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
export const siblingsOf = (p) =>
  p && p.parent ? childrenOf(p.parent).filter((c) => c.id !== p.id) : [];

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

/* ── grammatical agreement ───────────────────────────────────────────────
   Albanian agrees participles and possessives with gender. A summary line that
   says "i lindur" about a woman reads as broken to a native speaker, so the
   record carries `sex` and every generated sentence goes through here. */
const ORDINAL = ['', 'parë', 'dytë', 'tretë', 'katërt', 'pestë', 'gjashtë', 'shtatë', 'tetë', 'nëntë', 'dhjetë'];

/**
 * The fallback biography, for the ~100 people the family history lists by name
 * without a paragraph of their own. It states only what the record actually
 * knows — generation, siblings, and the line back to the root.
 */
export function summarise(p) {
  const male = p.sex === 'm';
  const sibs = siblingsOf(p);
  const father = parentOf(p);
  const out = [];

  const born = p.birth ? `${male ? ', i lindur më ' : ', e lindur më '}${p.birth}` : '';
  out.push(
    `${p.name}${born}, është ${male ? 'pjesëtar i' : 'pjesëtare e'} gjeneratës së ` +
      `${ORDINAL[p.gen] || p.gen} të familjes Luta.`
  );

  if (sibs.length) {
    const names = sibs.map(given);
    const list =
      names.length > 1 ? `${names.slice(0, -1).join(', ')} dhe ${names.at(-1)}` : names[0];
    out.push(`Në trung renditet së bashku me ${list}.`);
  }

  if (father) {
    out.push(
      `Linja familjare ngjitet nga ${given(father)} Luta deri te rrënja e trungut — ` +
        `${get(ROOT_ID).name}, i shënuar në vitin 1700 në Pejë.`
    );
  }
  return out.join(' ');
}
