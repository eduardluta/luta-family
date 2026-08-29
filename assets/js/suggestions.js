/**
 * suggestions.js — corrections, additions and photographs from the family.
 *
 * Every suggestion is a proposal, never a publication: it arrives as `pending`
 * and only appears on the site once an admin approves it in admin.html. That
 * keeps a public form from turning a family archive into a comment section.
 *
 * The archive never depends on this working. Approved suggestions are fetched
 * once, in the background; if the API is unreachable, missing, or was never
 * deployed, the form says so plainly and nothing else on the page changes.
 */

import { API_BASE } from './config.js';

const MAX_TEXT = 2000;
const MAX_NAME = 80;
const MAX_IMAGES = 6;

/* Phone photographs run 3–8 MB. Uploading them whole fails on a slow
   connection and wastes storage for no visible gain, so they are downscaled in
   the browser first — 1600px is still more than the site ever displays. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** personId → approved suggestions. Empty until (and unless) the fetch lands. */
let approved = new Map();
let loaded = null;

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
    .catch(() => approved); // stay silent — the archive is the point
  return loaded;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const REMEMBERED_NAME = 'luta-emri';
export const imageUrl = (key) => `${API_BASE}/api/images/${key}`;

/**
 * Downscales and re-encodes an image in the browser.
 * Falls back to the original file if the format cannot be decoded here (some
 * browsers cannot read HEIC), so the upload still carries something usable.
 */
async function shrink(file) {
  if (!file.type.startsWith('image/')) return null;
  if (file.type === 'image/gif') return file; // re-encoding would kill the animation
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    // Already small enough and already a sane format: send as-is.
    if (scale === 1 && file.size < 600 * 1024 && file.type === 'image/jpeg') {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', JPEG_QUALITY));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // undecodable here — let the Worker judge it
  }
}

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

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
  const items = approved.get(person.id) || [];
  if (items.length) {
    const list = el('div', 'suggest-list');
    for (const item of items) {
      const card = el('div', 'suggest-item');
      const meta = el('div', 'suggest-meta');
      meta.append(el('span', 'suggest-who', item.author || 'Anonim'));
      meta.append(el('span', 'suggest-when', (item.createdAt || '').slice(0, 10)));
      card.append(meta);
      if (item.text) card.append(el('div', 'suggest-text', item.text));
      if (item.images?.length) {
        const gallery = el('div', 'suggest-gallery');
        for (const key of item.images) {
          const a = el('a', 'suggest-shot');
          a.href = imageUrl(key);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          const img = el('img');
          img.src = imageUrl(key);
          img.alt = `Fotografi e dërguar për ${person.name}`;
          img.loading = 'lazy';
          a.append(img);
          gallery.append(a);
        }
        card.append(gallery);
      }
      list.append(card);
    }
    box.append(list);
  }

  /* ── the form ── */
  if (!API_BASE) {
    // No API configured: say so honestly rather than offer a dead form.
    toggle.remove();
    box.append(el('p', 'suggest-hint',
      'Dërgimi i sugjerimeve nuk është aktivizuar ende në këtë faqe.'));
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
  text.setAttribute('aria-label', 'Sugjerimi yt');

  /* ── photographs ── */
  const picked = []; // { file, url }
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.hidden = true;

  const drop = el('div', 'suggest-drop');
  drop.tabIndex = 0;
  drop.setAttribute('role', 'button');
  drop.append(el('span', 'suggest-drop-label', '+ Shto fotografi'));
  drop.append(el('span', 'suggest-drop-hint', `deri në ${MAX_IMAGES} · zvogëlohen automatikisht`));

  const gallery = el('div', 'suggest-thumbs');

  const renderThumbs = () => {
    gallery.replaceChildren();
    picked.forEach((entry, i) => {
      const cell = el('div', 'suggest-thumb');
      const img = el('img');
      img.src = entry.url;
      img.alt = entry.file.name;
      cell.append(img);
      cell.append(el('span', 'suggest-thumb-size', kb(entry.file.size)));
      const remove = el('button', 'suggest-thumb-x', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Hiq ${entry.file.name}`);
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(entry.url);
        picked.splice(i, 1);
        renderThumbs();
      });
      cell.append(remove);
      gallery.append(cell);
    });
    drop.hidden = picked.length >= MAX_IMAGES;
  };

  const addFiles = async (fileList) => {
    const room = MAX_IMAGES - picked.length;
    const incoming = [...fileList].filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (!incoming.length) return;
    drop.classList.add('is-busy');
    for (const file of incoming) {
      const shrunk = await shrink(file);
      if (shrunk) picked.push({ file: shrunk, url: URL.createObjectURL(shrunk) });
    }
    drop.classList.remove('is-busy');
    renderThumbs();
  };

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach((evt) =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((evt) =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

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
    'Shkon te mbajtësi i trungut për shqyrtim. Shfaqet këtu vetëm pasi të miratohet.'));

  const status = el('p', 'suggest-status');
  status.setAttribute('role', 'status');
  status.hidden = true;

  form.append(name, text, gallery, drop, fileInput, trap, actions, status);
  box.append(form);

  toggle.addEventListener('click', () => {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? '+ Shto sugjerim' : 'Anulo';
    if (form.hidden) return;
    // A cursor wants the caret waiting in the first field. A thumb does not:
    // focusing throws the keyboard up over the sheet before you have even seen
    // the form. Bring it into view instead, and let the next tap open it.
    if (window.matchMedia?.('(pointer: coarse)').matches) {
      form.scrollIntoView({ block: 'nearest' });
    } else {
      (name.value ? text : name).focus();
    }
  });

  const say = (message, kind) => {
    status.hidden = false;
    status.textContent = message;
    status.className = `suggest-status is-${kind}`;
  };

  const ERRORS = {
    rate_limited: 'Ke dërguar shumë sugjerime së fundmi. Provo pas një ore.',
    image_too_large: 'Njëra fotografi është shumë e madhe.',
    too_many_images: `Maksimumi është ${MAX_IMAGES} fotografi.`,
    bad_image_type: 'Formati i fotografisë nuk pranohet.',
    no_image_store: 'Dërgimi i fotografive nuk është aktivizuar ende.',
    empty: 'Shkruaj diçka ose bashkëngjit një fotografi.',
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = new FormData();
    body.set('personId', person.id);
    body.set('author', name.value.trim().slice(0, MAX_NAME));
    body.set('text', text.value.trim().slice(0, MAX_TEXT));
    body.set('website', trapInput.value);
    for (const entry of picked) body.append('images', entry.file, entry.file.name);

    if (!body.get('text') && !picked.length) {
      say(ERRORS.empty, 'error');
      text.focus();
      return;
    }

    submit.disabled = true;
    say(picked.length ? 'Duke dërguar fotografitë…' : 'Duke dërguar…', 'ok');
    try {
      const res = await fetch(`${API_BASE}/api/suggestions`, { method: 'POST', body });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(ERRORS[detail.error] || `HTTP ${res.status}`);
      }
      try { localStorage.setItem(REMEMBERED_NAME, body.get('author')); } catch { /* private mode */ }
      picked.forEach((p) => URL.revokeObjectURL(p.url));
      picked.length = 0;
      form.reset();
      renderThumbs();
      name.hidden = text.hidden = gallery.hidden = drop.hidden = actions.hidden = true;
      say('Faleminderit — sugjerimi u dërgua për shqyrtim.', 'ok');
    } catch (err) {
      say(err.message || 'Nuk u dërgua dot. Provo përsëri.', 'error');
      submit.disabled = false;
    }
  });

  return box;
}
