/**
 * config.js — the only file you edit to point the site at its API.
 *
 * The site is static and hosted on GitHub Pages, which cannot run server code.
 * Suggestions therefore go to a small Worker on its own subdomain (see api/).
 *
 * Leave API_BASE as an empty string and the whole suggestion feature switches
 * itself off cleanly: no failed requests, no error messages, and the form is
 * replaced by an email link. The archive itself never depends on it.
 */

export const API_BASE = '';

/** Where a suggestion goes when there is no API — and the fallback if one fails. */
export const CONTACT_EMAIL = 'eduard@dua.com';

/** Shown in the page footer and used for share links. */
export const SITE_URL = 'https://eduardluta.github.io/luta-family/';
