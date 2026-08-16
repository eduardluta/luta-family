-- Familja Luta — suggestion queue.
--
-- Apply with:
--   npx wrangler d1 execute luta-family --remote --file=./schema.sql
--
-- Safe to re-run: every statement is IF NOT EXISTS, and the ALTER at the bottom
-- is wrapped so an existing database picks up the images column without losing
-- anything.
--
-- Nothing here is the archive. The archive is data/family.js in the repo; this
-- table only holds proposals until an admin folds the good ones into that file.
-- If this database is ever lost, the site is unaffected.

CREATE TABLE IF NOT EXISTS suggestions (
  id          TEXT PRIMARY KEY,
  person_id   TEXT NOT NULL,
  author      TEXT NOT NULL DEFAULT '',
  text        TEXT NOT NULL,
  -- JSON array of KV keys for attached photographs, e.g. ["img/ab12.jpg"]
  images      TEXT NOT NULL DEFAULT '[]',
  -- pending → approved (shows on the site) | rejected (kept, not shown)
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TEXT NOT NULL,
  reviewed_at TEXT,
  -- Salted hash, never a raw address: enough to rate-limit a flood, not enough
  -- to identify a relative who sent a correction.
  ip_hash     TEXT NOT NULL DEFAULT ''
);

-- The public read: approved suggestions, newest last.
CREATE INDEX IF NOT EXISTS idx_suggestions_public
  ON suggestions (status, person_id, created_at);

-- The moderation queue.
CREATE INDEX IF NOT EXISTS idx_suggestions_review
  ON suggestions (status, created_at DESC);

-- Rate limiting reads this.
CREATE INDEX IF NOT EXISTS idx_suggestions_ip
  ON suggestions (ip_hash, created_at);
