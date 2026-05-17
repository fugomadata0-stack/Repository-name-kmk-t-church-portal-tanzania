/** Diagnostics kwa kuhifadhi wasifu wa uongozi — DEV au VITE_LEADERSHIP_SAVE_DEBUG=1 */
const ENABLED =
  import.meta.env.DEV || String(import.meta.env.VITE_LEADERSHIP_SAVE_DEBUG ?? "").trim() === "1";

export function logLeadershipProfileSaveDebug(
  phase: string,
  detail: Record<string, unknown>,
): void {
  if (!ENABLED) return;
  console.warn(`LEADERSHIP PROFILE SAVE DEBUG — ${phase}`, detail);
}

export function logSupabaseLeadershipSaveError(
  table: string,
  error: { message?: string; details?: string; hint?: string; code?: string },
  finalPayload: Record<string, unknown>,
): void {
  console.error("SUPABASE LEADERSHIP SAVE ERROR:", {
    table,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    finalPayload,
  });
}

export function cleanPayload<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
