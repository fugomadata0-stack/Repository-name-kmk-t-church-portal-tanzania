import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Body = {
  token: string;
  password: string;
  email?: string;
};

function parseScopeScopes(scopeId: string | null): {
  dayosisi_scope: string | null;
  jimbo_scope: string | null;
  tawi_scope: string | null;
} {
  if (!scopeId || scopeId === "{}") return { dayosisi_scope: null, jimbo_scope: null, tawi_scope: null };
  try {
    const o = JSON.parse(scopeId) as Record<string, string | null>;
    return {
      dayosisi_scope: o.dayosisi ?? o.dayosisi_scope ?? null,
      jimbo_scope: o.jimbo ?? o.jimbo_scope ?? null,
      tawi_scope: o.tawi ?? o.tawi_scope ?? null,
    };
  } catch {
    return { dayosisi_scope: null, jimbo_scope: null, tawi_scope: null };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "Server misconfigured." }, 500);
  }

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = (await req.json()) as Body;
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    const emailConfirm = String(body.email ?? "").trim().toLowerCase();

    if (token.length < 16 || password.length < 8) {
      return json({ ok: false, error: "Token au nenosiri si sahihi." }, 400);
    }

    const tokenHash = await sha256Hex(token);

    const { data: invite, error: invErr } = await svc
      .from("phase34_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (invErr || !invite) {
      return json({ ok: false, code: "not_found", error: "Mwaliko haupatikani." }, 404);
    }

    const inv = invite as Record<string, unknown>;
    const invitedEmail = String(inv.email ?? "").toLowerCase();
    if (emailConfirm && emailConfirm !== invitedEmail) {
      return json({ ok: false, code: "email_mismatch", error: "Barua pepe hailingani na mwaliko." }, 400);
    }

    const status = String(inv.status ?? "");
    if (status === "revoked") return json({ ok: false, code: "revoked", error: "Mwaliko umebatilishwa." }, 400);
    if (status === "accepted") return json({ ok: false, code: "already_accepted", error: "Mwaliko tayari umekubaliwa." }, 400);
    if (new Date(String(inv.expires_at)).getTime() < Date.now()) {
      await svc.from("phase34_invites").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", inv.id);
      return json({ ok: false, code: "expired", error: "Mwaliko umeisha muda." }, 400);
    }

    const roleKey = String(inv.role_key ?? "");
    const scopes = parseScopeScopes(inv.scope_id ? String(inv.scope_id) : null);

    const { data: created, error: createErr } = await svc.auth.admin.createUser({
      email: invitedEmail,
      password,
      email_confirm: true,
      user_metadata: { role_key: roleKey },
    });

    if (createErr || !created?.user?.id) {
      const em = (createErr?.message ?? "").toLowerCase();
      if (
        em.includes("already") ||
        em.includes("registered") ||
        em.includes("exists") ||
        createErr?.status === 422
      ) {
        return json({ ok: false, code: "user_exists", error: "Akaunti kwa barua hii tayari ipo. Ingia badala yake." }, 409);
      }
      console.error(createErr);
      return json({ ok: false, error: createErr?.message ?? "Imeshindwa kuunda akaunti." }, 400);
    }

    const authId = created.user.id;

    const { data: existingProfile } = await svc
      .from("portal_directory_profiles")
      .select("id")
      .eq("email", invitedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      await svc
        .from("portal_directory_profiles")
        .update({
          role_key: roleKey,
          auth_user_id: authId,
          status: "active",
          dayosisi_scope: scopes.dayosisi_scope,
          jimbo_scope: scopes.jimbo_scope,
          tawi_scope: scopes.tawi_scope,
          updated_at: new Date().toISOString(),
          meta: { invite_accepted: true },
        })
        .eq("id", existingProfile.id);
    } else {
      await svc.from("portal_directory_profiles").insert({
        email: invitedEmail,
        role_key: roleKey,
        auth_user_id: authId,
        status: "active",
        dayosisi_scope: scopes.dayosisi_scope,
        jimbo_scope: scopes.jimbo_scope,
        tawi_scope: scopes.tawi_scope,
        meta: { invite_accepted: true },
      });
    }

    await svc
      .from("phase34_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: authId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inv.id);

    await svc.from("audit_logs").insert({
      action: "invite_accepted",
      entity: "phase34_invites",
      entity_id: String(inv.id),
      meta: {
        target_email: invitedEmail,
        target_role: roleKey,
        scope_type: inv.scope_type,
        scope_id: inv.scope_id,
        user_profile_created_from_invite: true,
      },
      user_id: authId,
    });

    return json({ ok: true, user_id: authId });
  } catch (e) {
    console.error("[phase35-accept-invite]", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Server error." }, 500);
  }
});
