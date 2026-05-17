import { SUPABASE_QUERY_ERROR_SW } from "../supabaseUiMessages";

const TECHNICAL_PATTERNS =
  /postgrest|pgrst|jwt|row-level security|rls|42p01|42703|schema cache|permission denied|42501|failed to fetch|networkerror|typeerror:|syntaxerror:| at /i;

/** Ujumbe salama kwa UI — si stack trace wala maelezo ya kiufundi. */
export function userFacingQueryError(raw: string | null | undefined): string {
  const t = String(raw ?? "").trim();
  if (!t || /^undefined$|^null$|^nan$/i.test(t)) return SUPABASE_QUERY_ERROR_SW;
  if (t.length > 180 || TECHNICAL_PATTERNS.test(t)) return SUPABASE_QUERY_ERROR_SW;
  return t;
}
