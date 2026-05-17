/** Mahesabu ya kiotomatiki kwa wasifu wa uongozi. */

export function computeAgeFromBirthDate(dateOfBirth: string | null | undefined): number | null {
  const raw = String(dateOfBirth ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function computeYearsBetween(
  startIso: string | null | undefined,
  endIso?: string | null,
): number | null {
  const start = String(startIso ?? "").trim();
  if (!start) return null;
  const d0 = new Date(start);
  if (Number.isNaN(d0.getTime())) return null;
  const end = endIso?.trim() ? new Date(endIso) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - d0.getTime();
  if (diff < 0) return null;
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

export function formatIsoDateInput(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
