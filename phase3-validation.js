export function validateEntity(payload, schema) {
  const errors = [];
  const fields = schema?.fields || [];
  fields.forEach((field) => {
    const value = payload[field.key];
    if (field.required && (!value || String(value).trim().length < 1)) {
      errors.push(`${field.label} inahitajika.`);
    }
  });
  if (payload.name && String(payload.name).trim().length < 3) {
    errors.push("Jina linatakiwa kuwa angalau herufi 3.");
  }
  if (payload.region && String(payload.region).trim().length < 2) {
    errors.push("Region/Mahali inapaswa kuwa sahihi.");
  }
  if (payload.status && !["active", "inactive"].includes(payload.status)) {
    errors.push("Status lazima iwe active au inactive.");
  }
  return { valid: errors.length === 0, errors };
}
