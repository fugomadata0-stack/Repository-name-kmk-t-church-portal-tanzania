import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { sendSms } from "./providers/smsProvider.ts";
import { sendEmail } from "./providers/emailProvider.ts";
import { normalizeSmsDestination, recipientChannels, type RecipientRow } from "./utils/buildRecipients.ts";
import { logError, logInfo, logWarn } from "./utils/logger.ts";

type CommunicationRow = {
  id: string;
  title: string;
  message: string;
  subject: string | null;
  channel: "sms" | "email" | "both";
  status: string;
  scheduled_at: string | null;
};

function envMap(): Record<string, string | undefined> {
  return {
    SMS_PROVIDER: Deno.env.get("SMS_PROVIDER") ?? undefined,
    BEEM_API_KEY: Deno.env.get("BEEM_API_KEY") ?? undefined,
    BEEM_SECRET: Deno.env.get("BEEM_SECRET") ?? Deno.env.get("BEEM_SECRET_KEY") ?? undefined,
    SMS_SOURCE_ADDR: Deno.env.get("SMS_SOURCE_ADDR") ?? undefined,
    TWILIO_ACCOUNT_SID: Deno.env.get("TWILIO_ACCOUNT_SID") ?? undefined,
    TWILIO_AUTH_TOKEN: Deno.env.get("TWILIO_AUTH_TOKEN") ?? undefined,
    TWILIO_FROM_NUMBER: Deno.env.get("TWILIO_FROM_NUMBER") ?? undefined,
    AFRICASTALKING_API_KEY: Deno.env.get("AFRICASTALKING_API_KEY") ?? undefined,
    AFRICASTALKING_USERNAME: Deno.env.get("AFRICASTALKING_USERNAME") ?? undefined,
    EMAIL_PROVIDER: Deno.env.get("EMAIL_PROVIDER") ?? undefined,
    SENDGRID_API_KEY: Deno.env.get("SENDGRID_API_KEY") ?? undefined,
    RESEND_API_KEY: Deno.env.get("RESEND_API_KEY") ?? undefined,
    FROM_EMAIL: Deno.env.get("FROM_EMAIL") ?? undefined,
  };
}

async function notifyCompletion(svc: SupabaseClient, title: string, message: string) {
  try {
    const { error } = await svc.rpc("portal_enqueue_notification_system", {
      p_title: title.slice(0, 500),
      p_message: message.slice(0, 4000),
    });
    if (error) logWarn("notification_rpc_failed", { message: error.message });
  } catch (e) {
    logError("notification_rpc_exception", e, {});
  }
}

async function loadPendingRecipients(svc: SupabaseClient, communicationId: string): Promise<RecipientRow[]> {
  const { data, error } = await svc
    .from("communication_recipients")
    .select("*")
    .eq("communication_id", communicationId)
    .eq("delivery_status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecipientRow[];
}

async function updateRecipient(
  svc: SupabaseClient,
  id: string,
  patch: Partial<{
    delivery_status: string;
    provider_message_id: string | null;
    error_message: string | null;
    sent_at: string | null;
  }>
) {
  const { error } = await svc.from("communication_recipients").update(patch).eq("id", id);
  if (error) throw error;
}

async function processOneCommunication(
  svc: SupabaseClient,
  comm: CommunicationRow
): Promise<{ processed: number; sent: number; failed: number; skipped: number }> {
  const env = envMap();
  const recipients = await loadPendingRecipients(svc, comm.id);
  if (recipients.length === 0) {
    logInfo("no_pending_recipients_skip", { communication_id: comm.id });
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0,
    failed = 0,
    skipped = 0;

  for (const rec of recipients) {
    const { sendSms: doSms, sendEmail: doEmail } = recipientChannels(comm.channel, rec);

    if (!doSms && !doEmail) {
      await updateRecipient(svc, rec.id, {
        delivery_status: "skipped",
        error_message: "Hakuna anwani kwa njia iliyochaguliwa",
        sent_at: null,
      });
      skipped++;
      continue;
    }

    const errs: string[] = [];
    const ids: string[] = [];

    try {
      if (doSms) {
        const dest = normalizeSmsDestination(rec.recipient_phone);
        if (!dest) {
          errs.push("simu si sahihi");
        } else {
          const r = await sendSms(dest, comm.message, env);
          if (r.ok) ids.push(r.messageId);
          else errs.push(`SMS: ${r.error}`);
        }
      }

      if (doEmail) {
        const to = rec.recipient_email?.trim();
        if (!to) {
          errs.push("email haipo");
        } else {
          const subj = comm.subject?.trim() || comm.title || "Ujumbe kutoka KMKT";
          const r = await sendEmail(to, subj, comm.message, env);
          if (r.ok) ids.push(r.messageId);
          else errs.push(`Email: ${r.error}`);
        }
      }

      const ok = errs.length === 0;
      await updateRecipient(svc, rec.id, {
        delivery_status: ok ? "sent" : "failed",
        provider_message_id: ids.length ? ids.join(";") : null,
        error_message: ok ? null : errs.join(" | "),
        sent_at: ok ? new Date().toISOString() : null,
      });
      if (ok) sent++;
      else failed++;
    } catch (e) {
      logError("recipient_send_failed", e, { recipient_id: rec.id });
      const msg = e instanceof Error ? e.message : String(e);
      await updateRecipient(svc, rec.id, {
        delivery_status: "failed",
        error_message: msg,
        sent_at: null,
      });
      failed++;
    }
  }

  const { data: tall } = await svc
    .from("communication_recipients")
    .select("delivery_status")
    .eq("communication_id", comm.id);

  const tally = { pending: 0, sent: 0, failed: 0, skipped: 0 };
  for (const r of tall ?? []) {
    const s = String((r as { delivery_status: string }).delivery_status);
    if (s === "pending") tally.pending++;
    else if (s === "sent") tally.sent++;
    else if (s === "failed") tally.failed++;
    else if (s === "skipped") tally.skipped++;
  }

  const now = new Date().toISOString();
  let finalStatus: "sent" | "failed" = "failed";
  if (tally.sent > 0) finalStatus = "sent";
  else if (tally.failed > 0 && tally.sent === 0 && tally.pending === 0) finalStatus = "failed";
  else if (tally.skipped === (tall?.length ?? 0) && tally.sent === 0) finalStatus = "failed";

  await svc
    .from("communications")
    .update({
      status: finalStatus,
      sent_at: tally.sent > 0 ? now : null,
    })
    .eq("id", comm.id);

  await notifyCompletion(
    svc,
    "Ujumbe umetumwa",
    `Kampeni "${comm.title}" imekamilika — tumewatumia ${tally.sent}, kushindwa ${tally.failed}, foleni ${tally.pending}.`
  );

  return {
    processed: recipients.length,
    sent,
    failed,
    skipped,
  };
}

async function authorizeRequest(
  req: Request,
  userSb: SupabaseClient | null,
  communicationId: string | null
): Promise<{ ok: boolean; reason?: string }> {
  const cron = req.headers.get("x-communication-secret");
  const cronEnv = Deno.env.get("COMMUNICATION_CRON_SECRET");
  if (cron && cronEnv && cron === cronEnv) {
    return { ok: true };
  }

  if (!userSb || !communicationId) {
    return { ok: false, reason: "missing_auth" };
  }

  const { data, error } = await userSb.from("communications").select("id").eq("id", communicationId).maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "forbidden_or_not_found" };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-communication-secret",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!url || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(url, serviceKey);
    const authHeader = req.headers.get("Authorization");
    const userSb =
      authHeader && anonKey
        ? createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
        : null;

    let body: { communicationId?: string; retryFailed?: boolean; batch?: boolean } = {};
    if (req.method === "POST") {
      try {
        body = (await req.json()) as typeof body;
      } catch {
        body = {};
      }
    }

    const batch = Boolean(body.batch);
    const communicationId = body.communicationId?.trim() ?? null;
    const retryFailed = Boolean(body.retryFailed);

    if (batch) {
      const auth = await authorizeRequest(req, userSb, null);
      if (!auth.ok) {
        return new Response(JSON.stringify({ error: "Unauthorized batch — use x-communication-secret" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: queued, error: qerr } = await svc.from("communications").select("*").eq("status", "queued");
      if (qerr) throw qerr;
      const now = Date.now();
      const due = ((queued ?? []) as CommunicationRow[]).filter((c) => {
        if (!c.scheduled_at) return true;
        return new Date(c.scheduled_at).getTime() <= now;
      });

      const results: Record<string, unknown>[] = [];
      for (const c of due) {
        try {
          const r = await processOneCommunication(svc, c);
          results.push({ id: c.id, ok: true, ...r });
        } catch (e) {
          logError("batch_comm_failed", e, { id: c.id });
          results.push({ id: c.id, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }

      logInfo("batch_complete", { count: due.length });
      return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!communicationId) {
      return new Response(JSON.stringify({ error: "communicationId required unless batch=true" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const auth = await authorizeRequest(req, userSb, communicationId);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.reason ?? "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (retryFailed) {
      await svc
        .from("communication_recipients")
        .update({ delivery_status: "pending", error_message: null, provider_message_id: null, sent_at: null })
        .eq("communication_id", communicationId)
        .eq("delivery_status", "failed");

      await svc.from("communications").update({ status: "queued", sent_at: null }).eq("id", communicationId);
    }

    const { data: comm, error: cerr } = await svc.from("communications").select("*").eq("id", communicationId).single();

    if (cerr || !comm) {
      return new Response(JSON.stringify({ error: "Communication not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const row = comm as CommunicationRow;
    if (row.status !== "queued") {
      return new Response(JSON.stringify({ error: "Communication is not queued", status: row.status }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const out = await processOneCommunication(svc, row);

    return new Response(JSON.stringify({ ok: true, communicationId, ...out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    logError("handler_top", e, {});
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
