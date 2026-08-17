/**
 * notify.js — the "a suggestion is waiting" email.
 *
 * Built as real MIME so the photographs travel *with* the message rather than
 * as links that break the moment a suggestion is deleted, and so it renders in
 * clients that block remote images.
 *
 *   multipart/related
 *     ├── multipart/alternative
 *     │     ├── text/plain      (for clients that want it, and for search)
 *     │     └── text/html       (the designed version)
 *     └── image/…  × n          (referenced from the HTML by Content-ID)
 *
 * The person's name comes from the archive itself, imported below — never from
 * the submitter. Everything a stranger typed lands in the body, escaped; none
 * of it reaches a header, where a newline would let them inject their own.
 */

import { EmailMessage } from 'cloudflare:email';
import { PEOPLE, BRANCHES } from '../../data/family.js';

/** id → the person, so an email can say "Haxhi Ramazan Lutfulla", not "r2". */
const BY_ID = new Map(PEOPLE.map((p) => [p.id, p]));
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/* Attaching every photograph at full size would push the message past what mail
   servers accept, and base64 costs CPU. Attach the first few, link them all. */
const MAX_ATTACHED = 3;
const MAX_ATTACHED_BYTES = 2 * 1024 * 1024;

const COLOR = {
  bg: '#f3f2f2', surface: '#eae9e9', text: '#201f1d',
  gold: '#b68235', goldDark: '#7d5411', muted: '#605d5d', rule: '#d7d3d3',
};

/** UTF-8 safe base64, chunked so a long body cannot blow the call stack. */
function b64(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** base64 in 76-character lines, as RFC 2045 requires for message bodies. */
const wrap76 = (s) => s.replace(/(.{76})/g, '$1\r\n');

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** dd.mm.yyyy, hh:mm — written the way the family writes dates. */
function stamp(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** What we can say about the person, straight from the archive. */
function describe(personId) {
  const person = BY_ID.get(personId);
  if (!person) return { name: personId, detail: '', known: false };
  const bits = [];
  if (person.years) bits.push(person.years.replace(/†/g, '').trim());
  if (person.gen) bits.push(`Gjenerata ${ROMAN[person.gen] || person.gen}`);
  const branch = person.branch && person.branch !== 'ancestral'
    ? (BRANCHES[person.branch] || {}).label : '';
  if (branch) bits.push(branch);
  return { name: person.name, detail: bits.filter(Boolean).join(' · '), known: true };
}

function plainBody({ who, personId, author, text, images, when, site }) {
  return [
    'Një sugjerim i ri pret shqyrtim.',
    '',
    `Personi:     ${who.name}${who.detail ? ` (${who.detail})` : ''}`,
    `             ${site}/#/person/${personId}`,
    `Nga:         ${author || 'Anonim'}`,
    `Data:        ${when}`,
    `Fotografi:   ${images.length}`,
    '',
    '────────────────────────────────',
    text || '(pa tekst — vetëm fotografi)',
    '────────────────────────────────',
    '',
    ...(images.length ? ['Fotografitë:', ...images.map((i) => `  ${i.url}`), ''] : []),
    `Shqyrtoje këtu: ${site}/admin.html`,
    '',
    'Sugjerimi nuk shfaqet në faqe derisa ta miratosh.',
  ].join('\r\n');
}

function htmlBody({ who, personId, author, text, images, when, site }) {
  const row = (label, value) => `
      <tr>
        <td style="padding:7px 16px 7px 0;font:11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${COLOR.muted};white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:7px 0;font:15px/1.5 Georgia,'Times New Roman',serif;color:${COLOR.text}">${value}</td>
      </tr>`;

  // Attached photographs render from the message itself (cid:), so they show
  // even where remote images are blocked.
  const shots = images.map((img) => {
    const src = img.cid ? `cid:${img.cid}` : img.url;
    return `<a href="${esc(img.url)}" style="text-decoration:none"><img src="${src}" width="132" alt="Fotografi e bashkëngjitur" style="width:132px;height:132px;object-fit:cover;border:1px solid ${COLOR.rule};border-radius:3px;display:inline-block;margin:0 8px 8px 0"></a>`;
  }).join('');

  // The charset is declared here as well as in the MIME header: some clients
  // re-render the HTML on its own and lose the header, which turns every ë and
  // ç into mojibake.
  return `<!doctype html>
<html lang="sq">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sugjerim i ri</title></head>
<body style="margin:0;padding:0;background:${COLOR.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:28px 12px">
 <tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:${COLOR.bg};border:1px solid ${COLOR.rule};border-radius:4px">

   <tr><td style="padding:26px 32px 0;text-align:center">
     <div style="font:11px/1 Helvetica,Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${COLOR.goldDark}">Familja Luta</div>
     <div style="font:400 30px/1.2 Georgia,'Times New Roman',serif;color:${COLOR.text};margin-top:10px">Sugjerim i ri</div>
     <div style="font:13px/1.5 Georgia,'Times New Roman',serif;color:${COLOR.muted};margin-top:6px">pret shqyrtimin tënd</div>
     <div style="border-top:1px solid ${COLOR.rule};margin:22px 0 0"></div>
   </td></tr>

   <tr><td style="padding:22px 32px 0">
     <div style="font:11px/1 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.muted}">Për personin</div>
     <div style="font:400 24px/1.25 Georgia,'Times New Roman',serif;color:${COLOR.text};margin-top:7px">${esc(who.name)}</div>
     ${who.detail ? `<div style="font:13px/1.5 Georgia,'Times New Roman',serif;color:${COLOR.muted};margin-top:3px">${esc(who.detail)}</div>` : ''}
     <div style="margin-top:8px"><a href="${site}/#/person/${esc(personId)}" style="font:13px/1.5 Georgia,'Times New Roman',serif;color:${COLOR.goldDark}">Shiko në trung →</a></div>
   </td></tr>

   <tr><td style="padding:18px 32px 0">
     <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${COLOR.rule}">
       ${row('Nga', esc(author || 'Anonim'))}
       ${row('Data', esc(when))}
       ${row('Fotografi', String(images.length))}
     </table>
   </td></tr>

   <tr><td style="padding:18px 32px 0">
     <div style="font:11px/1 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.goldDark}">Sugjerimi</div>
     <div style="margin-top:9px;padding:14px 16px;background:${COLOR.surface};border-left:2px solid ${COLOR.gold};border-radius:2px;font:15px/1.7 Georgia,'Times New Roman',serif;color:${COLOR.text};white-space:pre-wrap">${esc(text) || '<span style="color:' + COLOR.muted + ';font-style:italic">(pa tekst — vetëm fotografi)</span>'}</div>
   </td></tr>

   ${images.length ? `<tr><td style="padding:20px 32px 0">
     <div style="font:11px/1 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLOR.muted};margin-bottom:10px">Fotografitë e dërguara</div>
     ${shots}
     <div style="font:11.5px/1.5 Georgia,'Times New Roman',serif;color:${COLOR.muted};margin-top:2px">Kliko një fotografi për ta parë në madhësi të plotë.</div>
   </td></tr>` : ''}

   <tr><td style="padding:24px 32px 6px" align="center">
     <a href="${site}/admin.html" style="display:inline-block;padding:12px 26px;border:1px solid ${COLOR.gold};border-radius:4px;font:600 14px/1 Georgia,'Times New Roman',serif;color:${COLOR.goldDark};text-decoration:none">Shqyrto sugjerimin</a>
   </td></tr>

   <tr><td style="padding:16px 32px 26px;text-align:center">
     <div style="border-top:1px solid ${COLOR.rule};padding-top:14px;font:11.5px/1.6 Georgia,'Times New Roman',serif;color:${COLOR.muted}">
       Sugjerimi nuk shfaqet në faqe derisa ta miratosh.<br>
       Miratimi e publikon shënimin — korrigjimet e arkivit bëhen në <span style="font-family:Menlo,Consolas,monospace">data/family.js</span>.
     </div>
   </td></tr>

  </table>
 </td></tr>
</table>
</body></html>`;
}

/**
 * Sends the notification.
 *
 * @param {object} env    Worker bindings — needs NOTIFY, NOTIFY_FROM, NOTIFY_TO
 * @param {object} params { personId, author, text, createdAt, images: [{key, type, bytes}] }
 */
export async function notify(env, { personId, author, text, createdAt, images = [] }) {
  if (!env.NOTIFY || !env.NOTIFY_FROM || !env.NOTIFY_TO) return;

  const site = env.SITE_URL || 'https://luta.family';
  const who = describe(personId);
  const when = stamp(createdAt);

  // Decide which photographs ride along in the message; the rest are linked.
  const api = env.API_URL || 'https://api.luta.family';
  let budget = MAX_ATTACHED_BYTES;
  const parts = images.map((img, i) => {
    const fits = i < MAX_ATTACHED && img.bytes && img.bytes.byteLength <= budget;
    if (fits) budget -= img.bytes.byteLength;
    return {
      url: `${api}/api/images/${img.key}`,
      type: img.type,
      bytes: fits ? img.bytes : null,
      cid: fits ? `photo${i}@luta.family` : null,
    };
  });

  const view = { who, personId, author, text, images: parts, when, site };
  const boundaryOuter = `rel-${crypto.randomUUID()}`;
  const boundaryAlt = `alt-${crypto.randomUUID()}`;

  const lines = [
    `From: Familja Luta <${env.NOTIFY_FROM}>`,
    `To: <${env.NOTIFY_TO}>`,
    `Subject: =?UTF-8?B?${b64(`Sugjerim i ri për ${who.name}`)}?=`,
    `Message-ID: <${crypto.randomUUID()}@luta.family>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${boundaryOuter}"`,
    '',
    `--${boundaryOuter}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    '',
    `--${boundaryAlt}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(plainBody(view))),
    `--${boundaryAlt}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64(htmlBody(view))),
    `--${boundaryAlt}--`,
    '',
  ];

  parts.forEach((part, i) => {
    if (!part.bytes) return;
    lines.push(
      `--${boundaryOuter}`,
      `Content-Type: ${part.type}`,
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${part.cid}>`,
      `Content-Disposition: inline; filename="fotografi-${i + 1}.${(part.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}"`,
      '',
      wrap76(b64(part.bytes)),
      ''
    );
  });

  lines.push(`--${boundaryOuter}--`, '');

  await env.NOTIFY.send(
    new EmailMessage(env.NOTIFY_FROM, env.NOTIFY_TO, lines.join('\r\n'))
  );
}
