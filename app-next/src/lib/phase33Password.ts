const PASSWORD_SPECIAL_RE = /[@#$!]/;

export interface PasswordStrengthResult {
  valid: boolean;
  checks: {
    length: boolean;
    firstUpper: boolean;
    hasLower: boolean;
    hasSpecial: boolean;
    fourDigits: boolean;
  };
  errors: string[];
  digitCount: number;
}

export function analyzePasswordStrength(p: string): PasswordStrengthResult {
  const s = String(p || "");
  const digitCount = (s.match(/\d/g) || []).length;
  const checks = {
    length: s.length >= 8,
    firstUpper: /^[A-Z]/.test(s),
    hasLower: /[a-z]/.test(s),
    hasSpecial: PASSWORD_SPECIAL_RE.test(s),
    fourDigits: digitCount >= 4,
  };
  const errors: string[] = [];
  if (!checks.length) errors.push("Urefu wa chini ni herufi 8.");
  if (!checks.firstUpper) errors.push("Herufi ya kwanza lazima iwe kubwa (A–Z).");
  if (!checks.hasLower) errors.push("Lazima kuwe na herufi ndogo.");
  if (!checks.hasSpecial) errors.push("Lazima kuwe na angalau herufi maalum moja katika: @ # $ !");
  if (!checks.fourDigits) errors.push("Lazima kuwe na angalau nambari nne (4).");
  return {
    valid: Object.values(checks).every(Boolean),
    checks,
    errors,
    digitCount,
  };
}

export function validatePassword(p: string): boolean {
  return analyzePasswordStrength(p).valid;
}

export function validatePhone(phone: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(String(phone || "").replace(/\s+/g, ""));
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}
