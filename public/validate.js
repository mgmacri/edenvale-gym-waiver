(function (global) {
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
    witness_name: 200,
  };

  function validateSubmission(body) {
    const errors = [];

    for (const field of REQUIRED_STRING_FIELDS) {
      const value = body[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`${field} is required`);
      }
    }

    for (const [field, max] of Object.entries(MAX_LENGTHS)) {
      const value = body[field];
      if (typeof value === 'string' && value.length > max) {
        errors.push(`${field} exceeds maximum length of ${max}`);
      }
    }

    if (
      typeof body.signature_image !== 'string' ||
      !body.signature_image.startsWith('data:image/png;base64,')
    ) {
      errors.push('signature_image is required and must be a PNG data URL');
    }

    if (
      typeof body.full_legal_name === 'string' &&
      typeof body.printed_name === 'string' &&
      body.full_legal_name.trim().toLowerCase() !== body.printed_name.trim().toLowerCase()
    ) {
      errors.push('printed_name must match full_legal_name');
    }

    if (
      body.witness_signature_image &&
      typeof body.witness_signature_image === 'string' &&
      !body.witness_signature_image.startsWith('data:image/png;base64,')
    ) {
      errors.push('witness_signature_image must be a PNG data URL if provided');
    }

    return errors;
  }

  global.validateSubmission = validateSubmission;
})(window);
