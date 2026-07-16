/**
 * Edenvale Gym Waiver — submission receiver.
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone). Then:
 *   1. Project Settings > Script Properties > add SHARED_SECRET
 *      (must match the token hardcoded in public/app.js).
 *   2. Copy the deployment's /exec URL into APPS_SCRIPT_URL in public/app.js.
 *
 * On each submission this: validates the payload, saves the signed PDF into
 * a Drive folder (created on first run if it doesn't exist), and emails a
 * copy to NOTIFY_EMAIL.
 */

const FOLDER_NAME = 'Edenvale Waivers';
const NOTIFY_EMAIL = 'mattmacri89@gmail.com';

const REQUIRED_STRING_FIELDS = [
  'full_legal_name',
  'date_of_birth',
  'residential_address',
  'phone_number',
  'emergency_contact_name',
  'emergency_contact_phone',
  'emergency_contact_relationship',
  'initials_section1',
  'initials_section2',
  'printed_name',
];

const MAX_LENGTHS = {
  full_legal_name: 200,
  date_of_birth: 40,
  residential_address: 400,
  phone_number: 40,
  emergency_contact_name: 200,
  emergency_contact_phone: 40,
  emergency_contact_relationship: 120,
  medical_conditions: 2000,
  initials_section1: 20,
  initials_section2: 20,
  orientation_conducted_by: 200,
  orientation_date: 40,
  printed_name: 200,
};

function validateSubmission(body) {
  const errors = [];

  REQUIRED_STRING_FIELDS.forEach((field) => {
    const value = body[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(field + ' is required');
    }
  });

  Object.keys(MAX_LENGTHS).forEach((field) => {
    const value = body[field];
    const max = MAX_LENGTHS[field];
    if (typeof value === 'string' && value.length > max) {
      errors.push(field + ' exceeds maximum length of ' + max);
    }
  });

  if (
    typeof body.full_legal_name === 'string' &&
    typeof body.printed_name === 'string' &&
    body.full_legal_name.trim().toLowerCase() !== body.printed_name.trim().toLowerCase()
  ) {
    errors.push('printed_name must match full_legal_name');
  }

  if (typeof body.pdfBase64 !== 'string' || body.pdfBase64.length === 0) {
    errors.push('pdfBase64 is required');
  }

  return errors;
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const sharedSecret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    const body = JSON.parse(e.postData.contents);

    if (!sharedSecret || body.sharedSecret !== sharedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }

    const errors = validateSubmission(body);
    if (errors.length > 0) {
      return jsonResponse({ ok: false, error: 'Validation failed', details: errors });
    }

    const id = Utilities.getUuid();
    const signedAt = new Date().toISOString();
    const fileName = 'edenvale-waiver-' + id + '.pdf';
    const pdfBytes = Utilities.base64Decode(body.pdfBase64);
    const blob = Utilities.newBlob(pdfBytes, 'application/pdf', fileName);

    const folder = getOrCreateFolder(FOLDER_NAME);
    folder.createFile(blob);

    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: 'Signed waiver: ' + body.full_legal_name,
      body:
        'A new Edenvale Gym waiver was signed by ' +
        body.full_legal_name +
        ' at ' +
        signedAt +
        '.\n\nThe PDF is attached and has also been saved to the "' +
        FOLDER_NAME +
        '" Drive folder.',
      attachments: [blob],
    });

    return jsonResponse({ ok: true, id: id, signedAt: signedAt });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
