# Familja Luta — working notes

A family archive, not a web app. Optimise for someone opening this in 2045 and
being able to fix a date.

## Non-negotiables

1. **No build step, no framework, no dependencies to install.** Plain HTML, CSS
   and ES modules, served as files. If a change requires a bundler, it is the
   wrong change.
2. **`data/family.js` is the archive.** Everything renders from it. It stays
   hand-editable: one person per line, plain JSON objects, commented header.
   Never reformat it into something a non-programmer cannot edit.
3. **Nothing third-party at runtime.** Fonts and Leaflet are vendored. The only
   external request is OpenStreetMap tiles on the map page. Do not add a CDN.
4. **The site must work with the API switched off.** `API_BASE = ''` in
   `assets/js/config.js` is a supported, tested state — the suggestion box says
   so plainly and nothing else changes. Never make the archive depend on a
   server. (It currently points at `api.luta.family`.)

## Privacy

This is a public domain publishing ~120 living people, including children.

- **No phone numbers, no social links.** Both fields were deliberately removed
  from the data model and the dialog. Do not reintroduce them.
- Suggestions are moderated: nothing a stranger types appears until approved.
- The API stores a salted hash of the submitter's IP for rate limiting, never
  the address.

## Source fidelity

The biographies are quoted verbatim from Xhafer Luta's manuscript, typos and
dialect spellings included ("Mësus", "stufentve", "më" for "në"). **Do not
correct them** — it is a historical document. Where the source contradicts
itself, `sourceNote` records the contradiction and `uncertain: true` shows a †.

`birthPlace` / `profession` / `residence` were extracted once by script and are
guesses. They are ordinary editable fields now; nothing regenerates them.

Empty fields show "Nuk është shënuar" — but the biography is never generated.
It is verbatim from the manuscript or the same "not recorded" note; the old
summary that restated the record in prose is gone, do not bring it back.

## Albanian

- Names fold ë→e, ç→c, j→i for search, so ASCII typing finds everything.
- `sex` drives grammatical agreement in generated copy — "Bashkëshorte" vs
  "Bashkëshort" for a spouse is inflected from the sex of the person they
  married. It is data, not a heuristic, precisely so it can be corrected.
- All user-facing copy is Albanian. Keep it that way.

## Things that bit us

- **Zero-sized viewport.** The tree frames its opening view from a measurement.
  A page can lay out at zero width (background tab, collapsed pane, rotation),
  and centring against zero puts the tree off-screen. `#ensureFramed()` defers
  framing and is driven from three places because no single one fires
  everywhere. The map has the same trap — Leaflet needs `invalidateSize()`.
- **`hidden` vs `display: flex`.** The `hidden` attribute is only a UA-sheet
  `display: none`, so any author `display` beats it. `site.css` restates
  `[hidden] { display: none !important }`. Keep it.
- **Dialog routing.** Opening person B tears down person A's dialog. A's
  `onClose` must not act on the URL during that teardown — hence the
  `replacingDialog` flag. Closing uses `replaceState`, not `history.back()`,
  because someone arriving on a shared link has no earlier entry to go back to.
- **Partner order is load-bearing.** A spouse's page is `#/person/<id>-p<n>` —
  the index into `partners`, same convention as the photo files, and a shape
  the API's personId check accepts. Shared links and suggestions are keyed to
  it, so spouses are append-only; `validate.mjs` refuses tree ids ending in
  `-p<n>` to keep the namespace clear.

## Before pushing

```bash
node scripts/validate.mjs
```

CI runs this and refuses to deploy a broken tree. `scripts/build-data.mjs`
regenerates the archive from the original export and **discards hand edits** —
it has done its job; do not run it casually.
