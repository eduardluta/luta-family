# Familja Luta — trungu familjar

A digital archive of the Luta family of Pejë: nine generations from 1700 to the
present, built from the family history written by **Xhafer (Lutfulla) Luta**.

Live at **[luta.family](https://luta.family)**.

The site has three parts: the **historiati** (the written history, in the
original Albanian), the **trungu** (an interactive tree of 150 people), and a
**map** of the family's properties before and after the 1920 and 1936 land
reforms.

---

## The one thing to know

**`data/family.js` is the archive.** Everything else renders it. It is a plain,
hand-editable list of people — no database, no CMS, no build step. Add a person
by adding a line; the layout, search, counts, generation markers and lineage
chains all follow on their own.

The site is deliberately plain static HTML, CSS and ES modules. No framework, no
bundler, nothing to `npm install` to run it. That is on purpose: this needs to
still work in twenty years, when today's tooling is long gone.

## Running it

Any static file server. From the repo root:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>. There is nothing to build.

## Editing the family

Open [`data/family.js`](data/family.js) and edit. Each person is one line:

```js
{"id":"mxh6","parent":"ml5","gen":6,"branch":"mustafa","name":"Xhafer Lutfulla Luta","sex":"m","years":"1945","birth":1945,"death":null,"photo":"mxh6.jpg","bio":"…"}
```

Rules that matter:

- **`id` is permanent.** Suggestions and shared links point at it. Never reuse or
  change one.
- **`gen` must be the parent's `gen` + 1.** The tree draws rows by generation.
- **`parent`** is the father's `id`; only the root has `null`.
- **`sex`** is `'m'` or `'f'` — Albanian needs it for grammatical agreement in
  generated summaries ("i lindur" vs "e lindur").
- Photos go in `assets/photos/` and are referenced by filename alone.

`birthPlace`, `profession` and `residence` were extracted once by script from the
bio prose and **are guesses** — the source has typos and dialect spellings.
Correct them freely; nothing regenerates them.

To check your edits:

```bash
node scripts/build-data.mjs --report
```

That validates parent links, generation numbering and date sanity without
writing anything.

> `scripts/build-data.mjs` (without `--report`) regenerates `data/family.js` from
> the original design export and **discards hand edits**. It has done its job —
> it is kept for reference, not for routine use.

## Suggestions from the family

Relatives can propose corrections on any person, and attach up to six
photographs — someone scans an old picture and sends it in. Every suggestion
arrives as `pending` and appears on the site **only after an admin approves it**
at [luta.family/admin.html](https://luta.family/admin.html).

Photographs are downscaled to 1600px in the browser before upload, so a 6 MB
phone photo arrives around 100–300 KB.

This needs a server, which GitHub Pages cannot provide, so it runs as a
Cloudflare Worker at `api.luta.family` — the code is in [`api/`](api/), the
setup in [`docs/DEPLOY.md`](docs/DEPLOY.md). It stores records in D1 and
photographs in KV.

**The archive never depends on it.** Set `API_BASE` back to `''` in
[`assets/js/config.js`](assets/js/config.js) and the feature switches itself off
cleanly — no failed requests, nothing else on the page changes.

Approving a suggestion publishes that note under the person. It does **not**
change the archive: real corrections are still made by editing `data/family.js`.

The admin password is a Worker secret (`ADMIN_TOKEN`), set with
`wrangler secret put` and never stored in this repo.

## Layout

```
index.html            the site — historiati and trungu
harta.html            the property map (Leaflet, vendored)
admin.html            suggestion moderation queue
data/family.js        THE ARCHIVE — 150 people, hand-editable
assets/
  css/tokens.css      "Classical" design system, from the design handoff
  css/site.css        page styles
  js/model.js         data access, Albanian name and grammar rules
  js/tree.js          tree layout, pan and zoom
  js/person.js        the person dialog
  js/suggestions.js   suggestions client (degrades to email)
  js/app.js           wiring, search, #/person/<id> routing
  fonts/              Cormorant Garamond + Lora, self-hosted
  photos/             40 family photographs
api/                  Cloudflare Worker + D1 for suggestions
docs/                 the original source document and deployment guide
```

Nothing is loaded from a third party at runtime except the OpenStreetMap tiles
on the map page. Fonts and Leaflet are vendored so the site cannot rot when a
CDN disappears.

## Sharing a person

Every person has a permanent link:

```
https://luta.family/#/person/mxh6
```

It opens the tree focused on them with their record open.

## Credits

History written by Xhafer (Lutfulla) Luta. The original 1936 land-reform
document is held by the family in Pejë; a scan of the source manuscript is in
[`docs/`](docs/). Design system: "Classical". Map data © OpenStreetMap
contributors.
