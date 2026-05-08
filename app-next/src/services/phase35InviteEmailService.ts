import type { FunctionsHttpError } from "@supabase/supabase-js";
import { formatCaughtError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { Phase34ScopeLevel } from "./phase34InviteService";

export interface Phase35SendInvitePayload {
  email: string;
  role_key: string;
  scope_level: Phase34ScopeLevel;
  dayosisi_scope?: string;
  jimbo_scope?: string;
  tawi_scope?: string;
  message?: string;
  expires_in_days?: number;
}

export interface Phase35SendInviteResponse {
  ok: boolean;
  invite_id?: string;
  email_sent?: boolean;
  mock_mode?: boolean;
  accept_url?: string | null;
  raw_token_for_fallback?: string;
  email_error?: string | null;
  warning?: string;
  error?: string;
}

export interface Phase35ValidateResult {
  valid: boolean;
  code?: string;
  email?: string;
  role_key?: string;
  scope_type?: string | null;
  scope_id?: string | null;
  expires_at?: string;
  message?: string | null;
}

export interface Phase35AcceptPayload {
  token: string;
  password: string;
  email?: string;
}

export async function sendInviteEmail(payload: Phase35SendInvitePayload): Promise<Phase35SendInviteResponse> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase haijasanidiwa." };

  const scope_id =
    payload.scope_level === "national"
      ? "{}"
      : JSON.stringify({
          dayosisi: payload.dayosisi_scope ?? "",
          jimbo: payload.jimbo_scope ?? "",
          tawi: payload.tawi_scope ?? "",
        });

  try {
    const { data, error } = await sb.functions.invoke<Phase35SendInviteResponse>("phase35-send-invite", {
      body: {
        email: payload.email.trim().toLowerCase(),
        role_key: payload.role_key,
        scope_type: payload.scope_level,
        scope_id,
        message: payload.message ?? null,
        expires_in_days: payload.expires_in_days ?? 14,
      },
    });

    if (error) {
      const ctx = error as FunctionsHttpError;
      const msg =
        typeof ctx.message === "string"
          ? ctx.message
          : "Edge Function haipo au imeshindwa (deploy phase35-send-invite).";
      return { ok: false, error: msg };
    }

    if (!data) return { ok: false, error: "Hakuna majibu kutoka seva." };
    return data;
  } catch (e) {
    return { ok: false, error: formatCaughtError(e) };
  }
}

export async function validateInviteToken(token: string): Promise<Phase35ValidateResult> {
  const sb = getSupabase();
  if (!sb) return { valid: false, code: "no_client" };

  try {
    const { data, error } = await sb.rpc("phase35_validate_invite_token", { p_token: token });
    if (error) {
      return { valid: false, code: "rpc_error" };
    }
    const o = data as Record<string, unknown> | null;
    if (!o || o.valid !== true) {
      return {
        valid: false,
        code: typeof o?.code === "string" ? o.code : "invalid",
      };
    }
    return {
      valid: true,
      email: String(o.email ?? ""),
      role_key: String(o.role_key ?? ""),
      scope_type: o.scope_type != null ? String(o.scope_type) : null,
      scope_id: o.scope_id != null ? String(o.scope_id) : null,
      expires_at: o.expires_at != null ? String(o.expires_at) : undefined,
      message: o.message != null ? String(o.message) : null,
    };
  } catch {
    return { valid: false, code: "exception" };
  }
}

export async function acceptInvite(payload: Phase35AcceptPayload): Promise<{ ok: boolean; error?: string; code?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase haijasanidiwa." };

  try {
    const { data, error } = await sb.functions.invoke<{ ok?: boolean; error?: string; code?: string }>(
      "phase35-accept-invite",
      {
        body: {
          token: payload.token.trim(),
          password: payload.password,
          email: payload.email?.trim().toLowerCase(),
        },
      }
    );

    if (error) {
      return { ok: false, error: "Edge Function ya kukubali mwaliko haipo au imeshindwa.", code: "invoke_error" };
    }
    if (!data?.ok) {
      return { ok: false, error: data?.error ?? "Imeshindwa.", code: data?.code };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatCaughtError(e) };
  }
}
