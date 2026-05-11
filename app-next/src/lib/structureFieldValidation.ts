/**
 * Uthibitisho unaounganishwa kwa Sajili Muundo — simu za kimataifa, URL salama, njia za storage.
 */

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Ondoa nafasi na alama za kawaida; acha + mwanzoni pekee. */
export function normalizePhoneDigits(input: string): string {
  let s = input.trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  return s;
}

/** Thamani ya DB ya simu — umbizo moja la kimataifa. */
export function normalizePhoneStored(raw: string | null | undefined): string | null {
  const n = normalizePhoneDigits(String(raw ?? ""));
  return n.length ? n : null;
}

/** Simu ya kimataifa: tarakimu 9–15 baada ya kuondoa alama (hiari ikiwa tupu). */
export function isValidInternationalPhone(input: string): boolean {
  const n = normalizePhoneDigits(input);
  if (!n.length) return true;
  return /^\+?[0-9]{9,15}$/.test(n);
}

export function assertValidEmailOptional(raw: string | undefined, labelSw: string): void {
  const t = raw?.trim();
  if (!t) return;
  if (!EMAIL_RE.test(t)) throw new Error(`${labelSw} si sahihi.`);
}

/** HTTP/HTTPS tu — zuia javascript:, data:, file:, n.k. */
export function normalizeOptionalHttpsUrl(raw: string | undefined, labelSw: string): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  let u: URL;
  try {
    const candidate = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    u = new URL(candidate);
  } catch {
    throw new Error(`${labelSw} si kiungo halali.`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`${labelSw} lazima iwe http au https.`);
  }
  return u.href;
}

/** URL ya hiari (http/https) kwa logo/picha — au tupu. */
export function normalizeOptionalImageOrDocUrl(raw: string | undefined, labelSw: string): string | undefined {
  return normalizeOptionalHttpsUrl(raw, labelSw);
}

/** Hati ya uteuzi: URL kamili (http/https) au njia ya ndani ya storage. */
export function normalizeAppointmentDocumentStored(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return normalizeOptionalHttpsUrl(t, "Hati ya uteuzi") ?? null;
  return t;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Njia ya ndani ya bucket structure-leaders: {entity_id}/uteuzi/... — hakuna .. */
export function assertValidLeaderAppointmentStoragePath(path: string, entityId: string): void {
  const p = path.trim();
  if (!p) return;
  if (p.includes("..") || p.startsWith("/") || /[\r\n\0]/.test(p)) {
    throw new Error("Njia ya faili si sahihi.");
  }
  const first = p.split("/")[0] ?? "";
  if (!UUID_RE.test(first) || first.toLowerCase() !== entityId.trim().toLowerCase()) {
    throw new Error("Faili lazima ihusiane na kitengo hiki.");
  }
  if (!p.toLowerCase().includes("/uteuzi/")) {
    throw new Error("Njia ya hati lazima iwe chini ya folda ya uteuzi.");
  }
}

/** Mihula: mwisho lazima asiwe kabla ya mwanzo (ikiwa zote mbili zipo). */
export function assertTermOrder(termStart: string | null | undefined, termEnd: string | null | undefined): void {
  const a = termStart?.trim().slice(0, 10);
  const b = termEnd?.trim().slice(0, 10);
  if (!a || !b) return;
  if (b < a) throw new Error("Tarehe ya mwisho ya muda haiwezi kuwa kabla ya mwanzo.");
}

/** GPS — maandishi ya hiari (lat,lng au maelezo); kuzuia herufi za udhibiti tu. */
export function assertValidGpsOptional(raw: string | undefined): void {
  const t = raw?.trim();
  if (!t) return;
  if (t.length > 160) throw new Error("GPS: maandishi ni marefu sana.");
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c < 32 && c !== 9) throw new Error("GPS si sahihi.");
  }
}
