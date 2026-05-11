# Guest Card – Deva Rentals (Node)

Express server serves the form from `public/` and sends submissions with **Nodemailer + Gmail App Password** (no EmailJS).

## Run locally

1. Copy `env.example` to `.env` and fill in values.
2. `npm install`
3. `npm start` — open [http://localhost:3000](http://localhost:3000)

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
