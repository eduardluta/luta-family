/**
 * person.js — the person and spouse dialogs.
 *
 * Renders a record the way the archive knows it: portrait, dates, the line
 * back to the root, spouses, children, biography. An empty field says "not
 * recorded"; the biography does the same — it is verbatim from the family
 * history or nothing, never text generated to fill the gap.
 *
 * Spouses are records too: each opens a page of its own (ids come from
 * partnerView in model.js) with its own share link and suggestion box.
 *
 * There is deliberately no phone field and there are no social links. About
 * 120 of these people are living and this is a public domain; a field that
 * exists is a field that gets filled.
 */

import {
  get, given, childrenOf, lineage, lifespan, initials,
  branchLabel, getPartner, partnerView, ROMAN,
} from './model.js';
import { mountSuggestions } from './suggestions.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const UNSET = 'Nuk është shënuar';

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

/**
 * Share — the whole reason a record has an address. The native share sheet
 * where the platform offers one (phones), otherwise the link goes to the
 * clipboard. Lives in the header because the bottom action row is hidden on
 * small screens.
 */
function shareButton(id, name) {
  const btn = el('button', 'dialog-share', 'Ndaje');
  btn.type = 'button';
  btn.setAttribute('aria-label', `Ndaje lidhjen e ${name}`);
  let revert = 0;
  btn.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#/person/${id}`;
    try {
      if (navigator.share) { await navigator.share({ title: name, url }); return; }
      await navigator.clipboard.writeText(url);
    } catch (err) {
      if (err?.name === 'AbortError') return; // the share sheet was dismissed
      try { window.prompt('Kopjo lidhjen:', url); } catch { /* embedders may stub prompt out */ }
      return;
    }
    btn.textContent = 'U kopjua ✓';
    clearTimeout(revert);
    revert = setTimeout(() => { btn.textContent = 'Ndaje'; }, 1800);
  });
  return btn;
}

/** The dialog header: portrait, name, years, tags, share, close. */
function head(subject, years, uncertain, tagList, shareId) {
  const box = el('div', 'person-head');
  box.append(portrait(subject));

  const text = el('div');
  text.style.minWidth = '0';
  const title = el('div', 'dialog-title', subject.name);
  title.id = 'person-name';
  text.append(title);

  if (years) {
    const label = years.includes('–') ? years : `lindur ${years}`;
    text.append(el('div', 'person-years', uncertain ? `${label} †` : label));
  }

  const tags = el('div', 'person-tags');
  for (const [cls, label] of tagList) tags.append(el('span', `tag ${cls}`, label));
  text.append(tags);
  box.append(text);

  box.append(shareButton(shareId, subject.name));

  // A record can run to several screens of biography. Without a close control
  // in the header, the only way out on a phone is to scroll to the very bottom.
  const closeX = el('button', 'dialog-close', '×');
  closeX.type = 'button';
  closeX.dataset.close = 'true';
  closeX.setAttribute('aria-label', 'Mbyll');
  box.append(closeX);

  return box;
}

/** A clickable row for a spouse or a person: small photo, name, quiet meta. */
function personRow({ photo, name, meta }, onClick) {
  const row = el('button', 'partner');
  row.type = 'button';
  if (photo) {
    const img = el('img');
    img.src = `assets/photos/${photo}`;
    img.alt = `Fotografi e ${name}`;
    img.width = 36;
    img.height = 36;
    img.loading = 'lazy';
    row.append(img);
  }
  row.append(el('span', 'partner-name', name));
  if (meta) row.append(el('span', 'partner-year', meta));
  row.addEventListener('click', onClick);
  return row;
}

/** The biography is verbatim from the archive or nothing: when the manuscript
 *  has no paragraph for someone, the block says so rather than generating one. */
function bioBlock(text) {
  const bio = el('div', 'bio-block');
  bio.append(el('div', 'fact-l', 'Biografia'));
  bio.append(el('p', text ? 'bio-text' : 'bio-text fact-unset', text || UNSET));
  return bio;
}

function actionsRow() {
  const actions = el('div', 'dialog-actions');
  const close = el('button', 'btn btn-primary', 'Mbyll');
  close.type = 'button';
  close.dataset.close = 'true';
  actions.append(close);
  return actions;
}

function dialogShell() {
  const dialog = el('div', 'dialog person-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'person-name');
  dialog.tabIndex = -1;
  return dialog;
}

/**
 * @param {object} person
 * @param {(id: string) => void} onNavigate  open another record
 * @returns {HTMLElement} the dialog body
 */
export function renderPerson(person, onNavigate) {
  const dialog = dialogShell();

  const tagList = [['tag-outline', `Gjenerata ${ROMAN[person.gen]}`]];
  const branch = branchLabel(person);
  if (branch) tagList.push(['tag-neutral', branch]);
  dialog.append(head(person, lifespan(person), person.uncertain, tagList, person.id));

  /* ── facts ── */
  const facts = el('div', 'facts');
  facts.append(fact('Data e lindjes', person.birth ? String(person.birth) : '', { tnum: true }));
  facts.append(fact('Vendi i lindjes', person.birthPlace));
  facts.append(fact('Profesioni', person.profession));
  facts.append(fact('Vendbanimi', person.residence));
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

  /* ── spouses — each opens a page of their own ── */
  const partners = person.partners || [];
  if (partners.length) {
    const box = el('div');
    box.append(el('div', 'fact-l', 'Kurorëzuar me'));
    const list = el('div', 'partners');
    partners.forEach((partner, i) => {
      const view = partnerView(person, i);
      const meta = [view.years, partner.married ? `martuar më ${partner.married}` : '']
        .filter(Boolean).join(' · ');
      list.append(personRow(
        { photo: view.photo, name: view.name, meta },
        () => onNavigate(view.id),
      ));
    });
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
  dialog.append(bioBlock(person.bio));

  if (person.sourceNote) {
    dialog.append(el('p', 'record-note', `Shënim: ${person.sourceNote}`));
  }

  /* ── suggestions ── */
  dialog.append(mountSuggestions(person));

  dialog.append(actionsRow());
  return dialog;
}

/**
 * The spouse dialog. A partner's record is thinner than a tree person's —
 * name, years, photograph, whom they married — so the page shows exactly
 * that, a biography when the archive has one, and its own suggestion box so
 * the family can fill in what is missing.
 */
export function renderPartner(view, onNavigate) {
  const { person, partner } = view;
  const dialog = dialogShell();

  const tagList = [['tag-outline', person.sex === 'm' ? 'Bashkëshorte' : 'Bashkëshort']];
  const branch = branchLabel(person);
  if (branch) tagList.push(['tag-neutral', branch]);
  dialog.append(head(view, view.years, false, tagList, view.id));

  /* ── facts — the same record a tree person gets ── */
  const facts = el('div', 'facts');
  facts.append(fact('Data e lindjes', view.birth ? String(view.birth) : '', { tnum: true }));
  facts.append(fact('Vendi i lindjes', partner.birthPlace));
  facts.append(fact('Profesioni', partner.profession));
  facts.append(fact('Vendbanimi', partner.residence));
  dialog.append(facts);

  /* ── whom they married — the way back into the tree ── */
  const box = el('div');
  box.append(el('div', 'fact-l', 'Kurorëzuar me'));
  const list = el('div', 'partners');
  const meta = [lifespan(person), partner.married ? `martuar më ${partner.married}` : '']
    .filter(Boolean).join(' · ');
  list.append(personRow(
    { photo: person.photo, name: person.name, meta },
    () => onNavigate(person.id),
  ));
  box.append(list);
  dialog.append(box);

  dialog.append(bioBlock(view.bio));

  dialog.append(mountSuggestions({ id: view.id, name: view.name }));

  dialog.append(actionsRow());
  return dialog;
}

/**
 * Opens the dialog in `host`, wiring backdrop click, Escape, and a focus trap.
 * `id` may name a tree person or a spouse. Returns a close function. Focus
 * returns to whatever opened it.
 */
export function openPerson(host, id, { onNavigate, onClose } = {}) {
  const person = get(id);
  const spouse = person ? null : getPartner(id);
  if (!person && !spouse) return () => {};

  const opener = document.activeElement;
  const backdrop = el('div', 'dialog-backdrop');
  const navigate = (nextId) => { onNavigate?.(nextId); };
  const dialog = person ? renderPerson(person, navigate) : renderPartner(spouse, navigate);
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
