/** Plain-text + HTML body for Guest Card submission email (shared shape with client if needed). */

const { buildGuestCardSectionsPlain } = require('./guestCardDump');

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStructuredBody(data) {
  return buildGuestCardSectionsPlain(data);
}

function buildEmailMessage(data) {
  const who = (data.prospect || '').trim() || 'A prospect';
  const intro =
    `${who} — a new Guest Card tenant pre-screening submission has been received.\r\n` +
    'Kindly respond at your earliest convenience.\r\n\r\n';
  const structured = buildStructuredBody(data);
  const footer = '\r\n\r\n---\r\nProperty showing\r\nDeva Rentals';
  return intro + structured + footer;
}

function buildEmailMessageHtml(data) {
  const who = escapeHtml((data.prospect || '').trim() || 'A prospect');
  const intro = `<p style="margin:0 0 12px;font-family:system-ui,Segoe UI,sans-serif;font-size:14px;line-height:1.5">${who} — a new Guest Card tenant pre-screening submission has been received.<br>Kindly respond at your earliest convenience.</p>`;
  const structured = escapeHtml(buildStructuredBody(data)).replace(/\r\n/g, '<br>\n').replace(/\n/g, '<br>\n');
  const block = `<div style="font-family:ui-monospace,Consolas,monospace;font-size:13px;line-height:1.45;color:#111;border-left:3px solid #1e3a5f;padding-left:12px">${structured}</div>`;
  const footer = `<p style="margin-top:16px;font-family:system-ui,Segoe UI,sans-serif;font-size:13px;color:#333"><strong>Property showing</strong><br>Deva Rentals</p>`;
  return intro + block + footer;
}

module.exports = { buildEmailMessage, buildEmailMessageHtml };
