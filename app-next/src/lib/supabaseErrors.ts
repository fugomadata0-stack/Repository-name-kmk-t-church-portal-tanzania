import type { PostgrestError } from "@supabase/supabase-js";

/** Ramani ya nambari za kawaida za Postgres / PostgREST kwa maelezo kwa Kiswahili */
const CODE_HINTS: Record<string, string> = {
  PGRST116: "Hakuna rekodi inayolingana (au zaidi ya moja kwa swali la single).",
  "23505": "Rekodi taiari ipo — thuluthi ya duplikesi (mfano code ya dayosisi).",
  "23503": "Ukiukaji wa foreign key — rekodi inayotegemewa haipo.",
  "42501": "Ruhusa imekataliwa (angalia RLS na funguo ya API).",
  "42P01": "Jedwali halipo — endesha migrations kwenye Supabase.",
  "42703": "Safu (column) haipo — schema ya DB na code havijaoana.",
};

/**
 * Ujumbe mmoja unaosomeka kwa watumiaji, pamoja na maelezo ya kiufundi wakati wa maendeleo.
 */
export function formatPostgrestError(err: PostgrestError | null | undefined, context?: string): string {
  if (!err) return context ? `${context}: kosa lisilojulikana` : "Kosa lisilojulikana kutoka Supabase.";
  const hint = CODE_HINTS[err.code ?? ""] ?? "";
  const parts: string[] = [];
  if (context) parts.push(`[${context}]`);
  parts.push(err.message || "Hitilafu ya mtandao wa data");
  if (hint) parts.push(hint);
  if (err.details && import.meta.env.DEV) parts.push(`Maelezo: ${err.details}`);
  if (err.hint && import.meta.env.DEV) parts.push(`Pendekezo: ${err.hint}`);
  return parts.join(" ");
}

export function isMissingTableError(err: PostgrestError | null | undefined): boolean {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  return code === "42P01" || msg.includes("does not exist") || msg.includes("schema cache");
}

export function isMissingColumnError(err: PostgrestError | null | undefined): boolean {
  const code = err?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  return code === "42703" || msg.includes("column") || msg.includes("schema cache");
}

export function logSupabaseQueryError(
  err: PostgrestError | null | undefined,
  meta: { table?: string; action?: string; context?: string; queryPurpose?: string }
): void {
  if (!err) return;
  const message = formatPostgrestError(err, meta.context);
  const payload = {
    table: meta.table ?? "unknown_table",
    action: meta.action ?? "unknown_action",
    purpose: meta.queryPurpose ?? "unknown_purpose",
    code: err.code ?? "unknown_code",
    details: err.details ?? null,
    hint: err.hint ?? null,
    message: err.message ?? "",
  };
  console.warn(`[supabase-query-error] ${message}`, payload);
}

/**
 * Makosa kutoka `catch` (Error iliyotengenezwa na `formatPostgrestError`, Storage, n.k.).
 */
export function formatCaughtError(err: unknown): string {
  if (err == null) return "Kosa lisilojulikana.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) {
      return "Hitilafu ya mtandao. Angalia muunganisho wako na ujaribu tena.";
    }
    if (m.includes("load failed") || m.includes("fetch")) {
      return "Hitilafu ya muunganisho. Jaribu tena baada ya muda mfupi.";
    }
    return err.message;
  }
  const s = String(err);
  if (/network|fetch/i.test(s)) return "Hitilafu ya mtandao. Jaribu tena.";
  return s;
}

/** Kosa la Supabase Storage (si PostgREST) */
export function formatStorageError(err: { message?: string } | null | undefined, context = "site-assets"): string {
  if (!err?.message) return `[${context}] Upakiaji umeshindwa.`;
  const m = err.message;
  const low = m.toLowerCase();
  const parts: string[] = [`[${context}]`, m];
  if (low.includes("bucket") || low.includes("not found")) {
    parts.push("Hakikisha bucket ipo na sera za Storage zimeruhusu maombi haya.");
  }
  if (low.includes("duplicate") || low.includes("already exists")) {
    parts.push("Jaribu faili lenye jina tofauti au futa kwanza faili lenye njia sawa.");
  }
  if (low.includes("jwt") || low.includes("policy") || low.includes("denied")) {
    parts.push("Angalia RLS / sera za Storage na funguo ya anon.");
  }
  return parts.join(" ");
}
