/** Thamani kutoka `<input type="number">` — hakuna `NaN` kwenye mazao. */

export function parseRequiredNumberInput(raw: string, whenEmpty = 0, whenInvalid = whenEmpty): number {
  if (raw === "") return whenEmpty;
  const n = Number(raw);
  return Number.isFinite(n) ? n : whenInvalid;
}

export function parseOptionalNumberInput(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
