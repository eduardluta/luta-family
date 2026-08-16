/**
 * app.js — wiring. Stats, search, the tree canvas, the map drawer, and routing.
 *
 * Deep links are the reason for the router. The prototype had no URL state, so
 * there was no way to send a relative "here is your grandfather" — the whole
 * point of putting this at an address. #/person/<id> now opens that person.
 */

import {
  PEOPLE, ROMAN, GENERATIONS, STATS,
  get, given, searchKey, lifespan,
} from './model.js';
import { TreeCanvas } from './tree.js';
import { openPerson } from './person.js';
import { loadApproved } from './suggestions.js';

const $ = (sel) => document.querySelector(sel);
const MAX_HITS = 9;

/* ── header counts, straight from the record ─────────────────────────────── */
$('#stat-gens').textContent = String(STATS.generations);
$('#stat-names').textContent = String(STATS.names);
$('#stat-photos').textContent = String(STATS.photos);

/* ── tree ────────────────────────────────────────────────────────────────── */
const viewport = $('#viewport');
const tree = new TreeCanvas(viewport, $('#scene'), (id) => navigateTo(id));

$('#zoom-in').addEventListener('click', () => tree.zoomBy(1.35));
$('#zoom-out').addEventListener('click', () => tree.zoomBy(1 / 1.35));
$('#zoom-fit').addEventListener('click', () => tree.fit());

/* Generation chips I–IX, built from the data so adding a tenth needs no edit. */
const chipRow = $('#gen-chips');
for (let g = 1; g <= GENERATIONS; g += 1) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'gen-chip';
  chip.textContent = ROMAN[g];
  chip.title = `Shko te gjenerata ${ROMAN[g]}`;
  chip.setAttribute('aria-label', `Shko te gjenerata ${ROMAN[g]}`);
  chip.addEventListener('click', () => {
    tree.focusGeneration(g);
    scrollToTree();
  });
  chipRow.append(chip);
}

function scrollToTree() {
  const top = viewport.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top, behavior: 'smooth' });
}

/* ── search ──────────────────────────────────────────────────────────────── */
const searchInput = $('#search');
const searchResults = $('#search-results');
let hits = [];
let activeHit = -1;

/** Matches a person by their own name, or by a spouse's name. */
function findPeople(query) {
  const q = searchKey(query.trim());
  if (q.length < 2) return [];
  const out = [];
  for (const person of PEOPLE) {
    if (out.length >= MAX_HITS) break;
    if (searchKey(person.name).includes(q)) {
      const years = lifespan(person);
      out.push({
        id: person.id,
        name: person.name,
        meta: [years, `Gjen. ${ROMAN[person.gen]}`].filter(Boolean).join(' · '),
      });
      continue;
    }
    const spouse = (person.partners || []).find((p) => searchKey(p.name).includes(q));
    if (spouse) {
      out.push({
        id: person.id,
        name: spouse.name,
        meta: `bashkëshorte · ${given(person)} Luta`,
      });
    }
  }
  return out;
}

function renderHits() {
  searchResults.replaceChildren();
  if (!hits.length) {
    searchResults.hidden = !searchInput.value.trim() || searchInput.value.trim().length < 2;
    if (!searchResults.hidden) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'Asnjë rezultat — provo një emër tjetër.';
      searchResults.append(empty);
    }
    searchInput.setAttribute('aria-expanded', String(!searchResults.hidden));
    return;
  }
  hits.forEach((hit, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-hit';
    btn.id = `hit-${i}`;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', String(i === activeHit));
    const name = document.createElement('span');
    name.className = 'search-hit-name';
    name.textContent = hit.name;
    const meta = document.createElement('span');
    meta.className = 'search-hit-meta';
    meta.textContent = hit.meta;
    btn.append(name, meta);
    // mousedown, not click: the input's blur would tear this down first.
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); pickHit(i); });
    searchResults.append(btn);
  });
  searchResults.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
  searchInput.setAttribute('aria-activedescendant', activeHit >= 0 ? `hit-${activeHit}` : '');
}

function closeSearch() {
  hits = [];
  activeHit = -1;
  searchResults.hidden = true;
  searchResults.replaceChildren();
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.removeAttribute('aria-activedescendant');
}

function pickHit(i) {
  const hit = hits[i];
  if (!hit) return;
  searchInput.value = '';
  closeSearch();
  jumpTo(hit.id);
}

searchInput.addEventListener('input', () => {
  hits = findPeople(searchInput.value);
  activeHit = -1;
  renderHits();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { searchInput.value = ''; closeSearch(); return; }
  if (!hits.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeHit = (activeHit + 1) % hits.length;
    renderHits();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeHit = (activeHit - 1 + hits.length) % hits.length;
    renderHits();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    pickHit(activeHit >= 0 ? activeHit : 0);
  }
});

searchInput.addEventListener('blur', () => setTimeout(closeSearch, 120));

/* ── routing ─────────────────────────────────────────────────────────────── */
const dialogHost = $('#dialog-host');
let closeDialog = null;
let openId = null;
/* True while one dialog is being torn down to make way for another. Without it,
   the outgoing dialog's onClose would see the *incoming* person's hash still in
   the URL and "helpfully" navigate back, undoing the navigation. */
let replacingDialog = false;

const PERSON_ROUTE = /^#\/person\/(.+)$/;

/** Move the canvas to a person, highlight them, then open their record. */
function jumpTo(id) {
  if (!get(id)) return;
  tree.focusPerson(id);
  tree.flash(id);
  scrollToTree();
  // Let the scroll settle before the dialog covers the thing it scrolled to.
  setTimeout(() => navigateTo(id), 450);
}

/** Opening a person is a navigation — it goes in the URL and the back button. */
function navigateTo(id) {
  if (!get(id)) return;
  const target = `#/person/${id}`;
  if (window.location.hash === target) showPerson(id);
  else window.location.hash = target;
}

function showPerson(id) {
  if (openId === id) return;
  if (closeDialog) {
    replacingDialog = true;
    closeDialog();
    replacingDialog = false;
  }
  openId = id;
  closeDialog = openPerson(dialogHost, id, {
    onNavigate: (nextId) => navigateTo(nextId),
    onClose: () => {
      openId = null;
      closeDialog = null;
      // A user closing the dialog should leave a clean URL. replaceState, not
      // history.back(): someone who arrived on a shared #/person/… link has no
      // earlier entry, and going "back" would throw them off the site entirely.
      if (!replacingDialog && PERSON_ROUTE.test(window.location.hash)) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    },
  });
}

function applyRoute() {
  const match = PERSON_ROUTE.exec(window.location.hash);
  if (match && get(match[1])) {
    tree.focusPerson(match[1]);
    showPerson(match[1]);
  } else if (openId) {
    closeDialog?.();
    openId = null;
    closeDialog = null;
  }
}

window.addEventListener('hashchange', applyRoute);

/* ── property map drawer ─────────────────────────────────────────────────── */
const mapHost = $('#map-host');
const mapTemplate = $('#map-template');
let closeMapDrawer = null;

function openMap() {
  if (closeMapDrawer) return;
  const opener = document.activeElement;
  const node = mapTemplate.content.cloneNode(true);
  const backdrop = node.querySelector('.map-backdrop');
  mapHost.append(node);

  closeMapDrawer = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
    document.body.style.overflow = '';
    closeMapDrawer = null;
    if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
  };
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closeMapDrawer(); } }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeMapDrawer(); });
  backdrop.querySelector('[data-close-map]').addEventListener('click', () => closeMapDrawer());
  document.addEventListener('keydown', onKey, true);
  document.body.style.overflow = 'hidden';
  backdrop.querySelector('[data-close-map]').focus();
}

$('#open-map').addEventListener('click', openMap);

/* ── start ───────────────────────────────────────────────────────────────── */
// Render the route immediately — approved suggestions are decoration and the
// tree is usable without them.
applyRoute();

// When they do arrive, a dialog opened from a deep link was built before they
// existed and would otherwise never show them. Re-render just that one, and
// only when this person actually has something to add.
loadApproved().then((bySomeone) => {
  if (!openId) { applyRoute(); return; }
  if (!bySomeone?.get?.(openId)?.length) return;
  const id = openId;
  openId = null; // so showPerson does not treat this as a no-op
  showPerson(id);
});
