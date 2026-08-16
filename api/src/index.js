/**
 * Familja Luta — suggestions API.
 *
 * A Cloudflare Worker over D1 (the suggestion records) and KV (the attached
 * photographs). GitHub Pages cannot run server code, so the static site lives
 * there and this handles the one thing that needs a server: taking corrections
 * and photographs from the family and holding them until an admin approves.
 *
 * Nothing here is load-bearing. If this Worker is down, deleted, or never
 * deployed, the site still renders the entire archive — the suggestion form
 * simply reports that submissions are unavailable.
 *
 * Public
 *   GET  /api/suggestions          approved suggestions, for the site
 *   POST /api/suggestions          multipart submit; always lands as `pending`
 *   GET  /api/images/<key>         an attached photograph
 *
 * Admin — all require `Authorization: Bearer <ADMIN_TOKEN>`
 *   GET    /api/admin/suggestions?status=pending
 *   POST   /api/admin/suggestions/:id   { "action": "approve"|"reject"|"unreview" }
 *   DELETE /api/admin/suggestions/:id
 */

const MAX_TEXT = 2000;
const MAX_AUTHOR = 80;
const MAX_PER_IP_PER_HOUR = 8;
const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // the browser downscales well below this
const PERSON_ID = /^[a-z0-9_-]{1,40}$/i;
const IMAGE_KEY = /^img\/[a-z0-9-]+\.(jpg|png|webp|gif)$/i;
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

function cors(origin) {
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function allowedOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin');
  if (!allowed.length) return origin || '*';
  return origin && allowed.includes(origin) ? origin : allowed[0];
}

/** Comparison that does not leak the token through timing. */
function tokenMatches(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string') return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function isAdmin(request, env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return Boolean(env.ADMIN_TOKEN) && tokenMatches(token, env.ADMIN_TOKEN);
}

/** Salted hash of the caller's IP — enough to rate-limit, not to identify. */
async function hashIp(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!ip) return '';
  const data = new TextEncoder().encode(`${env.IP_SALT || 'luta'}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const parseImages = (row) => {
  try {
    const list = JSON.parse(row || '[]');
    return Array.isArray(list) ? list.filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
};

/** Removes a suggestion's photographs from KV. Best effort — a leftover blob is
 *  harmless, a failed delete that blocks the request is not. */
async function dropImages(env, keys) {
  if (!env.IMAGES) return;
  await Promise.allSettled(keys.map((k) => env.IMAGES.delete(k)));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    /* ── images ─────────────────────────────────────────────────────────────
       Public and immutable: the key contains a uuid, so a long cache is safe. */
    if (url.pathname.startsWith('/api/images/') && request.method === 'GET') {
      if (!env.IMAGES) return json({ error: 'no_image_store' }, 503, origin);
      const key = decodeURIComponent(url.pathname.slice('/api/images/'.length));
      if (!IMAGE_KEY.test(key)) return json({ error: 'bad_key' }, 400, origin);
      const object = await env.IMAGES.getWithMetadata(key, { type: 'arrayBuffer' });
      if (!object || !object.value) return json({ error: 'not_found' }, 404, origin);
      return new Response(object.value, {
        status: 200,
        headers: {
          'content-type': object.metadata?.contentType || 'application/octet-stream',
          'cache-control': 'public, max-age=31536000, immutable',
          ...cors(origin),
        },
      });
    }

    if (!env.DB) return json({ error: 'not_configured' }, 503, origin);

    try {
      /* ── public read ── */
      if (url.pathname === '/api/suggestions' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, person_id, author, text, images, created_at
             FROM suggestions WHERE status = 'approved'
            ORDER BY created_at ASC`
        ).all();
        return new Response(
          JSON.stringify({
            items: (results || []).map((r) => ({
              id: r.id,
              personId: r.person_id,
              author: r.author,
              text: r.text,
              images: parseImages(r.images),
              createdAt: r.created_at,
            })),
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'cache-control': 'public, max-age=60, stale-while-revalidate=600',
              ...cors(origin),
            },
          }
        );
      }

      /* ── public write ──
         multipart/form-data: personId, author, text, website (honeypot), and
         zero or more `images` file parts. */
      if (url.pathname === '/api/suggestions' && request.method === 'POST') {
        let form;
        try {
          form = await request.formData();
        } catch {
          return json({ error: 'bad_form' }, 400, origin);
        }

        // Honeypot: a real person never sees this field, bots fill everything.
        // Answer 202 rather than an error so the bot learns nothing.
        if (form.get('website')) return json({ ok: true }, 202, origin);

        const personId = String(form.get('personId') || '').trim();
        const text = String(form.get('text') || '').trim().slice(0, MAX_TEXT);
        const author = String(form.get('author') || '').trim().slice(0, MAX_AUTHOR);
        const files = form.getAll('images').filter((f) => typeof f === 'object' && f.size > 0);

        if (!PERSON_ID.test(personId)) return json({ error: 'bad_person' }, 400, origin);
        // A photograph on its own is a perfectly good contribution.
        if (text.length < 2 && !files.length) return json({ error: 'empty' }, 400, origin);
        if (files.length > MAX_IMAGES) return json({ error: 'too_many_images' }, 400, origin);
        for (const file of files) {
          if (!ALLOWED_TYPES[file.type]) return json({ error: 'bad_image_type' }, 400, origin);
          if (file.size > MAX_IMAGE_BYTES) return json({ error: 'image_too_large' }, 413, origin);
        }
        if (files.length && !env.IMAGES) return json({ error: 'no_image_store' }, 503, origin);

        const ipHash = await hashIp(request, env);
        if (ipHash) {
          const since = new Date(Date.now() - 3600_000).toISOString();
          const row = await env.DB.prepare(
            'SELECT COUNT(*) AS n FROM suggestions WHERE ip_hash = ? AND created_at > ?'
          ).bind(ipHash, since).first();
          if ((row?.n ?? 0) >= MAX_PER_IP_PER_HOUR) return json({ error: 'rate_limited' }, 429, origin);
        }

        // Store the photographs first: a suggestion row pointing at blobs that
        // failed to write would show broken images in the review queue.
        const keys = [];
        try {
          for (const file of files) {
            const key = `img/${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;
            await env.IMAGES.put(key, await file.arrayBuffer(), {
              metadata: { contentType: file.type },
            });
            keys.push(key);
          }
        } catch (err) {
          await dropImages(env, keys);
          console.error('image upload', err);
          return json({ error: 'image_store_failed' }, 502, origin);
        }

        try {
          await env.DB.prepare(
            `INSERT INTO suggestions (id, person_id, author, text, images, status, created_at, ip_hash)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
          ).bind(
            crypto.randomUUID(), personId, author, text,
            JSON.stringify(keys), new Date().toISOString(), ipHash
          ).run();
        } catch (err) {
          await dropImages(env, keys); // don't leave orphans behind
          throw err;
        }

        return json({ ok: true, images: keys.length }, 202, origin);
      }

      /* ── admin ── */
      if (url.pathname.startsWith('/api/admin/')) {
        if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, origin);

        if (url.pathname === '/api/admin/suggestions' && request.method === 'GET') {
          const status = url.searchParams.get('status') || 'pending';
          if (!['pending', 'approved', 'rejected', 'all'].includes(status)) {
            return json({ error: 'bad_status' }, 400, origin);
          }
          const query = status === 'all'
            ? env.DB.prepare(
                `SELECT id, person_id, author, text, images, status, created_at, reviewed_at
                   FROM suggestions ORDER BY created_at DESC LIMIT 500`)
            : env.DB.prepare(
                `SELECT id, person_id, author, text, images, status, created_at, reviewed_at
                   FROM suggestions WHERE status = ? ORDER BY created_at DESC LIMIT 500`).bind(status);
          const { results } = await query.all();
          return json({
            items: (results || []).map((r) => ({
              id: r.id, personId: r.person_id, author: r.author, text: r.text,
              images: parseImages(r.images),
              status: r.status, createdAt: r.created_at, reviewedAt: r.reviewed_at,
            })),
          }, 200, origin);
        }

        const match = /^\/api\/admin\/suggestions\/([\w-]+)$/.exec(url.pathname);
        if (match) {
          const id = match[1];

          if (request.method === 'DELETE') {
            const row = await env.DB.prepare('SELECT images FROM suggestions WHERE id = ?')
              .bind(id).first();
            const res = await env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();
            if (row) await dropImages(env, parseImages(row.images));
            return json({ ok: true, changed: res.meta?.changes ?? 0 }, 200, origin);
          }

          if (request.method === 'POST') {
            let body;
            try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }
            const next = { approve: 'approved', reject: 'rejected', unreview: 'pending' }[body.action];
            if (!next) return json({ error: 'bad_action' }, 400, origin);
            const res = await env.DB.prepare(
              'UPDATE suggestions SET status = ?, reviewed_at = ? WHERE id = ?'
            ).bind(next, new Date().toISOString(), id).run();
            if (!res.meta?.changes) return json({ error: 'not_found' }, 404, origin);
            return json({ ok: true, status: next }, 200, origin);
          }
        }
      }

      return json({ error: 'not_found' }, 404, origin);
    } catch (err) {
      // Never surface internals to a public endpoint.
      console.error('suggestions api', err);
      return json({ error: 'server_error' }, 500, origin);
    }
  },
};
