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

type Payload = {
  action: "activate" | "suspend" | "reset_password";
  profile_id: string;
  reason?: string | null;
};

function assertLifecycleAllowed(actorRole: string, targetRole: string): void {
  if (targetRole === "chief_admin" && actorRole === "super_admin") {
    throw new Error("Forbidden: Super Admin cannot manage Chief Admin account lifecycle.");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
  const SENDGRID_KEY = Deno.env.get("SENDGRID_API_KEY");
  const SENDGRID_FROM = Deno.env.get("SENDGRID_FROM_EMAIL") ?? Deno.env.get("FROM_EMAIL") ?? "";

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "Server misconfigured." }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ ok: false, error: "Unauthorized." }, 401);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await svc.auth.getUser(jwt);
    if (userErr || !userData?.user?.id) return json({ ok: false, error: "Unauthorized." }, 401);
    const actorUid = userData.user.id;

    const { data: actorProfile, error: apErr } = await svc
      .from("portal_directory_profiles")
      .select("role_key")
      .eq("auth_user_id", actorUid)
      .maybeSingle();

    if (apErr || !actorProfile?.role_key) return json({ ok: false, error: "Profile not found." }, 403);

    const actorRole = actorProfile.role_key as string;
    if (!["chief_admin", "super_admin"].includes(actorRole)) {
      return json({ ok: false, error: "Forbidden: Chief Admin or Super Admin only." }, 403);
    }

    const body = (await req.json()) as Payload;
    const profileId = String(body.profile_id ?? "").trim();
    const action = body.action;
    const reason = body.reason?.trim() ?? null;

    if (!profileId || !action) return json({ ok: false, error: "profile_id and action required." }, 400);

    const { data: target, error: tErr } = await svc
      .from("portal_directory_profiles")
      .select("id,email,role_key,status,auth_user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (tErr || !target) return json({ ok: false, error: "Profile not found." }, 404);

    const targetRole = String(target.role_key ?? "");
    try {
      assertLifecycleAllowed(actorRole, targetRole);
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : "Forbidden." }, 403);
    }

    if (target.auth_user_id === actorUid && (action === "suspend" || action === "activate")) {
      return json({ ok: false, error: "Huwezi kubadilisha hali ya akaunti yako mwenyewe hapa." }, 400);
    }

    const prevStatus = String(target.status ?? "");
    const email = String(target.email ?? "").toLowerCase();

    if (action === "activate") {
      await svc
        .from("portal_directory_profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", profileId);

      if (target.auth_user_id) {
        const { error: banErr } = await svc.auth.admin.updateUserById(target.auth_user_id as string, {
          ban_duration: "none",
        });
        if (banErr) console.error("[phase36] unban", banErr);
      }

      await svc.from("phase36_account_lifecycle_events").insert({
        profile_id: profileId,
        action: "activate",
        previous_status: prevStatus,
        new_status: "active",
        actor_user_id: actorUid,
        target_email: email,
        target_role: targetRole,
        metadata: { reason },
      });

      await svc.from("audit_logs").insert({
        action: "account_activated",
        entity: "portal_directory_profiles",
        entity_id: profileId,
        meta: { target_email: email, target_role: targetRole, reason },
        user_id: actorUid,
      });

      return json({ ok: true, new_status: "active" });
    }

    if (action === "suspend") {
      await svc
        .from("portal_directory_profiles")
        .update({ status: "suspended", updated_at: new Date().toISOString() })
        .eq("id", profileId);

      if (target.auth_user_id) {
        const { error: banErr } = await svc.auth.admin.updateUserById(target.auth_user_id as string, {
          ban_duration: "876000h",
        });
        if (banErr) console.error("[phase36] ban", banErr);
      }

      await svc.from("phase36_account_lifecycle_events").insert({
        profile_id: profileId,
        action: "suspend",
        previous_status: prevStatus,
        new_status: "suspended",
        actor_user_id: actorUid,
        target_email: email,
        target_role: targetRole,
        metadata: { reason },
      });

      await svc.from("audit_logs").insert({
        action: "account_suspended",
        entity: "portal_directory_profiles",
        entity_id: profileId,
        meta: { target_email: email, target_role: targetRole, reason },
        user_id: actorUid,
      });

      return json({ ok: true, new_status: "suspended" });
    }

    if (action === "reset_password") {
      if (!target.auth_user_id) {
        return json({ ok: false, error: "Hakuna akaunti ya Auth kwa barua hii — wasifu bila kuingia." }, 400);
      }

      const redirectTo = APP_URL ? `${APP_URL}/` : undefined;
      const linkParams = redirectTo
        ? ({ type: "recovery" as const, email, options: { redirectTo } } as const)
        : ({ type: "recovery" as const, email } as const);
      const { data: linkData, error: linkErr } = await svc.auth.admin.generateLink(linkParams);

      if (linkErr || !linkData?.properties?.action_link) {
        console.error("[phase36] generateLink", linkErr);
        return json({ ok: false, error: linkErr?.message ?? "Imeshindwa kutengeneza kiungo cha urejeshaji." }, 400);
      }

      const recoveryLink = linkData.properties.action_link as string;
      let emailSent = false;
      let emailError: string | null = null;

      if (SENDGRID_KEY && SENDGRID_FROM && recoveryLink) {
        const html = `
          <p>Habari,</p>
          <p>Ombi la kuweka upya nenosiri kwa <b>KMT Portal</b>.</p>
          <p><a href="${recoveryLink}">Weka upya nenosiri</a></p>
          <p>Au nakili: <span style="word-break:break-all">${recoveryLink}</span></p>
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
            subject: "Weka upya nenosiri — KMT Portal",
            content: [{ type: "text/html", value: html }],
          }),
        });
        emailSent = sg.ok;
        if (!sg.ok) emailError = await sg.text();
      }

      await svc.from("phase36_account_lifecycle_events").insert({
        profile_id: profileId,
        action: "reset_password",
        previous_status: prevStatus,
        new_status: prevStatus,
        actor_user_id: actorUid,
        target_email: email,
        target_role: targetRole,
        metadata: {
          reason,
          email_sent: emailSent,
          email_error: emailError,
          mock_mode: !emailSent && !emailError,
        },
      });

      await svc.from("audit_logs").insert({
        action: emailSent ? "password_reset_email_sent" : emailError ? "password_reset_email_failed" : "password_recovery_link_generated",
        entity: "portal_directory_profiles",
        entity_id: profileId,
        meta: { target_email: email, target_role: targetRole, email_sent: emailSent },
        user_id: actorUid,
      });

      return json({
        ok: true,
        email_sent: emailSent,
        mock_mode: !emailSent && !emailError,
        recovery_link: emailSent ? undefined : recoveryLink,
        email_error: emailError,
        warning:
          !emailSent && !emailError
            ? "Barua haijatuma — tumia recovery_link kwa majaribio (si kwenye uzalishaji ukiwa na SendGrid)."
            : emailError
              ? "Barua imeshindwa — tumia recovery_link kwa mkono au angalia SendGrid."
              : undefined,
      });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (e) {
    console.error("[phase36-user-lifecycle]", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Server error." }, 500);
  }
});
