/** Thamani salama kwa UI — epuka crash kutoka null/NaN/undefined. */

export function safeKpiValue(raw: unknown, fallback = "—"): string {
  if (raw == null) return fallback;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return fallback;
    return String(raw);
  }
  const s = String(raw).trim();
  return s || fallback;
}

export function safeHint(raw: unknown, fallback?: string): string | undefined {
  if (raw == null) return fallback;
  const s = String(raw).trim();
  return s || fallback;
}

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
