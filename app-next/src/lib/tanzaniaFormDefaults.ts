/** Thamani chaguomsingi za fomu za KMK(T) — Tanzania. */

export const TZ_COUNTRY = "Tanzania";
export const TZ_NATIONALITY = "Tanzanian";
export const TZ_CURRENCY_CODE = "TZS";
export const TZ_CURRENCY_LABEL = "Shilingi ya Tanzania (TZS)";
export const TZ_PHONE_PREFIX = "+255";
export const TZ_LOCALE = "sw-TZ";

export const TZ_CURRENCY_OPTIONS = [
  { value: "TZS", label: TZ_CURRENCY_LABEL },
  { value: "USD", label: "Dola ya Marekani (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
] as const;

export function normalizeTzPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("255")) return `+${d}`;
  if (d.startsWith("0")) return `+255${d.slice(1)}`;
  if (d.length === 9) return `+255${d}`;
  return raw.trim();
}
