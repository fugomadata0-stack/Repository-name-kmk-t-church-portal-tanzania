const EMAIL_KEYS = ["email", "barua", "mail"];
const LONG_TEXT_KEYS = ["description", "maelezo", "notes", "comment", "details"];
const PASS_KEYS = ["password", "nenosiri"];
const PHONE_KEYS = ["phone", "simu", "mobile", "tel"];

export function isEmailField(fieldName = "") {
  const key = String(fieldName || "").toLowerCase();
  return EMAIL_KEYS.some((item) => key.includes(item));
}

function isLongTextField(fieldName = "") {
  const key = String(fieldName || "").toLowerCase();
  return LONG_TEXT_KEYS.some((item) => key.includes(item));
}

function isPasswordField(fieldName = "") {
  const key = String(fieldName || "").toLowerCase();
  return PASS_KEYS.some((item) => key.includes(item));
}

function isPhoneField(fieldName = "") {
  const key = String(fieldName || "").toLowerCase();
  return PHONE_KEYS.some((item) => key.includes(item));
}

export function autoUppercaseInput(value) {
  if (value === null || value === undefined) return value;
  return String(value).toUpperCase();
}

export function normalizeInputByType(fieldName, value, options = {}) {
  const { forceUppercase = false, preserveCase = false, allowTextareaSentenceCase = true } = options;
  if (value === null || value === undefined) return value;

  const text = String(value);
  if (preserveCase) return text;
  if (isEmailField(fieldName)) return text.toLowerCase();
  if (isPasswordField(fieldName) || isPhoneField(fieldName)) return text;
  if (allowTextareaSentenceCase && isLongTextField(fieldName)) return text;
  if (forceUppercase) return autoUppercaseInput(text);

  return autoUppercaseInput(text);
}

export function normalizePayloadByFieldMap(payload = {}, fieldOptions = {}) {
  return Object.entries(payload).reduce((acc, [key, value]) => {
    const cfg = fieldOptions[key] || {};
    acc[key] = normalizeInputByType(key, value, cfg);
    return acc;
  }, {});
}
