/**
 * tree.js — the family tree canvas: layout, rendering, pan and zoom.
 *
 * Layout is the classic tidy-tree reduction: walk depth-first, give every
 * childless person the next free column, and centre every parent over the span
 * of their children. Generation fixes the row, so the result reads as a
 * pedigree chart — which is what the family already knows how to read.
 *
 * The whole scene is one CSS transform on a single element. 150 nodes and 149
 * connector paths are built once and never re-created; panning moves one
 * matrix, so it stays smooth on a phone.
 */

import { PEOPLE, ROMAN, get, childrenOf, treeLabel, initials, lifespan } from './model.js';

/* Layout constants, carried over from the design so spacing matches the mock. */
const SLOT_W = 118;   // horizontal pitch of one leaf column
const LEVEL_H = 200;  // vertical pitch of one generation
const PAD_X = 190;    // gutter left of the first column, clear of the roman numerals
const PAD_TOP = 130;
const NODE_W = 116;
const NODE_H = 104;   // where a connector leaves the bottom of a node

const MIN_SCALE = 0.05;
const MAX_SCALE = 1.8;

/**
 * Positions every person and returns the geometry the renderer needs.
 * Pure — no DOM, so it is trivially checkable.
 */
export function computeLayout(people = PEOPLE) {
  const x = new Map();
  let column = 0;

  // Post-order: children claim columns first, then the parent centres on them.
  const place = (person) => {
    const kids = childrenOf(person.id);
    if (!kids.length) {
      x.set(person.id, PAD_X + column * SLOT_W);
      column += 1;
      return;
    }
    kids.forEach(place);
    const xs = kids.map((k) => x.get(k.id));
    x.set(person.id, (Math.min(...xs) + Math.max(...xs)) / 2);
  };
  people.filter((p) => !p.parent).forEach(place);

  const generations = Math.max(...people.map((p) => p.gen));
  const width = PAD_X * 2 + column * SLOT_W;
  const height = PAD_TOP + generations * LEVEL_H;
  const at = (person) => ({ x: x.get(person.id), y: PAD_TOP + (person.gen - 1) * LEVEL_H });

  // Connectors: down out of the parent, across at the midpoint, down into the
  // child. Orthogonal elbows read as descent; curves read as decoration.
  const links = people
    .filter((p) => p.parent)
    .map((p) => {
      const a = at(get(p.parent));
      const b = at(p);
      const y1 = a.y + NODE_H;
      const y2 = b.y + 2;
      const mid = (y1 + y2) / 2;
      return `M${a.x} ${y1} L${a.x} ${mid} L${b.x} ${mid} L${b.x} ${y2}`;
    });

  const rows = [];
  for (let g = 1; g <= generations; g += 1) {
    const y = PAD_TOP + (g - 1) * LEVEL_H;
    rows.push({ gen: g, lineY: y - 44, markY: y + 12, roman: ROMAN[g] });
  }

  return { at, links, rows, width, height, generations };
}

const svgEl = (name, attrs) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export class TreeCanvas {
  /**
   * @param {HTMLElement} viewport clipping frame
   * @param {HTMLElement} scene    transformed layer inside it
   * @param {(id: string) => void} onSelect
   */
  constructor(viewport, scene, onSelect) {
    this.viewport = viewport;
    this.scene = scene;
    this.onSelect = onSelect;
    this.layout = computeLayout();
    this.nodes = new Map();
    this.view = { x: 30, y: 20, scale: 0.5 };
    this.pointers = new Map();
    this.drag = null;
    this.pinchDistance = null;
    this.suppressClick = false;

    // Whether the opening view has been framed against a real measurement.
    // Until the viewport actually has a size, any centring maths is nonsense.
    this.framed = false;
    this.lastSize = null;

    this.#render();
    this.#bind();
    this.#watchSize();
    this.#ensureFramed();
  }

  /** The viewport box, or null if it has not been laid out to a usable size. */
  #box() {
    const r = this.viewport.getBoundingClientRect();
    return r.width >= 4 && r.height >= 4 ? r : null;
  }

  /**
   * Frames the opening view the first time the viewport has a real size.
   *
   * A viewport can measure zero at construction — a background tab, a pane that
   * has not expanded, styles still settling — and centring against zero throws
   * the whole tree off-screen. So framing is deferred rather than assumed, and
   * it is driven from three places (a resize observer, the window resize event,
   * and the first user interaction) because no single one of them fires
   * everywhere. Framing is idempotent; whichever gets there first wins.
   *
   * @returns {boolean} true if this call did the framing
   */
  #ensureFramed() {
    if (this.framed) return false;
    const r = this.#box();
    if (!r) return false;
    this.framed = true;
    this.lastSize = { w: r.width, h: r.height };
    this.reset();
    return true;
  }

  /** Resize: frame if we never could, otherwise hold the current centre. */
  #onResize() {
    if (this.#ensureFramed()) return;
    const r = this.#box();
    if (!r || !this.lastSize) return;
    const previous = this.lastSize;
    this.lastSize = { w: r.width, h: r.height };
    if (previous.w === r.width && previous.h === r.height) return;
    const { x, y, scale } = this.view;
    this.centreOn((previous.w / 2 - x) / scale, (previous.h / 2 - y) / scale, scale);
  }

  #watchSize() {
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.#onResize()).observe(this.viewport);
    }
    // Covers phone rotation even where the observer is unavailable.
    window.addEventListener('resize', () => this.#onResize());
  }

  #render() {
    const { layout } = this;
    const frag = document.createDocumentFragment();

    for (const row of layout.rows) {
      const line = document.createElement('div');
      line.className = 'gen-line';
      line.style.top = `${row.lineY}px`;
      line.style.width = `${layout.width}px`;
      frag.append(line);

      const mark = document.createElement('div');
      mark.className = 'gen-mark';
      mark.style.top = `${row.markY}px`;
      mark.textContent = row.roman;
      mark.setAttribute('aria-hidden', 'true');
      frag.append(mark);
    }

    const svg = svgEl('svg', { width: layout.width, height: layout.height, 'aria-hidden': 'true' });
    for (const d of layout.links) svg.append(svgEl('path', { d, class: 'link-path' }));
    frag.append(svg);

    // One <ul> so the tree is announced as a list of 150 people rather than a
    // wall of anonymous buttons. Position is visual; order here is document order.
    const list = document.createElement('ul');
    list.className = 'node-list';
    list.style.cssText = 'list-style:none;margin:0;padding:0';
    list.setAttribute('aria-label', 'Anëtarët e familjes');

    for (const person of PEOPLE) {
      const { x, y } = layout.at(person);
      const li = document.createElement('li');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'node';
      btn.dataset.personId = person.id;
      btn.style.left = `${Math.round(x - NODE_W / 2)}px`;
      btn.style.top = `${Math.round(y)}px`;

      const years = lifespan(person);
      const label = treeLabel(person);
      btn.title = years ? `${person.name} · ${years}` : person.name;
      btn.setAttribute('aria-label', `${person.name}${years ? `, ${years}` : ''}`);

      if (person.photo) {
        const img = document.createElement('img');
        img.className = 'node-photo';
        img.src = `assets/photos/${person.photo}`;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 62;
        img.height = 62;
        btn.append(img);
      } else {
        const span = document.createElement('span');
        span.className = 'node-initials';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = initials(person);
        btn.append(span);
      }

      const text = document.createElement('span');
      text.className = 'node-text';
      const name = document.createElement('span');
      name.className = 'node-name';
      name.textContent = label;
      text.append(name);
      if (years) {
        const y2 = document.createElement('span');
        y2.className = 'node-years';
        y2.textContent = years;
        text.append(y2);
      }
      btn.append(text);

      btn.addEventListener('click', () => {
        // A click that ended a drag is not a click on a person.
        if (this.suppressClick) { this.suppressClick = false; return; }
        this.onSelect(person.id);
      });

      li.append(btn);
      list.append(li);
      this.nodes.set(person.id, btn);
    }

    frag.append(list);
    this.scene.replaceChildren(frag);
  }

  /* ── view transform ───────────────────────────────────────────────────── */
  #apply() {
    const { x, y, scale } = this.view;
    this.scene.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  /** Centre a scene-space point in the viewport at the given scale. */
  centreOn(sceneX, sceneY, scale) {
    const r = this.#box();
    if (!r) return; // unmeasurable; #ensureFramed will retry once it has a size
    this.view.scale = scale;
    this.view.x = r.width / 2 - sceneX * scale;
    this.view.y = r.height / 2 - sceneY * scale;
    this.#apply();
  }

  /** Zoom by `factor`, holding the point under (clientX, clientY) still. */
  zoomAt(factor, clientX, clientY) {
    this.#ensureFramed();
    const r = this.#box();
    if (!r) return;
    const px = clientX - r.left;
    const py = clientY - r.top;
    const v = this.view;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
    const k = next / v.scale;
    v.x = px - (px - v.x) * k;
    v.y = py - (py - v.y) * k;
    v.scale = next;
    this.#apply();
  }

  zoomBy(factor) {
    const r = this.#box();
    if (!r) return;
    this.zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2);
  }

  /** Fit the whole tree in view. */
  fit() {
    this.#ensureFramed();
    const r = this.#box();
    if (!r) return;
    const scale = Math.max(
      MIN_SCALE,
      Math.min(r.width / this.layout.width, r.height / this.layout.height) * 0.94
    );
    this.centreOn(this.layout.width / 2, this.layout.height / 2, scale);
  }

  /** Opening view — the root, with room below it for the branches. */
  reset() {
    const root = PEOPLE.find((p) => !p.parent);
    const p = this.layout.at(root);
    this.centreOn(p.x, p.y + LEVEL_H * 1.7, 0.55);
  }

  focusPerson(id, { scale } = {}) {
    const person = get(id);
    if (!person) return;
    this.#ensureFramed();
    const p = this.layout.at(person);
    this.centreOn(p.x, p.y + 55, scale ?? Math.max(this.view.scale, 0.9));
  }

  focusGeneration(gen) {
    this.#ensureFramed();
    const members = PEOPLE.filter((p) => p.gen === gen);
    if (!members.length) return;
    const middle = members[Math.floor(members.length / 2)];
    const p = this.layout.at(middle);
    this.centreOn(p.x, p.y + 55, Math.max(0.5, this.view.scale));
  }

  /** Briefly highlight a person after a search jump. */
  flash(id) {
    clearTimeout(this._flashTimer);
    for (const el of this.nodes.values()) el.classList.remove('is-flash');
    const el = this.nodes.get(id);
    if (!el) return;
    // Restart the animation even if the same node flashes twice in a row.
    void el.offsetWidth;
    el.classList.add('is-flash');
    this._flashTimer = setTimeout(() => el.classList.remove('is-flash'), 2500);
  }

  /* ── interaction ──────────────────────────────────────────────────────── */
  #bind() {
    const vp = this.viewport;

    vp.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY);
      },
      { passive: false }
    );

    vp.addEventListener('pointerdown', (e) => {
      // Last line of defence: if nothing else framed the view, do it now —
      // before the drag maths starts from a nonsense transform.
      this.#ensureFramed();
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.suppressClick = false;
      if (this.pointers.size === 1) {
        this.drag = { x: e.clientX, y: e.clientY, moved: false };
      }
    });

    vp.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.pointers.size === 2) {
        this.#capture(e);
        const [a, b] = [...this.pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDistance) {
          this.zoomAt(distance / this.pinchDistance, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        this.pinchDistance = distance;
        if (this.drag) this.drag.moved = true;
        return;
      }

      if (!this.drag) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      // 5px of slop so a slightly shaky tap still opens the person.
      if (!this.drag.moved && Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y) > 5) {
        this.drag.moved = true;
        this.#capture(e);
        vp.classList.add('is-panning');
      }
      if (this.drag.moved) {
        this.view.x += dx;
        this.view.y += dy;
        this.#apply();
      }
    });

    const endPointer = (e) => {
      this.pointers.delete(e.pointerId);
      this.pinchDistance = null;
      if (this.drag?.moved) this.suppressClick = true;
      if (!this.pointers.size) {
        this.drag = null;
        vp.classList.remove('is-panning');
      }
    };
    vp.addEventListener('pointerup', endPointer);
    vp.addEventListener('pointercancel', endPointer);

    // Keyboard panning and zooming, for anyone not using a mouse. Only when the
    // focus is the canvas itself — arrow keys inside a node should not pan.
    vp.addEventListener('keydown', (e) => {
      if (e.target !== vp) return;
      const step = e.shiftKey ? 200 : 60;
      const moves = {
        ArrowLeft: [step, 0], ArrowRight: [-step, 0],
        ArrowUp: [0, step], ArrowDown: [0, -step],
      };
      if (moves[e.key]) {
        e.preventDefault();
        this.view.x += moves[e.key][0];
        this.view.y += moves[e.key][1];
        this.#apply();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this.zoomBy(1.35);
      } else if (e.key === '-') {
        e.preventDefault();
        this.zoomBy(1 / 1.35);
      } else if (e.key === '0') {
        e.preventDefault();
        this.fit();
      }
    });

    // Keeping a node in view when it is tabbed to; the browser cannot scroll a
    // transformed layer into view on its own.
    this.scene.addEventListener('focusin', (e) => {
      const id = e.target?.dataset?.personId;
      if (id && !this.drag) this.focusPerson(id, { scale: Math.max(this.view.scale, 0.6) });
    });
  }

  #capture(e) {
    try { this.viewport.setPointerCapture(e.pointerId); } catch { /* already captured */ }
  }
}
