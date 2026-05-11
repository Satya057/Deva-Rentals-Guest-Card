/**
 * Guest Card – Node server
 *
 * Email (Gmail App Password – SMTP, NOT OAuth):
 *   GMAIL_USER            Account used for SMTP login + From address (needs App Password)
 *   GMAIL_APP_PASSWORD    16-character app password (Google Account → Security → App passwords)
 *   MAIL_TO               optional; who receives form emails (e.g. showings inbox). Defaults to GMAIL_USER.
 *
 * Calendar (App Password does NOT work here – Calendar needs OAuth):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   Optional: GCAL_CREATE_SECRET – if set, client must send header x-gcal-secret (see public/script.js CALENDAR_API.gcalSecret)
 *   Optional: CALENDAR_TIME_ZONE – IANA zone (e.g. America/Edmonton). If set, overrides browser; else client sends zone.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const { buildEmailMessage, buildEmailMessageHtml } = require('./lib/formEmail');
const { buildGuestCardCalendarDescription } = require('./lib/guestCardDump');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '512kb' }));

function normalizeAppPassword(raw) {
  if (!raw) return '';
  return String(raw).replace(/\s/g, '');
}

async function handleCreateCalendarEvent(req, res) {
  const serverSecret = process.env.GCAL_CREATE_SECRET;
  if (serverSecret) {
    const sent = req.headers['x-gcal-secret'];
    if (sent !== serverSecret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    res.status(503).json({
      error: 'Calendar API not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN to .env',
      missingEnv: missing
    });
    return;
  }

  const body = req.body || {};
  const { summary, location, startDateTime, endDateTime, timeZone, formData, description } = body;
  const tz = String(process.env.CALENDAR_TIME_ZONE || timeZone || 'UTC').trim();
  const dtRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  if (!summary || !startDateTime || !endDateTime) {
    res.status(400).json({
      error: 'Missing summary, startDateTime, or endDateTime (local wall time, e.g. 2026-05-14T06:04:00).'
    });
    return;
  }

  const startStr = String(startDateTime).trim().slice(0, 19);
  const endStr = String(endDateTime).trim().slice(0, 19);
  if (!dtRe.test(startStr) || !dtRe.test(endStr)) {
    res.status(400).json({ error: 'Invalid startDateTime or endDateTime format.' });
    return;
  }

  try {
    const tokenParams = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    });

    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });
    const td = await tr.json();
    if (!tr.ok || !td.access_token) {
      res.status(502).json({
        error: 'Could not refresh Google access token.',
        detail: td.error_description || td.error || String(tr.status)
      });
      return;
    }

    let descriptionText = '';
    if (formData && typeof formData === 'object') {
      descriptionText = buildGuestCardCalendarDescription(formData);
    } else if (description) {
      descriptionText = String(description);
    }

    const eventBody = {
      summary: String(summary).slice(0, 1024),
      start: { dateTime: startStr, timeZone: tz },
      end: { dateTime: endStr, timeZone: tz }
    };
    if (descriptionText) eventBody.description = descriptionText.slice(0, 8000);
    if (location) eventBody.location = String(location).slice(0, 1024);

    const er = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${td.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventBody)
    });
    const ed = await er.json();
    if (!er.ok) {
      res.status(502).json({
        error: 'Google Calendar could not create the event.',
        detail: ed.error?.message || ed.error || String(er.status)
      });
      return;
    }

    res.status(200).json({
      ok: true,
      htmlLink: ed.htmlLink || null,
      id: ed.id || null
    });
  } catch (e) {
    console.error('create-event:', e);
    res.status(500).json({ error: e.message || 'Server error' });
  }
}

app.post('/api/submit-form', async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Expected JSON object with form fields.' });
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = normalizeAppPassword(process.env.GMAIL_APP_PASSWORD);
  const mailTo = process.env.MAIL_TO || user;

  if (!user || !pass) {
    res.status(503).json({
      error: 'Set GMAIL_USER and GMAIL_APP_PASSWORD in .env (Gmail → App password).'
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass }
    });

    const text = buildEmailMessage(data);
    const innerHtml = buildEmailMessageHtml(data);
    const subject =
      (data.propertyAddress || '').trim() !== ''
        ? `Guest Card: Tenant Pre-Screening Call Sheet – Deva Rentals — ${(data.propertyAddress || '').trim()}`
        : 'Guest Card: Tenant Pre-Screening Call Sheet – Deva Rentals';

    const mailToNorm = String(mailTo).trim().toLowerCase();
    const userNorm = String(user).trim().toLowerCase();
    /** When sending to another inbox, BCC the SMTP account so you always get a copy (Spam still check). */
    const bcc =
      mailToNorm !== userNorm && process.env.MAIL_BCC_SUPPRESS !== '1' ? user : undefined;

    const info = await transporter.sendMail({
      from: `"Guest Card – Deva Rentals" <${user}>`,
      to: mailTo,
      bcc,
      replyTo: data.email || undefined,
      subject,
      text,
      html: innerHtml
    });

    console.log('submit-form: email accepted by Gmail', {
      to: mailTo,
      bcc: bcc || '(none)',
      messageId: info.messageId
    });

    res.json({
      ok: true,
      sentTo: mailTo,
      bccTo: bcc || undefined,
      messageId: info.messageId || undefined
    });
  } catch (e) {
    console.error('submit-form:', e);
    res.status(500).json({
      error: 'Failed to send email.',
      detail: e.message || String(e)
    });
  }
});

app.post('/api/create-event', handleCreateCalendarEvent);

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
      const base = path.basename(filePath);
      if (base === 'index.html' || base === 'script.js') {
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
      }
    }
  })
);

const server = app.listen(PORT, () => {
  console.log(`Guest Card server running at http://localhost:${PORT}`);
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Close the other terminal (npm start), or set PORT=3001 in .env and retry.`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
