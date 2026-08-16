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

### Point the domain

The repo contains a `CNAME` file with `luta.family`, which tells Pages to serve
the custom domain. At your DNS provider add:

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `<your-github-username>.github.io` |

Then in **Settings → Pages**, set the custom domain to `luta.family` and tick
**Enforce HTTPS** once the certificate is issued (usually within an hour).

> If you do not own `luta.family` yet, register it first — `.family` is a normal
> gTLD available from most registrars. Until then the site works at
> `https://<username>.github.io/luta-family/`; delete the `CNAME` file for that
> to work correctly.

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

Built-in abuse protection: a hidden honeypot field, a cap of 8 submissions per IP
per hour, length limits, and a strict origin allowlist. Submissions are never
visible until approved, so the worst a spammer achieves is a queue you delete.

---

## Backups

The archive is `data/family.js` in git — every version of it, forever. That is
the backup.

The Worker's database only holds suggestions. Losing it costs nothing that
matters. To keep a copy anyway:

```bash
cd api && npx wrangler d1 export luta-family --remote --output=backup.sql
```
