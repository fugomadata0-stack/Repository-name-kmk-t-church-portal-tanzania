import type { PostgrestError } from "@supabase/supabase-js";
import { isStorageBucketNotFoundError } from "./storageBucketProbe";

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
  if (isAbortLikeError(err) || isAbortLikeError(err.message)) {
    return context ? `[${context}] Ombi limesitishwa.` : "Ombi limesitishwa.";
  }
  const rawMsg = (err.message || "").toLowerCase();
  if (rawMsg.includes("no api key found")) {
    return context
      ? `[${context}] Ombi limeenda Supabase bila funguo ya API. Weka VITE_SUPABASE_ANON_KEY (.env.local / Vercel) na ujenzi upya.`
      : "Ombi limeenda Supabase bila funguo ya API. Weka VITE_SUPABASE_ANON_KEY (.env.local / Vercel) na ujenzi upya.";
  }
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
  if (isAbortLikeError(err) || isAbortLikeError(err.message)) return;
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

/** Ombi lilighairiwa (timeout ya mteja, navigation, au kubadilisha ukurasa) — si kosa la DB. */
function abortMessageOf(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? "");
  }
  return String(err);
}

export function isAbortLikeError(err: unknown): boolean {
  if (err == null) return false;
  const name =
    err instanceof Error
      ? err.name
      : typeof err === "object" && err !== null && "name" in err
        ? String((err as { name?: unknown }).name ?? "")
        : "";
  const msg = abortMessageOf(err).toLowerCase();
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    msg.includes("aborted") ||
    msg.includes("abort") ||
    msg.includes("signal is aborted") ||
    msg.includes("aborterror:")
  );
}

/**
 * Makosa kutoka `catch` (Error iliyotengenezwa na `formatPostgrestError`, Storage, n.k.).
 */
export function formatCaughtError(err: unknown): string {
  if (err == null) return "Kosa lisilojulikana.";
  if (typeof err === "string") {
    const low = err.toLowerCase();
    if (low.includes("no api key found")) {
      return "Ombi limeenda Supabase bila funguo ya API. Hakikisha VITE_SUPABASE_ANON_KEY imewekwa kwenye .env.local au Vercel (kisha build/deploy upya).";
    }
    if (isAbortLikeError(low)) {
      return "Ombi limesitishwa (mtandao polepole au muda umeisha). Jaribu tena.";
    }
    return err;
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("no api key found")) {
      return "Ombi limeenda Supabase bila funguo ya API. Hakikisha VITE_SUPABASE_ANON_KEY imewekwa kwenye .env.local au Vercel (kisha build/deploy upya).";
    }
    if (isAbortLikeError(err)) {
      return "Ombi limesitishwa (mtandao polepole au muda umeisha). Jaribu tena.";
    }
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

/** Kosa la Supabase Storage (si PostgREST) — maelezo kwa Kiswahili kwa makosa ya kawaida. */
export function formatStorageError(
  err: { message?: string; status?: string | number } | null | undefined,
  context = "site-assets"
): string {
  if (!err?.message) return `[${context}] Upakiaji umeshindwa — hakuna ujumbe kutoka seva.`;
  const m = err.message;
  const low = m.toLowerCase();
  if (low.includes("no api key found")) {
    return `[${context}] Funguo ya API haipo kwenye ombi. Sanidi VITE_SUPABASE_ANON_KEY na ujenzi upya.`;
  }
  if (low.includes("mime") || low.includes("invalid mime") || low.includes("content-type") || low.includes("content type")) {
    return `[${context}] Aina ya faili (MIME) hairuhusiwi kwenye bucket hii. Jaribu umbizo lingine au wasiliana na msimamizi (migrations za storage).`;
  }
  if (low.includes("payload too large") || low.includes("entity too large") || low.includes("file size") || low.includes("too large")) {
    return `[${context}] Faili ni kubwa mno kwa kikomo cha bucket. Jaribu faili ndogo au ongeza kikomo kwenye Supabase Storage.`;
  }
  if (low.includes("timeout") || low.includes("timed out")) {
    return `[${context}] Muda wa upakiaji umeisha. Jaribu tena na muunganisho bora.`;
  }
  if (low.includes("network") || low.includes("failed to fetch")) {
    return `[${context}] Hitilafu ya mtandao wakati wa upakiaji. Jaribu tena.`;
  }
  const parts: string[] = [`[${context}]`, m];
  if (isStorageBucketNotFoundError(err)) {
    parts.push("Hifadhi ya faili haijasanidiwa kwenye mradi — wasiliana na msimamizi (db:push:safe).");
  } else if (low.includes("bucket")) {
    parts.push("Angalia ruhusa za storage na mipangilio ya MIME/ukubwa kwa faili hili.");
  }
  if (low.includes("empty") && low.includes("body")) {
    parts.push("Seva ya Storage haikurudisha maelezo — jaribu tena au angalia muunganisho.");
  }
  if (low.includes("duplicate") || low.includes("already exists") || low.includes("resource already exists")) {
    parts.push("Faili lenye jina hilo tayari lipo — jaribu tena au futa la zamani.");
  }
  if (low.includes("jwt") || low.includes("policy") || low.includes("denied") || low.includes("forbidden") || low.includes("403")) {
    parts.push("Ruhusa imekataliwa (RLS au matrix ya moduli). Hakikisha una haki ya kuongeza/kuhariri kwenye moduli husika.");
  }
  if (low.includes("row-level security") || low.includes("rls")) {
    parts.push("Sera za RLS za Storage zimekataa ombi hili.");
  }
  return parts.join(" ");
}
