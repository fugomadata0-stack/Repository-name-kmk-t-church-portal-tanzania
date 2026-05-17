/** Hesabu ya fedha (TZS) — epuka floating drift kwa senti. */

export function parseMoneyTz(raw: unknown): number {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (s === "") return NaN;
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100;
}

export function formatMoneyTz(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("sw-TZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Fedha kwa UI — "—" ikiwa thamani haipo (si 0 bandia). */
export function formatMoneyTzOrDash(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatMoneyTz(n);
}
