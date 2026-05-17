/** Thamani salama kwa UI — epuka crash na maonyesho ya undefined/null/NaN. */

export const DISPLAY_DASH = "—";

export function safeKpiValue(raw: unknown, fallback = DISPLAY_DASH): string {
  if (raw == null) return fallback;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return fallback;
    return String(raw);
  }
  const s = String(raw).trim();
  if (!s || s === "undefined" || s === "null" || s === "NaN") return fallback;
  return s;
}

export function safeHint(raw: unknown, fallback?: string): string | undefined {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  if (!s || s === "undefined" || s === "null" || s === "NaN") return fallback;
  return s;
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function safeFiniteNumber(raw: unknown, fallback = 0): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : fallback;
  if (typeof raw === "string") {
    const n = Number(raw.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Hesabu kwa kuonyesha — "—" ikiwa haijapatikana (si 0 bandia). */
export function safeLocaleCount(raw: unknown, locale = "sw-TZ"): string {
  if (raw == null) return DISPLAY_DASH;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return DISPLAY_DASH;
  return n.toLocaleString(locale);
}

export function safePercentLabel(raw: number | null | undefined): string {
  if (raw == null || !Number.isFinite(raw)) return DISPLAY_DASH;
  return `${raw >= 0 ? "+" : ""}${raw.toFixed(1)}%`;
}

/** Maandishi ya kuonyesha kwa mtumiaji — si kamba tupu wala undefined. */
export function safeDisplayText(raw: unknown, fallback = DISPLAY_DASH): string {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  if (!s || /^undefined$|^null$|^nan$/i.test(s)) return fallback;
  return s;
}
