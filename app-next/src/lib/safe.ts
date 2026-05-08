/**
 * Vifaa vya data salama — ULTRA STABILITY (KMT Church Portal).
 * Tumia badala ya .toLowerCase() moja kwa moja kwenye thamani zinazoweza kuwa null/undefined.
 */

export function safeString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return String(value);
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isFinite(t) ? value.toISOString() : "";
  }
  return String(value);
}

export function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

/**
 * Tarehe ya kuonyesha (ISO yyyy-mm-dd). Rejesha "-" ikiwa thamani si tarehe halali.
 */
export function safeDate(value: unknown): string {
  const raw = safeString(value).trim();
  if (!raw) return "-";
  const isoPrefix = raw.length >= 10 ? raw.slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) {
    const t = Date.parse(`${isoPrefix}T12:00:00`);
    if (Number.isFinite(t) && !Number.isNaN(new Date(t).getTime())) return isoPrefix;
  }
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return "-";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

/**
 * Awali ya ISO 10 herufi kwa hesabu za kalenda — null ikiwa si halali.
 */
export function safeIsoDatePrefix10(value: unknown): string | null {
  const raw = safeString(value).trim();
  if (raw.length < 10) return null;
  const prefix = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prefix)) return null;
  const t = Date.parse(`${prefix}T12:00:00`);
  return Number.isFinite(t) && !Number.isNaN(new Date(t).getTime()) ? prefix : null;
}

/**
 * Utafutaji salama: hauanguki kwa null; tafuta tupu = onyesha yote (true).
 */
export function safeIncludes(field: unknown, query: unknown): boolean {
  const q = safeLower(query).trim();
  if (!q) return true;
  return safeLower(field).includes(q);
}

export function safeArray<T>(data: readonly T[] | T[] | null | undefined): T[] {
  if (data == null) return [];
  return Array.isArray(data) ? [...data] : [];
}

/** Muda wa Unix ms au null ikiwa si halali */
export function safeParseTime(value: unknown): number | null {
  const raw = safeString(value).trim();
  if (!raw) return null;
  const t = Date.parse(raw.length === 10 && !raw.includes("T") ? `${raw}T12:00:00` : raw);
  return Number.isFinite(t) ? t : null;
}

/** Tarehe + saa kwa mtumiaji; "-" ikiwa batili */
export function safeFormatDateTime(value: unknown, locale = "sw-TZ"): string {
  const t = safeParseTime(value);
  if (t == null) return "-";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "-";
  try {
    return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}
