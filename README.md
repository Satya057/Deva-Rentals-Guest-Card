# Guest Card – Deva Rentals (Node)

Express server serves the form from `public/` and sends submissions with **Nodemailer + Gmail App Password** (no EmailJS).

## Run locally

1. Copy `.env.example` to `.env` and fill in values.
2. `npm install`
3. `npm start` — open [http://localhost:3000](http://localhost:3000)

## Deploy on Vercel

1. Have the project on GitHub (e.g. [Deva-Rentals-Guest-Card](https://github.com/Satya057/Deva-Rentals-Guest-Card)).
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → **Import** your repo.
3. **Framework / preset** — leave auto-detect or choose **Other**. **Root directory** = `.` (repo root).
4. **Build** — defaults are fine. Vercel uses root `server.js` with `module.exports = app` as one serverless function for `/api/*` (no extra `vercel.json` needed).
5. **Environment Variables** — in the project **Settings → Environment Variables**, add the same keys as `.env.example` (copy real values from your local `.env`):
   - `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
   - `CALENDAR_TIME_ZONE` (e.g. `America/Edmonton`)
   - Optional: `MAIL_BCC_SUPPRESS`, `GCAL_CREATE_SECRET`
6. Click **Deploy**, then open the production URL and test the form.

**Static files:** Files under `public/` are served from the **Vercel CDN**. On production, `express.static` in `server.js` is not used for those assets ([Vercel + Express](https://vercel.com/guides/using-express-with-vercel)); your `index.html` / CSS / JS paths stay the same.

**CLI:** `npm i -g vercel` then `vercel` / `vercel dev` for preview or local serverless-style runs.

Never commit `.env`; keep secrets only in Vercel env vars.

## Gmail App Password (form email)

1. Google Account → **Security** → enable **2-Step Verification**.
2. **App passwords** → create one for “Mail” / “Other”.
3. In `.env`: `GMAIL_USER=rentalsdeva@gmail.com` and `GMAIL_APP_PASSWORD=` (the 16-character password; spaces optional).

`MAIL_TO` is where submissions are delivered (e.g. `showings.devarentals@gmail.com`). If unset, mail goes to `GMAIL_USER`.

For **Canada / Edmonton** showings, set `CALENDAR_TIME_ZONE=America/Edmonton` in `.env` so the date and time you pick match Alberta local time in Google Calendar (overrides the browser’s timezone).

When `MAIL_TO` is not the same as `GMAIL_USER`, the server **BCCs** `GMAIL_USER` so a copy lands in the sending account too (check Spam). Set `MAIL_BCC_SUPPRESS=1` to turn that off.

**App passwords only work for SMTP (sending mail).** They do **not** work for the Google Calendar API.

## Google Calendar button (optional)

One-click calendar still needs **OAuth** refresh token in `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. See comments in `server.js`.

## Project layout

- `server.js` — Express app, `/api/submit-form`, `/api/create-event`
- `lib/formEmail.js` — email body text/HTML
- `public/` — `index.html`, `styles.css`, `script.js`
