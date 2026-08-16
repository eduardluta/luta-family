/**
 * Familja Luta — suggestions API.
 *
 * A Cloudflare Worker in front of a D1 table. GitHub Pages cannot run server
 * code, so the static site lives there and this handles the one thing that
 * needs a server: taking corrections from the family and holding them until an
 * admin approves them.
 *
 * Nothing here is load-bearing. If this Worker is down, deleted, or never
 * deployed, the site still renders the entire archive — the suggestion form
 * just falls back to an email link.
 *
 * Public
 *   GET  /api/suggestions              approved suggestions, for the site
 *   POST /api/suggestions              submit one; always lands as `pending`
 *
 * Admin — all require `Authorization: Bearer <ADMIN_TOKEN>`
 *   GET   /api/admin/suggestions?status=pending
 *   POST  /api/admin/suggestions/:id   { "action": "approve" | "reject" }
 *   DELETE /api/admin/suggestions/:id
 */

const MAX_TEXT = 2000;
const MAX_AUTHOR = 80;
const MAX_PER_IP_PER_HOUR = 8;
const PERSON_ID = /^[a-z0-9_-]{1,40}$/i;

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

/** Only the configured site may call this; `*` is the fallback when unset. */
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (!env.DB) return json({ error: 'not_configured' }, 503, origin);

    try {
      /* ── public read ── */
      if (url.pathname === '/api/suggestions' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, person_id, author, text, created_at
             FROM suggestions WHERE status = 'approved'
            ORDER BY created_at ASC`
        ).all();
        return new Response(
          JSON.stringify({
            items: (results || []).map((r) => ({
              id: r.id, personId: r.person_id, author: r.author, text: r.text, createdAt: r.created_at,
            })),
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json; charset=utf-8',
              // Approved suggestions change rarely; let the edge absorb the load.
              'cache-control': 'public, max-age=60, stale-while-revalidate=600',
              ...cors(origin),
            },
          }
        );
      }

      /* ── public write ── */
      if (url.pathname === '/api/suggestions' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }

        // Honeypot: a real person never sees this field, bots fill everything.
        // Answer 202 rather than an error so the bot learns nothing.
        if (body.website) return json({ ok: true }, 202, origin);

        const personId = String(body.personId || '').trim();
        const text = String(body.text || '').trim().slice(0, MAX_TEXT);
        const author = String(body.author || '').trim().slice(0, MAX_AUTHOR);

        if (!PERSON_ID.test(personId)) return json({ error: 'bad_person' }, 400, origin);
        if (text.length < 2) return json({ error: 'empty_text' }, 400, origin);

        const ipHash = await hashIp(request, env);
        if (ipHash) {
          const since = new Date(Date.now() - 3600_000).toISOString();
          const row = await env.DB.prepare(
            'SELECT COUNT(*) AS n FROM suggestions WHERE ip_hash = ? AND created_at > ?'
          ).bind(ipHash, since).first();
          if ((row?.n ?? 0) >= MAX_PER_IP_PER_HOUR) return json({ error: 'rate_limited' }, 429, origin);
        }

        await env.DB.prepare(
          `INSERT INTO suggestions (id, person_id, author, text, status, created_at, ip_hash)
           VALUES (?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(crypto.randomUUID(), personId, author, text, new Date().toISOString(), ipHash).run();

        return json({ ok: true }, 202, origin);
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
                `SELECT id, person_id, author, text, status, created_at, reviewed_at
                   FROM suggestions ORDER BY created_at DESC LIMIT 500`)
            : env.DB.prepare(
                `SELECT id, person_id, author, text, status, created_at, reviewed_at
                   FROM suggestions WHERE status = ? ORDER BY created_at DESC LIMIT 500`).bind(status);
          const { results } = await query.all();
          return json({
            items: (results || []).map((r) => ({
              id: r.id, personId: r.person_id, author: r.author, text: r.text,
              status: r.status, createdAt: r.created_at, reviewedAt: r.reviewed_at,
            })),
          }, 200, origin);
        }

        const match = /^\/api\/admin\/suggestions\/([\w-]+)$/.exec(url.pathname);
        if (match) {
          const id = match[1];

          if (request.method === 'DELETE') {
            const res = await env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();
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
