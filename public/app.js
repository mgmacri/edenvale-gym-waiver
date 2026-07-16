(function () {
  const STORAGE_KEY = 'edenvale-waiver-signed';

  // Set after deploying google-apps-script/Code.gs as a Web App (see README.md).
  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxgpIjfbMf-YlkbwsQeEPZ_lLOjq9h3WFsbQtKVUobm0D_YK1aWCJ8NxCH-HztgvDPY/exec';
  // Must match the SHARED_SECRET script property set on the Apps Script project.
  const SHARED_SECRET = '3644de9ad9432fd93639e3d07ab7a148';

  function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  const formScreen = document.getElementById('form-screen');
  const alreadySignedScreen = document.getElementById('already-signed-screen');
  const confirmationScreen = document.getElementById('confirmation-screen');

  function showScreen(el) {
    [formScreen, alreadySignedScreen, confirmationScreen].forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  function getStoredSignature() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function storeSignature(id, signedAt) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, signedAt }));
    } catch (err) {
      // localStorage unavailable; not a security control, safe to ignore.
    }
  }

  const stored = getStoredSignature();
  if (stored) {
    document.getElementById('already-signed-date').textContent =
      'Signed on ' + new Date(stored.signedAt).toLocaleString();
    showScreen(alreadySignedScreen);
  }

  document.getElementById('sign-again-btn').addEventListener('click', () => {
    showScreen(formScreen);
  });

  // --- Form wiring ---

  const form = document.getElementById('waiver-form');
  const submitBtn = document.getElementById('submit-btn');
  const validationSummary = document.getElementById('validation-summary');

  const fullLegalNameInput = document.getElementById('full_legal_name');
  const fullLegalName2Input = document.getElementById('full_legal_name_2');
  const printedNameInput = document.getElementById('printed_name');
  const printedNameWarning = document.getElementById('printed-name-warning');

  fullLegalNameInput.addEventListener('input', () => {
    fullLegalName2Input.value = fullLegalNameInput.value;
    checkPrintedNameMatch();
    updateSubmitState();
  });

  function checkPrintedNameMatch() {
    const a = fullLegalNameInput.value.trim().toLowerCase();
    const b = printedNameInput.value.trim().toLowerCase();
    const mismatch = a && b && a !== b;
    printedNameWarning.classList.toggle('hidden', !mismatch);
    printedNameInput.classList.toggle('invalid', mismatch);
  }

  printedNameInput.addEventListener('input', () => {
    checkPrintedNameMatch();
    updateSubmitState();
  });

  const signaturePad = createSignaturePad(document.getElementById('signature-pad'));
  document.getElementById('clear-signature-btn').addEventListener('click', () => {
    signaturePad.clear();
    updateSubmitState();
  });
  document.getElementById('signature-pad').addEventListener('pointerup', updateSubmitState);

  const requiredFieldIds = [
    'full_legal_name',
    'initials_section1',
    'initials_section2',
    'date_of_birth',
    'residential_address',
    'phone_number',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'printed_name',
  ];

  requiredFieldIds.forEach((id) => {
    document.getElementById(id).addEventListener('input', updateSubmitState);
  });

  function isFormComplete() {
    const allRequiredFilled = requiredFieldIds.every(
      (id) => document.getElementById(id).value.trim().length > 0
    );
    const nameMatches =
      fullLegalNameInput.value.trim().toLowerCase() === printedNameInput.value.trim().toLowerCase();
    return allRequiredFilled && nameMatches && !signaturePad.isEmpty();
  }

  function updateSubmitState() {
    submitBtn.disabled = !isFormComplete();
  }

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    validationSummary.classList.add('hidden');

    if (!isFormComplete()) {
      validationSummary.textContent =
        'Please complete all required fields, ensure your printed name matches, and sign above before submitting.';
      validationSummary.classList.remove('hidden');
      return;
    }

    const record = {
      full_legal_name: fullLegalNameInput.value.trim(),
      date_of_birth: document.getElementById('date_of_birth').value,
      residential_address: document.getElementById('residential_address').value.trim(),
      phone_number: document.getElementById('phone_number').value.trim(),
      emergency_contact_name: document.getElementById('emergency_contact_name').value.trim(),
      emergency_contact_phone: document.getElementById('emergency_contact_phone').value.trim(),
      emergency_contact_relationship: document
        .getElementById('emergency_contact_relationship')
        .value.trim(),
      medical_conditions: document.getElementById('medical_conditions').value.trim() || null,
      initials_section1: document.getElementById('initials_section1').value.trim(),
      initials_section2: document.getElementById('initials_section2').value.trim(),
      orientation_conducted_by:
        document.getElementById('orientation_conducted_by').value.trim() || null,
      orientation_date: document.getElementById('orientation_date').value || null,
      printed_name: printedNameInput.value.trim(),
      signature_image: signaturePad.toDataURL(),
    };

    const errors = validateSubmission(record);
    if (errors.length > 0) {
      validationSummary.textContent = errors.join(', ');
      validationSummary.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const id = crypto.randomUUID();
      const signedAt = new Date().toISOString();
      const pdfBytes = await generateWaiverPdf(Object.assign({ id, signed_at: signedAt }, record));

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(
          Object.assign({ id, signedAt, pdfBase64: bytesToBase64(pdfBytes), sharedSecret: SHARED_SECRET }, record)
        ),
      });

      const data = await res.json();

      if (!data.ok) {
        validationSummary.textContent =
          (data.details && data.details.join(', ')) || data.error || 'Submission failed. Please try again.';
        validationSummary.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign and Submit Waiver';
        return;
      }

      storeSignature(data.id, data.signedAt);
      document.getElementById('confirmation-date').textContent =
        'Signed on ' + new Date(data.signedAt).toLocaleString();
      const pdfUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      document.getElementById('download-pdf-link').href = pdfUrl;
      document.getElementById('download-pdf-link').download = `edenvale-waiver-${data.id}.pdf`;
      showScreen(confirmationScreen);
    } catch (err) {
      validationSummary.textContent = 'Network error. Please check your connection and try again.';
      validationSummary.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign and Submit Waiver';
    }
  });

  updateSubmitState();
})();
