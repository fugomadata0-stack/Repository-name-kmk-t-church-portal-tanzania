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

type Payload = {
  email: string;
  role_key: string;
  scope_type?: string;
  /** JSON string au '{}' */
  scope_id?: string | null;
  message?: string | null;
  expires_in_days?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  const SENDGRID_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM_EMAIL") ?? Deno.env.get("FROM_EMAIL") ?? "";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "Server misconfigured (SUPABASE_URL / SERVICE_ROLE)." }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "Unauthorized: missing JWT." }, 401);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await svc.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) {
      return json({ ok: false, error: "Unauthorized: invalid session." }, 401);
    }
    const uid = userData.user.id;

    const { data: profile, error: pErr } = await svc
      .from("portal_directory_profiles")
      .select("role_key, email")
      .eq("auth_user_id", uid)
      .maybeSingle();

    if (pErr || !profile?.role_key) {
      return json({ ok: false, error: "Profile not found." }, 403);
    }

    const rk = profile.role_key as string;
    if (!["chief_admin", "super_admin"].includes(rk)) {
      return json({ ok: false, error: "Forbidden: Chief Admin or Super Admin only." }, 403);
    }

    const body = (await req.json()) as Payload;
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const roleKey = String(body.role_key ?? "").trim();
    if (!email || !roleKey) return json({ ok: false, error: "email and role_key required." }, 400);

    if (roleKey === "chief_admin" && rk === "super_admin") {
      return json({ ok: false, error: "Super Admin cannot invite Chief Admin role." }, 403);
    }

    const scopeType = (body.scope_type ?? "national").toLowerCase();
    const scopeId =
      body.scope_id ??
      (scopeType === "national" ? "{}" : JSON.stringify({ note: "set_scope_via_panel" }));

    const rawToken =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const tokenHash = await sha256Hex(rawToken);

    const days = Math.min(Math.max(Number(body.expires_in_days ?? 14), 1), 90);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

    const { data: inserted, error: insErr } = await svc
      .from("phase34_invites")
      .insert({
        email,
        role_key: roleKey,
        scope_type: scopeType,
        scope_id: typeof scopeId === "string" ? scopeId : JSON.stringify(scopeId),
        message: body.message?.trim() ?? null,
        token_hash: tokenHash,
        status: "pending",
        expires_at: expiresAt,
        invited_by: uid,
        created_by: uid,
        meta: { source: "phase35-send-invite" },
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[phase35-send-invite] insert", insErr);
      return json({ ok: false, error: insErr.message ?? "Insert failed." }, 400);
    }

    await svc.from("audit_logs").insert({
      action: "invite_created",
      entity: "phase34_invites",
      entity_id: inserted?.id ?? "",
      meta: {
        target_email: email,
        target_role: roleKey,
        scope_type: scopeType,
        scope_id: scopeId,
      },
      user_id: uid,
    });

    const acceptUrl = APP_URL ? `${APP_URL}/auth/accept-invite?invite=${encodeURIComponent(rawToken)}` : "";

    let emailSent = false;
    let emailError: string | null = null;

    if (SENDGRID_KEY && SENDGRID_FROM && acceptUrl) {
      const html = `
        <p>Habari,</p>
        <p>Umealikwa kujiunga na <b>KMT Church Portal</b>.</p>
        <p>Jukumu: <b>${roleKey}</b></p>
        <p><a href="${acceptUrl}">Kubali mwaliko na unda nenosiri</a></p>
        <p>Au nakili kiungo: <br/><span style="word-break:break-all">${acceptUrl}</span></p>
        <p><small>Hauna kiungo? Kiungo kitamaliza muda ${expiresAt}</small></p>
      `;
      const sg = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: SENDGRID_FROM },
          subject: "Mwaliko — KMT Church Portal",
          content: [{ type: "text/html", value: html }],
        }),
      });
      emailSent = sg.ok;
      if (!sg.ok) emailError = await sg.text();
    } else {
      try {
        const { error: invErr } = await svc.auth.admin.inviteUserByEmail(email, {
          data: { role_key: roleKey, invite_id: inserted?.id },
          redirectTo: acceptUrl || undefined,
        });
        if (!invErr) emailSent = true;
        else emailError = invErr.message;
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
      }
    }

    await svc.from("audit_logs").insert({
      action: emailSent ? "invite_email_sent" : "invite_email_failed",
      entity: "phase34_invites",
      entity_id: inserted?.id ?? "",
      meta: {
        target_email: email,
        target_role: roleKey,
        scope_type: scopeType,
        scope_id: scopeId,
        email_error: emailError ?? null,
        mock: !emailSent && !SENDGRID_KEY,
      },
      user_id: uid,
    });

    const mock = !emailSent && !emailError;

    return json({
      ok: true,
      invite_id: inserted?.id,
      email_sent: emailSent,
      mock_mode: mock || Boolean(emailError),
      accept_url: acceptUrl || null,
      /** Token halisi mara moja tu — si kwenye DB */
      raw_token_for_fallback: mock || emailError ? rawToken : undefined,
      email_error: emailError,
      warning:
        mock || emailError
          ? "Barua haijatuma kabisa — tumia raw_token_for_fallback / accept_url kwa majaribio."
          : undefined,
    });
  } catch (e) {
    console.error("[phase35-send-invite]", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Server error." }, 500);
  }
});
