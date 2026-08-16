/**
 * suggestions.js — corrections and additions from the family.
 *
 * Every suggestion is a proposal, never a publication: it arrives as `pending`
 * and only appears on the site once an admin approves it in admin.html. That
 * keeps a public form from turning a family archive into a comment section.
 *
 * The archive never depends on this working. Approved suggestions are fetched
 * once, in the background; if the API is unreachable, missing, or was never
 * deployed, the form degrades to an email link and nothing else changes.
 */

import { API_BASE, CONTACT_EMAIL } from './config.js';

const MAX_TEXT = 2000;
const MAX_NAME = 80;

/** personId → approved suggestions. Empty until (and unless) the fetch lands. */
let approved = new Map();
let loaded = null;

/**
 * Loads every approved suggestion in one request. Called once at startup;
 * failure is not an error condition, it is the normal offline state.
 */
export function loadApproved() {
  if (loaded) return loaded;
  if (!API_BASE) { loaded = Promise.resolve(approved); return loaded; }

  loaded = fetch(`${API_BASE}/api/suggestions`, { headers: { accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((body) => {
      const map = new Map();
      for (const item of body.items || []) {
        if (!map.has(item.personId)) map.set(item.personId, []);
        map.get(item.personId).push(item);
      }
      approved = map;
      return approved;
    })
    .catch(() => approved); // stay silent — the archive is the point, not the comments
  return loaded;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const REMEMBERED_NAME = 'luta-emri';

function mailtoFor(person, text = '', author = '') {
  const subject = `Sugjerim – Trungu Luta: ${person.name}`;
  const body = text ? `${text}\n\n— ${author || 'Anonim'}` : `Për ${person.name}:\n\n`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Builds the suggestions block for one person.
 * @param {object} person
 * @returns {HTMLElement}
 */
export function mountSuggestions(person) {
  const box = el('div', 'suggest');

  const head = el('div', 'suggest-head');
  head.append(el('div', 'fact-l', 'Komente e sugjerime'));
  const toggle = el('button', 'btn btn-ghost', '+ Shto sugjerim');
  toggle.type = 'button';
  head.append(toggle);
  box.append(head);

  /* Approved suggestions, if any arrived. */
  const list = el('div', 'suggest-list');
  const items = approved.get(person.id) || [];
  for (const item of items) {
    const card = el('div', 'suggest-item');
    const meta = el('div', 'suggest-meta');
    meta.append(el('span', 'suggest-who', item.author || 'Anonim'));
    meta.append(el('span', 'suggest-when', (item.createdAt || '').slice(0, 10)));
    card.append(meta);
    card.append(el('div', 'suggest-text', item.text));
    list.append(card);
  }
  if (items.length) box.append(list);

  /* ── the form ── */
  if (!API_BASE) {
    // No API configured: one honest link instead of a form that goes nowhere.
    const fallback = el('div', 'suggest-form');
    const link = el('a', 'btn btn-secondary', 'Dërgo një sugjerim me email');
    link.href = mailtoFor(person);
    link.style.alignSelf = 'flex-start';
    fallback.append(link);
    fallback.append(el('span', 'suggest-hint',
      'Sugjerimet shqyrtohen nga mbajtësi i trungut para se të shtohen.'));
    box.append(fallback);
    toggle.remove();
    return box;
  }

  const form = el('form', 'suggest-form');
  form.hidden = true;
  form.noValidate = true;

  const name = el('input', 'input');
  name.type = 'text';
  name.name = 'author';
  name.placeholder = 'Emri yt';
  name.maxLength = MAX_NAME;
  name.autocomplete = 'name';
  name.setAttribute('aria-label', 'Emri yt');
  try { name.value = localStorage.getItem(REMEMBERED_NAME) || ''; } catch { /* private mode */ }

  const text = el('textarea', 'input');
  text.name = 'text';
  text.placeholder = 'Çfarë duhet shtuar ose ndryshuar këtu?';
  text.maxLength = MAX_TEXT;
  text.required = true;
  text.setAttribute('aria-label', 'Sugjerimi yt');

  // Honeypot. Bots fill every field they find; people never see this one.
  const trap = el('div', 'hp');
  trap.setAttribute('aria-hidden', 'true');
  const trapInput = el('input');
  trapInput.type = 'text';
  trapInput.name = 'website';
  trapInput.tabIndex = -1;
  trapInput.autocomplete = 'off';
  trap.append(trapInput);

  const actions = el('div', 'suggest-actions');
  const submit = el('button', 'btn btn-primary', 'Dërgo sugjerimin');
  submit.type = 'submit';
  actions.append(submit);
  actions.append(el('span', 'suggest-hint',
    'Sugjerimi shkon te mbajtësi i trungut për shqyrtim. Shfaqet këtu vetëm pasi të miratohet.'));

  const status = el('p', 'suggest-status');
  status.setAttribute('role', 'status');
  status.hidden = true;

  form.append(name, text, trap, actions, status);
  box.append(form);

  toggle.addEventListener('click', () => {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? '+ Shto sugjerim' : 'Anulo';
    if (!form.hidden) (name.value ? text : name).focus();
  });

  const say = (message, kind) => {
    status.hidden = false;
    status.textContent = message;
    status.className = `suggest-status is-${kind}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      personId: person.id,
      author: name.value.trim().slice(0, MAX_NAME),
      text: text.value.trim().slice(0, MAX_TEXT),
      website: trapInput.value, // must be empty
    };
    if (!body.text) { say('Shkruaj diçka para se ta dërgosh.', 'error'); text.focus(); return; }

    submit.disabled = true;
    say('Duke dërguar…', 'ok');
    try {
      const res = await fetch(`${API_BASE}/api/suggestions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try { localStorage.setItem(REMEMBERED_NAME, body.author); } catch { /* private mode */ }
      form.reset();
      say('Faleminderit — sugjerimi u dërgua për shqyrtim.', 'ok');
      actions.hidden = true;
      text.hidden = true;
      name.hidden = true;
    } catch {
      // The suggestion is not lost: hand them a prefilled email instead.
      status.hidden = false;
      status.className = 'suggest-status is-error';
      status.replaceChildren(
        document.createTextNode('Nuk u dërgua dot. '),
      );
      const link = el('a', null, 'Dërgoje me email');
      link.href = mailtoFor(person, body.text, body.author);
      status.append(link);
      status.append(document.createTextNode(' — teksti yt është ruajtur në lidhje.'));
      submit.disabled = false;
    }
  });

  return box;
}
