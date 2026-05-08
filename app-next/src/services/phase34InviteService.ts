import type { PostgrestError } from "@supabase/supabase-js";
import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { sha256HexUtf8 } from "../lib/cryptoSha256";
import { getSupabase } from "../lib/supabaseClient";

export type Phase34InviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type Phase34ScopeLevel = "national" | "diocese" | "jimbo" | "tawi";

export interface Phase34InviteRow {
  id: string;
  email: string;
  role_key: string;
  scope_type: string | null;
  scope_id: string | null;
  message: string | null;
  status: Phase34InviteStatus;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by: string | null;
  accepted_by: string | null;
  created_by: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const LIST_COLUMNS =
  "id,email,role_key,scope_type,scope_id,message,status,expires_at,accepted_at,revoked_at,invited_by,accepted_by,created_by,meta,created_at,updated_at";

function client() {
  return getSupabase();
}

function randomRawToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "").slice(0, 16)
  );
}

export async function fetchPhase34Invites(): Promise<Phase34InviteRow[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.from("phase34_invites").select(LIST_COLUMNS).order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error as PostgrestError)) return [];
    throw new Error(formatPostgrestError(error as PostgrestError, "phase34_invites"));
  }
  return (data ?? []) as Phase34InviteRow[];
}

export interface CreatePhase34InviteResult {
  row: Phase34InviteRow;
  /** Token halisi — onyesho mara moja (hakuna kwenye DB) */
  rawTokenOnce: string;
}

/**
 * Mfumo wa awali: hifadhi mwaliko + token_hash (hakuna token kwenye DB).
 * Kwa tuma barua — tumia `sendInviteEmail` (Phase 35 Edge).
 */
export async function createPhase34Invite(payload: {
  email: string;
  role_key: string;
  scope_level: Phase34ScopeLevel;
  dayosisi_scope?: string;
  jimbo_scope?: string;
  tawi_scope?: string;
  message?: string;
  expiresInDays?: number;
}): Promise<CreatePhase34InviteResult> {
  const sb = client();
  if (!sb) throw new Error("Supabase haijasanidiwa.");
  const rawTokenOnce = randomRawToken();
  const token_hash = await sha256HexUtf8(rawTokenOnce);
  const days = payload.expiresInDays ?? 14;
  const expires = new Date(Date.now() + days * 86400000).toISOString();

  const scope_id =
    payload.scope_level === "national"
      ? "{}"
      : JSON.stringify({
          dayosisi: payload.dayosisi_scope ?? "",
          jimbo: payload.jimbo_scope ?? "",
          tawi: payload.tawi_scope ?? "",
        });

  const rowInsert = {
    email: payload.email.trim().toLowerCase(),
    role_key: payload.role_key,
    scope_type: payload.scope_level,
    scope_id,
    message: payload.message?.trim() ?? null,
    token_hash,
    status: "pending" as const,
    expires_at: expires,
    meta: { source: "phase34-client-legacy" },
  };

  const { data, error } = await sb.from("phase34_invites").insert(rowInsert).select(LIST_COLUMNS).single();
  if (error) {
    if (isMissingTableError(error as PostgrestError)) {
      throw new Error("Jedwali phase34_invites halipo — endesha migrations (Phase 34/35).");
    }
    throw new Error(formatPostgrestError(error as PostgrestError, "phase34_invites.insert"));
  }
  return { row: data as Phase34InviteRow, rawTokenOnce };
}

export async function revokePhase34Invite(id: string): Promise<void> {
  const sb = client();
  if (!sb) throw new Error("Supabase haijasanidiwa.");
  const { error } = await sb
    .from("phase34_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(formatPostgrestError(error as PostgrestError, "phase34_invites.revoke"));
}

export async function markInviteResendMeta(id: string): Promise<void> {
  const sb = client();
  if (!sb) return;
  const { data: cur, error: r1 } = await sb.from("phase34_invites").select("meta").eq("id", id).single();
  if (r1) return;
  const meta = (cur?.meta && typeof cur.meta === "object" ? cur.meta : {}) as Record<string, unknown>;
  meta.last_resend_at = new Date().toISOString();
  meta.resend_count = Number(meta.resend_count ?? 0) + 1;
  const { error } = await sb.from("phase34_invites").update({ meta, updated_at: new Date().toISOString() }).eq("id", id);
  if (error && !isMissingTableError(error as PostgrestError)) {
    throw new Error(formatPostgrestError(error as PostgrestError, "phase34_invites.resend"));
  }
}

/** Kiungo cha kukubali mwaliko — token lazima iwe kwenye kumbukumbu (si kwenye DB). */
export function buildAcceptInviteLink(rawToken: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/auth/accept-invite?invite=${encodeURIComponent(rawToken)}`;
}
