import { validateEmail } from "../services/masterSettingsService";
import type { NationalLeadershipProfileRow } from "../services/nationalLeadershipService";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_BIO_CHARS = 12;

export type NationalLeadershipValidationResult = {
  ok: boolean;
  errors: string[];
  missing: string[];
};

function hasHttpUrl(v: string): boolean {
  const t = v.trim();
  return t.length > 8 && /^https?:\/\//i.test(t);
}

/** Angalia ikiwa wasifu una taarifa za kutosha kwa kuhifadhi rasmi. */
export function assessNationalLeadershipProfile(row: NationalLeadershipProfileRow): NationalLeadershipValidationResult {
  const errors: string[] = [];
  const missing: string[] = [];

  if (!row.full_name.trim()) {
    missing.push("full_name");
    errors.push("Jina la kiongozi linahitajika.");
  }
  if (!row.biography.trim() || row.biography.trim().length < MIN_BIO_CHARS) {
    missing.push("biography");
    errors.push("Tafadhali jaza wasifu (angalau herufi 12).");
  }
  if (!hasHttpUrl(row.profile_photo_url)) {
    missing.push("profile_photo_url");
    errors.push("Picha ya kiongozi inahitajika — pakia kwanza.");
  }
  if (!hasHttpUrl(row.signature_url)) {
    missing.push("signature_url");
    errors.push("Signature inahitajika — pakia kwanza.");
  }
  if (!row.phone.trim() && !row.whatsapp.trim()) {
    missing.push("phone");
    errors.push("Simu au WhatsApp inahitajika.");
  }

  const em = row.email.trim();
  if (em && !validateEmail(em)) errors.push("Barua pepe ya kiongozi si sahihi.");
  if (row.start_date && !DATE_RE.test(row.start_date)) errors.push("Tarehe ya kuanza: tumia umbizo YYYY-MM-DD au acha tupu.");
  if (row.end_date && !DATE_RE.test(row.end_date)) errors.push("Tarehe ya mwisho: tumia umbizo YYYY-MM-DD au acha tupu.");
  if (row.start_date && row.end_date && row.start_date > row.end_date) {
    errors.push("Tarehe ya mwisho haiwezi kuwa kabla ya tarehe ya kuanza.");
  }

  return { ok: errors.length === 0, errors, missing };
}

/** Lazima kuhifadhi — tupa kosa ikiwa si kamili. */
export function assertNationalLeadershipSavable(row: NationalLeadershipProfileRow): void {
  const v = assessNationalLeadershipProfile(row);
  if (!v.ok) throw new Error(v.errors[0] ?? "Taarifa za wasifu hazijakamilika.");
}

export function isNationalLeadershipProfileComplete(row: NationalLeadershipProfileRow): boolean {
  return assessNationalLeadershipProfile(row).ok;
}
