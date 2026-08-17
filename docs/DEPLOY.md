# Deploying

Two independent pieces:

| | Where | Needed? |
|---|---|---|
| The site | GitHub Pages at `luta.family` | yes |
| Suggestions API | Cloudflare Worker at `api.luta.family` | optional |

Do part 1 and the archive is live. Part 2 only adds the suggestion box, and the
site is designed to work perfectly without it.

---

## 1. The site on GitHub Pages

### Push the repo

```bash
gh repo create luta-family --public --source=. --remote=origin --push
```

### Turn on Pages

In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The workflow in `.github/workflows/deploy.yml` publishes the repo root on every
push to `main`. There is no build step — it uploads the files as they are.

### Point the domain — later

**Not set up yet:** `luta.family` is not registered, so the site is served from
`https://eduardluta.github.io/luta-family/` and there is no `CNAME` in the repo
root. A ready-made one is parked at `docs/CNAME.luta.family`.

Once you own the domain, three things change together:

1. `git mv docs/CNAME.luta.family CNAME`
2. In `index.html`, set `<link rel="canonical">` and `og:url` to
   `https://luta.family/`
3. In `assets/js/config.js`, set `SITE_URL` to `https://luta.family` — and add
   that origin to `ALLOWED_ORIGINS` in `api/wrangler.toml` if the API is running

Then at your DNS provider add:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<your-github-username>.github.io` |

Then in **Settings → Pages**, set the custom domain to `luta.family` and tick
**Enforce HTTPS** once the certificate is issued (usually within an hour).

`.family` is an ordinary gTLD available from most registrars.

---

## 2. Suggestions API on Cloudflare (optional)

GitHub Pages serves static files only, so the suggestion box needs a small
server elsewhere. This is a ~200-line Worker and a single table; it fits in
Cloudflare's free tier.

```bash
cd api
npm install
npx wrangler login
```

### Create the database

```bash
npx wrangler d1 create luta-family
```

Copy the `database_id` it prints into `api/wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`. Then create the table:

```bash
npx wrangler d1 execute luta-family --remote --file=./schema.sql
```

### Create the photo store

Suggestions can carry photographs — someone scans an old picture and sends it
in. Those live in a KV namespace:

```bash
npx wrangler kv namespace create IMAGES
```

Copy the `id` it prints into `api/wrangler.toml`, replacing
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

> KV rather than R2 on purpose: R2 asks for a payment method even on its free
> tier, KV does not. A family archive will not come near KV's free limits
> (1 GB stored, 1,000 writes a day) — every photo is downscaled to 1600px in the
> browser before upload, so they land around 100–300 KB each.

### Set the secrets

```bash
npx wrangler secret put ADMIN_TOKEN   # the admin.html password — make it long and random
npx wrangler secret put IP_SALT       # any long random string, used to hash IPs for rate limiting
```

Generate good values with:

```bash
openssl rand -base64 32
```

Neither is ever written to a file in this repo. `ADMIN_TOKEN` is the only thing
protecting the moderation queue — treat it like a password, because it is one.

### Turn on the notification email

A queue nobody is told about is a queue nobody reads, so each new suggestion
emails the archive's keeper. This uses Cloudflare Email Routing rather than a
third-party sender — no API key to hold, no extra account, free.

1. Open **Email Routing** for the zone and add the keeper's address under
   **Destination Addresses**. Cloudflare emails a verification link; click it.
   The address must show **Verified**.
2. Set `NOTIFY_TO` (that address) and `NOTIFY_FROM` (any address on a domain in
   this account) in `api/wrangler.toml`, and point the `[[send_email]]`
   binding's `destination_address` at the same verified address.

Cloudflare will only deliver to an already-verified destination, which is the
safeguard that matters: this Worker cannot be turned into a spam relay.

Sending is fire-and-forget, after the response — if mail ever fails, the
suggestion is still stored and still shows in the queue.

> Enabling Email Routing adds MX and SPF records to the zone. Harmless if the
> domain carries no mail today, but if you later put Google Workspace or similar
> on it, those MX records need replacing.

### Deploy

```bash
npx wrangler deploy
```

### Give it a domain

Uncomment the `[[routes]]` block at the bottom of `api/wrangler.toml`, then
redeploy. In the Cloudflare dashboard for the zone, add a proxied DNS record for
`api` (Workers custom domains create this for you when the zone is on
Cloudflare).

If `luta.family` is not on Cloudflare, you can skip the custom domain and use the
`*.workers.dev` URL that `wrangler deploy` prints instead — it works fine.

### Switch the site on

Edit `assets/js/config.js`:

```js
export const API_BASE = 'https://api.luta.family';
```

Commit and push. The suggestion form replaces the email fallback automatically.

### Check it

```bash
curl https://api.luta.family/api/suggestions
# {"items":[]}
```

Then open `https://luta.family/admin.html`, enter the `ADMIN_TOKEN`, and you
should see an empty queue.

---

## Moderating

`admin.html` is a public page — anyone can load it — but every request it makes
carries the `ADMIN_TOKEN`, and the API rejects anything without it. The token is
held in `sessionStorage` and is gone when the tab closes.

Approving a suggestion publishes that note under the person. It does **not**
change the archive: to actually fix a date or a name, edit `data/family.js` and
push.

Photographs attached to a suggestion appear as thumbnails in the queue; click one
to open it full size before deciding. Deleting a suggestion also deletes its
photographs from KV.

Built-in abuse protection: a hidden honeypot field, a cap of 8 submissions per IP
per hour, at most 6 images of 3 MB each, an allowlist of image types, length
limits, and a strict origin allowlist. Submissions are never visible until
approved, so the worst a spammer achieves is a queue you delete.

---

## Backups

The archive is `data/family.js` in git — every version of it, forever. That is
the backup.

The Worker's database only holds suggestions. Losing it costs nothing that
matters. To keep a copy anyway:

```bash
cd api && npx wrangler d1 export luta-family --remote --output=backup.sql
```
