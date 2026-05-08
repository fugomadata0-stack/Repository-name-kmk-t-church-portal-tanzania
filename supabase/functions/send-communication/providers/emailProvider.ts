import { logError, logInfo } from "../utils/logger.ts";

export type EmailSendResult = { ok: true; messageId: string } | { ok: false; error: string };

/** SendGrid v3 */
async function sendSendgrid(
  to: string,
  subject: string,
  htmlBody: string,
  env: Record<string, string | undefined>
): Promise<EmailSendResult> {
  const key = env.SENDGRID_API_KEY;
  const from = env.FROM_EMAIL;
  if (!key || !from) {
    return { ok: false, error: "SENDGRID_API_KEY / FROM_EMAIL missing" };
  }
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject,
        content: [{ type: "text/html", value: `<div>${escapeHtml(htmlBody)}</div>` }],
      }),
    });
    const msgId = res.headers.get("x-message-id") ?? "";
    if (!res.ok) {
      const errBody = await res.text();
      return { ok: false, error: `SendGrid ${res.status}: ${errBody}` };
    }
    logInfo("sendgrid_sent", { to: to.slice(0, 3) + "***" });
    return { ok: true, messageId: msgId || "sendgrid:ok" };
  } catch (e) {
    logError("sendgrid_exception", e, {});
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Resend */
async function sendResend(
  to: string,
  subject: string,
  htmlBody: string,
  env: Record<string, string | undefined>
): Promise<EmailSendResult> {
  const key = env.RESEND_API_KEY;
  const from = env.FROM_EMAIL;
  if (!key || !from) {
    return { ok: false, error: "RESEND_API_KEY / FROM_EMAIL missing" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: `<div>${escapeHtml(htmlBody)}</div>`,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: json.message ?? `Resend HTTP ${res.status}` };
    }
    return { ok: true, messageId: `resend:${json.id ?? "ok"}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  env: Record<string, string | undefined>
): Promise<EmailSendResult> {
  const provider = (env.EMAIL_PROVIDER ?? "sendgrid").toLowerCase().trim();
  switch (provider) {
    case "sendgrid":
      return sendSendgrid(to, subject, body, env);
    case "resend":
      return sendResend(to, subject, body, env);
    default:
      return { ok: false, error: `Unknown EMAIL_PROVIDER: ${provider}` };
  }
}
