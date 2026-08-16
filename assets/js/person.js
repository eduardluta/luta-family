/**
 * person.js — the person dialog.
 *
 * Renders one person's whole record: portrait, dates, the line back to the
 * root, spouses, children, and either their biography from the family history
 * or a summary generated from what the record knows.
 *
 * There is deliberately no phone field. About 120 of these people are living
 * and this is a public domain; a field that exists is a field that gets filled.
 */

import {
  get, given, childrenOf, parentOf, lineage, lifespan, initials,
  branchLabel, summarise, ROMAN,
} from './model.js';
import { mountSuggestions } from './suggestions.js';

const UNSET = 'Nuk është shënuar';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/** A labelled cell in the facts grid. */
function fact(label, value, { tnum = false } = {}) {
  const wrap = el('div');
  wrap.append(el('div', 'fact-l', label));
  const v = el('div', `fact-v${tnum ? ' tnum' : ''}`);
  if (value) v.textContent = value;
  else { v.classList.add('fact-unset'); v.textContent = UNSET; }
  wrap.append(v);
  return wrap;
}

function portrait(person) {
  if (person.photo) {
    const img = el('img', 'person-photo');
    img.src = `assets/photos/${person.photo}`;
    img.alt = `Fotografi e ${person.name}`;
    img.width = 84;
    img.height = 84;
    return img;
  }
  const span = el('span', 'person-initials', initials(person));
  span.setAttribute('aria-hidden', 'true');
  return span;
}

const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok' };

function socialLinks(person) {
  const entries = Object.entries(person.socials || {}).filter(([, v]) => v);
  if (!entries.length) return null;
  const box = el('div', 'socials');
  for (const [key, value] of entries) {
    const a = el('a', 'btn btn-secondary', SOCIAL_LABELS[key] || key);
    a.href = /^https?:/i.test(value) ? value : `https://${value}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    box.append(a);
  }
  return box;
}

/**
 * @param {object} person
 * @param {(id: string) => void} onNavigate  open another person
 * @returns {HTMLElement} the dialog body
 */
export function renderPerson(person, onNavigate) {
  const dialog = el('div', 'dialog person-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'person-name');
  dialog.tabIndex = -1;

  /* ── head ── */
  const head = el('div', 'person-head');
  head.append(portrait(person));

  const headText = el('div');
  headText.style.minWidth = '0';
  const title = el('div', 'dialog-title', person.name);
  title.id = 'person-name';
  headText.append(title);

  const years = lifespan(person);
  if (years) {
    const label = years.includes('–') ? years : `lindur ${years}`;
    headText.append(el('div', 'person-years', person.uncertain ? `${label} †` : label));
  }

  const tags = el('div', 'person-tags');
  tags.append(el('span', 'tag tag-outline', `Gjenerata ${ROMAN[person.gen]}`));
  const branch = branchLabel(person);
  if (branch) tags.append(el('span', 'tag tag-neutral', branch));
  headText.append(tags);
  head.append(headText);

  // A record can run to several screens of biography. Without a close control
  // in the header, the only way out on a phone is to scroll to the very bottom.
  const closeX = el('button', 'dialog-close', '×');
  closeX.type = 'button';
  closeX.dataset.close = 'true';
  closeX.setAttribute('aria-label', 'Mbyll');
  head.append(closeX);

  dialog.append(head);

  /* ── facts ── */
  const facts = el('div', 'facts');
  facts.append(fact('Data e lindjes', person.birth ? String(person.birth) : '', { tnum: true }));
  facts.append(fact('Vendi i lindjes', person.birthPlace));
  facts.append(fact('Profesioni', person.profession));
  facts.append(fact('Vendbanimi', person.residence));

  const socialCell = el('div');
  socialCell.append(el('div', 'fact-l', 'Rrjetet sociale'));
  const links = socialLinks(person);
  if (links) socialCell.append(links);
  else {
    const none = el('div', 'fact-v fact-unset', 'Nuk janë shënuar');
    socialCell.append(none);
  }
  facts.append(socialCell);
  dialog.append(facts);

  /* ── lineage — every ancestor clickable, so you can walk up the line ── */
  const lineageBox = el('div');
  lineageBox.append(el('div', 'fact-l', 'Linja familjare'));
  const chain = el('div', 'lineage');
  lineage(person).forEach((ancestor, i) => {
    if (i) chain.append(document.createTextNode(' → '));
    const label = ancestor.gen <= 3 ? ancestor.name : given(ancestor);
    if (ancestor.id === person.id) {
      const self = el('span', null, label);
      self.setAttribute('aria-current', 'true');
      chain.append(self);
    } else {
      const btn = el('button', null, label);
      btn.type = 'button';
      btn.addEventListener('click', () => onNavigate(ancestor.id));
      chain.append(btn);
    }
  });
  lineageBox.append(chain);
  dialog.append(lineageBox);

  /* ── spouses ── */
  const partners = person.partners || [];
  if (partners.length) {
    const box = el('div');
    box.append(el('div', 'fact-l', 'Kurorëzuar me'));
    const list = el('div', 'partners');
    for (const p of partners) {
      const row = el('div', 'partner');
      if (p.photo) {
        const img = el('img');
        img.src = `assets/photos/${p.photo}`;
        img.alt = `Fotografi e ${p.name}`;
        img.width = 36;
        img.height = 36;
        img.loading = 'lazy';
        row.append(img);
      }
      row.append(el('span', 'partner-name', p.name));
      if (p.married) row.append(el('span', 'partner-year', `· martuar më ${p.married}`));
      list.append(row);
    }
    box.append(list);
    if (person.unionNote) box.append(el('div', 'union-note', person.unionNote));
    dialog.append(box);
  }

  /* ── children ── */
  const kids = childrenOf(person.id);
  if (kids.length) {
    const box = el('div');
    box.append(el('div', 'fact-l', `Fëmijët (${kids.length})`));
    const row = el('div', 'children');
    for (const child of kids) {
      const y = lifespan(child).split('–')[0];
      const btn = el('button', 'btn btn-secondary', y ? `${given(child)} · ${y}` : given(child));
      btn.type = 'button';
      btn.addEventListener('click', () => onNavigate(child.id));
      row.append(btn);
    }
    box.append(row);
    dialog.append(box);
  }

  /* ── biography ── */
  const bio = el('div', 'bio-block');
  bio.append(el('div', 'fact-l', person.bio ? 'Nga historiati' : 'Përmbledhje'));
  bio.append(el('p', 'bio-text', person.bio || summarise(person)));
  dialog.append(bio);

  if (person.sourceNote) {
    dialog.append(el('p', 'record-note', `Shënim: ${person.sourceNote}`));
  }

  /* ── suggestions ── */
  dialog.append(mountSuggestions(person));

  const actions = el('div', 'dialog-actions');
  const close = el('button', 'btn btn-primary', 'Mbyll');
  close.type = 'button';
  close.dataset.close = 'true';
  actions.append(close);
  dialog.append(actions);

  return dialog;
}

/**
 * Opens the dialog in `host`, wiring backdrop click, Escape, and a focus trap.
 * Returns a close function. Focus returns to whatever opened it.
 */
export function openPerson(host, id, { onNavigate, onClose } = {}) {
  const person = get(id);
  if (!person) return () => {};

  const opener = document.activeElement;
  const backdrop = el('div', 'dialog-backdrop');
  const navigate = (nextId) => { onNavigate?.(nextId); };
  const dialog = renderPerson(person, navigate);
  backdrop.append(dialog);

  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    document.body.style.overflow = '';
    if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    onClose?.();
  };

  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    // Trap: a modal that lets focus wander behind it is not a modal.
    const focusable = dialog.querySelectorAll(
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  dialog.addEventListener('click', (e) => { if (e.target.dataset.close) close(); });
  document.addEventListener('keydown', onKey, true);

  document.body.style.overflow = 'hidden';
  host.append(backdrop);
  dialog.focus();
  return close;
}
