# Edenvale Community Gym — Waiver Signing App

A mobile-first web app that lets residents read and digitally sign the Edenvale Community
Gym liability waiver from their phone (e.g. after scanning a QR code posted at the gym). It
captures a signature and emergency contact/medical details, renders a signed PDF entirely in
the browser, and delivers that PDF to the gym (Google Drive + email) via a small Google Apps
Script endpoint. There is no server to run or maintain — the whole thing is a static site.

> **⚠️ Legal/process TODO — do not launch without resolving this.**
> The paper waiver process contemplated an in-person witness signature. This app is
> self-serve (signed alone on a phone), so there is no witness present at signing. The UI
> and PDF both note this explicitly ("No witness is required to complete this form
> electronically...") and the data model keeps optional `witness_name` /
> `witness_signature_image` fields for a staffed front-desk scenario, but **submission is
> not blocked on a witness**. This deviation from the original paper process, and the
> waiver text in general, still needs sign-off from a lawyer and the gym committee before
> this goes live. See the `[TODO: legal]` markers in `public/pdf-generator.js` and
> `public/index.html`.

## Tech stack

- **Frontend:** plain HTML/CSS/vanilla JS, no build step (`public/`) — hosted as a static
  site on GitHub Pages
- **PDF generation:** [`pdf-lib`](https://pdf-lib.js.org/), vendored into
  `public/vendor/pdf-lib.min.js` and run **client-side in the browser** — renders the full
  waiver text, all submitted fields, and the signature image into a PDF at submit time
- **Signature capture:** a small dependency-free canvas signature pad
  (`public/signature-pad.js`) using Pointer Events
- **Delivery/persistence:** a [Google Apps Script](https://developers.google.com/apps-script)
  Web App (`google-apps-script/Code.gs`) that receives the finished PDF, saves it to a Drive
  folder, and emails a copy — this is the only "backend," and it runs under your own Google
  account for free

## Project layout

```
edenvale-gym-waver/
├── edenvale-logo.png          # gym logo — used as favicon, form header, PDF header
├── public/                    # the entire deployed static site
│   ├── index.html             # the waiver form (single scrollable page, sectioned into cards)
│   ├── app.js                 # form validation, signature wiring, PDF generation + submit flow
│   ├── validate.js            # client-side submission validation (mirrors Code.gs's checks)
│   ├── pdf-generator.js        # browser port of the pdf-lib waiver renderer
│   ├── signature-pad.js       # canvas signature capture
│   ├── styles.css
│   └── vendor/
│       └── pdf-lib.min.js     # vendored pdf-lib browser build
├── google-apps-script/
│   └── Code.gs                # Apps Script Web App: validate → save to Drive → email
└── .github/workflows/deploy-pages.yml   # publishes public/ to GitHub Pages on push
```

## How it works

1. A participant scans a QR code pointing at the deployed GitHub Pages URL and fills out the
   form on their phone. The whole waiver is shown as one scrollable page, grouped into cards
   per numbered section, matching the source waiver text exactly.
2. Required fields, initials, and the signature are validated client-side (submit stays
   disabled until complete), then re-validated in `public/validate.js` right before
   submission, and **again** server-side in `google-apps-script/Code.gs` — the Apps Script
   is the actual trust boundary since anyone can call it directly.
3. On submit, the browser:
   - generates the signed PDF entirely client-side with `pdf-lib` (`public/pdf-generator.js`),
   - POSTs the form fields + base64 PDF + a shared-secret token to the Apps Script Web App,
   - keeps the PDF bytes in memory for the "Save a copy" download link (no server round-trip).
4. The Apps Script saves the PDF into a "Edenvale Waivers" Drive folder (created automatically
   on first run) and emails a copy to the configured notification address.
5. The browser remembers (via `localStorage`, not a security control) that this device has
   signed, and will show a "You've already signed ✅" screen on repeat visits — with an
   option to sign again if details changed.

## One-time setup: the Apps Script endpoint

The static site alone can't save or email anything — you need to deploy the small Apps
Script once, under your own Google account:

1. Go to [script.google.com](https://script.google.com), create a new project, and paste in
   the contents of `google-apps-script/Code.gs`.
2. Project Settings (gear icon) → Script Properties → add `SHARED_SECRET` with the same
   value as the `SHARED_SECRET` constant in `public/app.js` (a random token is pre-filled
   there; change it in both places if you want a different one).
3. Deploy → New deployment → type **Web app** → Execute as **Me**, Who has access
   **Anyone**. Copy the resulting `/exec` URL.
4. Paste that URL into `APPS_SCRIPT_URL` at the top of `public/app.js`, commit, and push.
5. To browse past waivers, just open the "Edenvale Waivers" folder in your Google Drive —
   there is no admin panel anymore.

Redeploying `Code.gs` after edits requires **Deploy → Manage deployments → Edit → New
version** (a plain save does not update the live `/exec` endpoint).

## Local development / verification

Serve `public/` with any static file server, e.g.:

```bash
npx serve public
# or
python3 -m http.server --directory public 8080
```

Then open the page, fill out the form, sign, and submit. Without a deployed Apps Script URL
the submission will fail at the network step — you can still verify PDF generation alone by
checking the browser console/Network tab, or by temporarily pointing `APPS_SCRIPT_URL` at a
deployed test instance.

## Hosting: GitHub Pages

`.github/workflows/deploy-pages.yml` publishes `public/` to GitHub Pages on every push to
`main` using `actions/upload-pages-artifact` + `actions/deploy-pages`. Enable Pages once in
the repo's Settings → Pages → Source → "GitHub Actions".

## Non-goals (by design)

- No payment processing or membership management beyond this waiver
- No native app — this is a web page reached via QR code, and works in mobile
  Safari/Chrome without installation
- No strong anti-spam on the Apps Script endpoint beyond a shared-secret token baked into
  the client JS — it's visible in page source, so treat it as a speed bump against casual
  abuse, not real access control. Fine for a low-traffic gym waiver form; revisit if that
  changes.
