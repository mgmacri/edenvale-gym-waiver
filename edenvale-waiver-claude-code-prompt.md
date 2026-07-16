# Prompt for Claude Code — Edenvale Community Gym Waiver Signing App

Paste everything below into Claude Code as your initial prompt.

---

## Goal

Build a mobile-first web app for the Edenvale Community Gym that lets residents read and
digitally sign the liability waiver from their phone after scanning a QR code posted at the
gym. It must capture a legally meaningful e-signature, store submissions securely, and
produce a signed PDF record for the gym's files.

## Tech stack (default — adjust if you have a different preference)

- **Frontend:** Single-page app, plain HTML/CSS/vanilla JS (no framework needed — keep it
  simple and fast-loading on mobile data). If you'd rather use a lightweight framework
  (e.g. SvelteKit or a minimal Next.js app) because it makes the PDF/signature/backend
  wiring cleaner, that's fine — just keep the dependency footprint small.
- **Backend:** Node.js + Express, with SQLite (via `better-sqlite3`) for storage. No cloud
  database needed — this is a small community facility with a small user base.
- **PDF generation:** `pdf-lib` to render the completed, signed waiver (all typed fields,
  initials, and the signature image) into a PDF that matches the source waiver text
  below, saved server-side per submission.
- **Signature capture:** HTML canvas signature pad (roll your own with pointer events, or
  use a small dependency-free canvas signature library) — capture as a PNG data URL,
  store the image in the PDF and as a file/blob alongside the DB record.
- **Deployment target:** assume this will run on a small VPS or similar that I control;
  don't build in a dependency on a specific cloud provider. Include a `README.md` with
  setup and run instructions.

## Assets

- The gym's official logo is provided as `edenvale-logo.png` (sunburst + weightlifter
  design, "Edenvale Community Gym" wordmark). Place it in the project and use it:
  - At the top of the signing form (header, reasonably sized, centered)
  - As the favicon
  - In the header of the generated PDF

## Data model

Store one record per submission with these fields (map directly to the waiver's Section 9
plus the signature/initials/consent artifacts):

- `id` (uuid)
- `full_legal_name`
- `date_of_birth`
- `residential_address`
- `phone_number`
- `emergency_contact_name`
- `emergency_contact_phone`
- `emergency_contact_relationship`
- `medical_conditions` (optional, nullable text)
- `initials_section1` (text — risks acknowledgment)
- `initials_section2` (text — waiver/release acknowledgment)
- `orientation_conducted_by` (text, optional — may be filled in later by an admin rather
  than the participant; see Admin view below)
- `orientation_date` (date, optional, same note)
- `signature_image` (PNG blob/data URL of the canvas signature)
- `witness_name` (optional — see note below)
- `witness_signature_image` (optional — see note below)
- `signed_at` (timestamp, server-generated, not user-editable)
- `ip_address` (captured server-side for the record)
- `pdf_path` (path to the generated signed PDF)

**Note on witness field:** a self-serve phone form has no human witness present. Don't
block submission on a witness signature. Instead: keep the witness fields in the schema
and PDF template as optional, and add a short note in the UI: "No witness is required to
complete this form electronically. Your signature, timestamp, and device information are
recorded as part of this submission." Flag this as a decision for the gym committee to
confirm is acceptable, since the paper version contemplated a witness — don't silently
drop the requirement without flagging it.

## The waiver text (reproduce exactly, do not paraphrase or reorder)

Use this exact text for all headings and body copy. Where the source document has a
blank line/underscore field, render an actual form input instead:

```
Edenvale Community Gym
Assumption of Risk, Waiver of Liability, and Release Agreement

This Agreement is entered into between the undersigned participant name: [TEXT INPUT]
("the Participant") and the Edenvale Community Gym ("the Gym"), a facility operated by
Edenvale community members, located on the property municipally known as 4330 Bradner Rd,
Abbotsford, British Columbia.

Please read this entire Agreement carefully. It affects your legal rights, including your
right to sue. Do not sign until you have read it in full and had the opportunity to ask
questions or seek independent legal advice.

1. Acknowledgment of Risks
I acknowledge that participation in fitness activities at the Gym, and my presence on the
Property to access the Gym, involves inherent risks. These risks include, without
limitation:
- Muscle strains, sprains, fractures, dislocations, or other physical injury
- Overexertion, fatigue, cardiovascular events, or aggravation of a pre-existing medical
  condition
- Injury from the use, misuse, or malfunction of fitness equipment
- Injury caused by, or arising from interaction with, other users of the Gym
I understand these risks exist regardless of the care taken by myself, Edenvale, or
others, and I voluntarily assume all such risks associated with my use of the Gym and my
presence on the Property in order to access it.
Initial here to confirm you have read and understood this section: [INITIALS INPUT]
(risks of the Gym)

2. Waiver of Liability and Release
In consideration of being permitted to use the Gym, I, on behalf of myself and my heirs,
executors, and next of kin, hereby:
- Waive any and all claims that I may have, now or in the future, against Edenvale, the
  owner(s) of the Property, and their respective directors, officers, employees, agents,
  volunteers, contractors, and fellow residents (collectively, the "Released Parties"),
  arising out of my use of the Gym or presence on the Property;
- Release and forever discharge the Released Parties from liability for personal injury,
  illness, death, or property damage arising from my use of the Gym or the Property,
  including where caused by the ordinary negligence of a Released Party; and
- Agree not to bring or pursue legal action against any Released Party in connection with
  my use of the Gym or the Property, to the fullest extent permitted by law.
Limitation on this release: Nothing in this Agreement waives, excludes, or limits
liability for gross negligence, wilful misconduct, or any other liability that cannot
lawfully be excluded by agreement under the laws of British Columbia, including under the
Occupiers Liability Act. This Agreement is intended to be enforced only to the maximum
extent permitted by law, and if any part of it is found unenforceable, the remainder
continues to apply.
Initial here to confirm you have read and understood this section: [INITIALS INPUT]
(waiver and release, including the limits on what can be waived)

3. Use at Your Own Risk — No Supervision
I understand and agree that:
- The Gym is a resident-managed, volunteer-run facility with no professional trainers,
  supervisors, first-aid attendants, or medical personnel present
- I am solely responsible for determining whether I am physically fit to use the Gym and
  its equipment on any given occasion
- I use all equipment and facilities entirely at my own risk

4. Orientation Acknowledgment
I confirm that I have:
- Completed the mandatory Gym orientation session
- Been shown the proper use of all equipment
- Been informed of the buddy-system requirement for heavy equipment (power rack, heavy
  free weights, barbell — a second person must be present)
- Reviewed and understood the posted Gym rules
- Been shown the cleaning and hygiene protocols
Orientation conducted by: [TEXT INPUT, optional]
Date: [DATE INPUT, optional]

5. Agreement to Follow Rules
I agree to:
- Follow all posted Gym rules at all times
- Wipe down equipment after each use
- Honour the booking system and cleaning rotation schedule
- Use the buddy system when using heavy equipment
- Report any equipment damage, hazards, or safety concerns immediately to [designated
  contact/role — fill in before launch]
- Not bring guests into the Gym
- Not permit minors (under 18) to use the Gym

6. Medical Fitness Self-Declaration
I declare that:
- I am in adequate physical condition to participate in exercise and fitness activities
- I do not have any medical condition that would make exercise dangerous for me, or I
  have consulted a medical professional and have been cleared to exercise
- I take full responsibility for monitoring my own physical condition during exercise and
  will stop and seek help if I feel unwell

7. No Guests / No Minors
I understand that no guests are permitted to use the Gym at any time, and no minors
(under 18) are permitted to use the Gym under any circumstances. I will not allow or
facilitate access for any unauthorized person.

8. Personal Information
The information collected in Section 9 below is collected solely to enable Edenvale to
respond appropriately in a medical emergency and to administer Gym membership. It will be
kept confidential, stored securely, accessible only to [Board/designated coordinator —
fill in before launch], and retained only for as long as I remain a Gym member, in
accordance with British Columbia's Personal Information Protection Act.

9. Emergency Contact and Medical Information
Participant full legal name: [TEXT INPUT]
Date of birth: [DATE INPUT]
Residential address at Edenvale: [TEXT INPUT]
Phone number: [TEXT INPUT]
Emergency contact name: [TEXT INPUT]
Emergency contact phone number: [TEXT INPUT]
Emergency contact relationship to participant: [TEXT INPUT]
Known medical conditions or allergies (optional — for use by emergency responders only):
[TEXTAREA, optional]

10. General Terms
Governing law: This Agreement is governed by the laws of British Columbia and the laws of
Canada applicable in British Columbia.
Severability: If any provision of this Agreement is found invalid or unenforceable, the
remaining provisions remain in full force and effect.
Entire agreement: This Agreement, together with the posted Gym rules, is the entire
agreement between the Participant and Edenvale regarding use of the Gym, and supersedes
any prior discussions or representations.
Independent legal advice: I confirm I have had a reasonable opportunity to read this
Agreement in advance of signing and to seek independent legal advice regarding its
contents, and that I sign it voluntarily.

11. Acknowledgment and Signature
I have read this Agreement in its entirety, including Sections 1 and 2 above. I
understand its contents and I sign it voluntarily and without any time pressure. I
understand that by signing, I am giving up substantial legal rights, including the right
to sue the Released Parties for ordinary negligence.
Printed name: [TEXT INPUT — should default to / validate against the participant name
entered above]
Signature: [SIGNATURE CANVAS]
Date: [auto-filled, read-only, server timestamp]
```

## UX / flow requirements

1. **Landing/header:** logo, gym name, one-line explanation ("Please complete this waiver
   before your first visit to the gym"). Estimated completion time (~3–5 min).
2. **Single scrollable form**, not a multi-step wizard — this is a legal document and
   people should see the whole thing in context, not have sections hidden from them.
   However, group it visually into cards per numbered section for readability on a phone.
3. Every checkbox/initials/signature field must be **required** before submit is enabled.
   The "Printed name" in Section 11 must match (or at least not conflict with) the
   participant name entered at the top — validate and gently prompt if they differ.
4. Disable pinch-zoom issues: use proper responsive typography (min 16px body text to
   avoid iOS auto-zoom on input focus).
5. Signature pad: full-width, clear "Clear signature" button, touch/pointer support,
   visible border so people know where to sign.
6. On submit: show a clear **confirmation screen** — "✅ Waiver signed — you're all set to
   use the Edenvale Community Gym" with the signed date, and a note that a copy isn't
   emailed automatically (or is, if you want to add that — see optional features below).
7. If someone scans the QR code and has *already* signed on that device, use a
   `localStorage` flag to skip straight to a "You've already signed ✅, signed on
   [date]" screen with an option to "Sign again / update my info" — this isn't a security
   control, just a UX nicety for the "have you signed yet?" flow.

## Backend / storage requirements

- POST endpoint that validates all required fields server-side (don't trust client-side
  validation alone), writes the record to SQLite, generates the PDF via `pdf-lib`, and
  saves the PDF to disk (e.g. `/data/signed-waivers/{id}.pdf`).
- Serve the generated PDF back to the confirmation page as a downloadable "Save a copy for
  your records" link.
- Basic rate limiting / duplicate-submission protection (e.g. simple in-memory throttle by
  IP) since this is a public-facing form reachable via QR code.
- All data at rest should be on a private disk path, not publicly served — no public
  directory listing of `/data`.

## Admin view (simple, password-protected)

Build a minimal `/admin` route, protected by a single shared password stored in an
environment variable (`ADMIN_PASSWORD`), showing:
- A table of all signed waivers (name, signed date, expandable to see full details)
- A link to download each signed PDF
- A search box by name

Keep this genuinely simple — no need for user accounts or roles, just a gate so the
personal/medical data isn't publicly browsable.

## Non-goals

- No payment processing, no membership management beyond this waiver, no email/SMS
  notifications unless you want to add a "email me a copy" optional field (nice-to-have,
  not required).
- Don't build a native app — this is a web page reached via QR code, must work well in
  mobile Safari/Chrome without installation.

## Deliverables

1. Working app (frontend + backend) runnable locally with clear `npm install && npm run
   dev` instructions in `README.md`.
2. A short section in the README on how to deploy it (assume a small VPS with Node
   installed; a systemd service file or PM2 config is a nice touch).
3. Confirm the generated PDF visually matches the waiver text above before calling this
   done — render a sample submission to PDF and check it.

## Important legal/process note (don't skip this)

This waiver has been reviewed in draft form but **still requires final sign-off from a
lawyer and the gym committee**, particularly the "no witness signature" deviation from the
original paper process noted above. Please leave a visible TODO/comment in the code and
flag it back to me if the witness-signature question isn't something I've explicitly
resolved before you wire up the final launch.
