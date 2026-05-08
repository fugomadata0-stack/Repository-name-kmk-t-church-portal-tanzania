import { logError, logInfo } from "../utils/logger.ts";

export type SmsSendResult = { ok: true; messageId: string } | { ok: false; error: string };

function basicAuthHeader(apiKey: string, secret: string): string {
  const raw = `${apiKey}:${secret}`;
  const b64 = btoa(raw);
  return `Basic ${b64}`;
}

/** Beem Africa — https://docs.beem.africa/ */
async function sendBeem(
  toDigits: string,
  message: string,
  env: Record<string, string | undefined>
): Promise<SmsSendResult> {
  const apiKey = env.BEEM_API_KEY;
  const secret = env.BEEM_SECRET ?? env.BEEM_SECRET_KEY;
  const sourceAddr = env.SMS_SOURCE_ADDR ?? env.BEEM_SOURCE_ADDR ?? "INFO";
  if (!apiKey || !secret) {
    return { ok: false, error: "BEEM_API_KEY / BEEM_SECRET missing" };
  }
  const url = "https://apisms.beem.africa/v1/send";
  const body = {
    source_addr: sourceAddr.slice(0, 11),
    encoding: 0,
    message,
    recipients: [{ recipient_id: 1, dest_addr: toDigits }],
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(apiKey, secret),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return { ok: false, error: `Beem HTTP ${res.status}: ${JSON.stringify(json)}` };
    }
    const ok = json.successful === true || json.code === 100 || res.status === 200;
    if (!ok) {
      return { ok: false, error: JSON.stringify(json) };
    }
    const mid = String(json.request_id ?? json.message_id ?? json.valid ?? res.status);
    logInfo("beem_sms_sent", { dest: toDigits.slice(0, 5) + "***", request_id: mid });
    return { ok: true, messageId: `beem:${mid}` };
  } catch (e) {
    logError("beem_sms_exception", e, {});
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Twilio */
async function sendTwilio(
  toE164: string,
  message: string,
  env: Record<string, string | undefined>
): Promise<SmsSendResult> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { ok: false, error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER missing" };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({ To: toE164, From: from, Body: message });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(sid, token),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      return { ok: false, error: json.message ?? `Twilio HTTP ${res.status}` };
    }
    return { ok: true, messageId: `twilio:${json.sid ?? "ok"}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Africa's Talking — simplified REST */
async function sendAfricasTalking(
  to: string,
  message: string,
  env: Record<string, string | undefined>
): Promise<SmsSendResult> {
  const apiKey = env.AFRICASTALKING_API_KEY;
  const username = env.AFRICASTALKING_USERNAME ?? "sandbox";
  if (!apiKey) {
    return { ok: false, error: "AFRICASTALKING_API_KEY missing" };
  }
  const url = "https://api.africastalking.com/version1/messaging";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
        Accept: "application/json",
      },
      body: new URLSearchParams({
        username,
        to,
        message,
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `AT HTTP ${res.status}: ${text}` };
    return { ok: true, messageId: `at:${text.slice(0, 80)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendSms(
  toRaw: string,
  message: string,
  env: Record<string, string | undefined>
): Promise<SmsSendResult> {
  const provider = (env.SMS_PROVIDER ?? "beem").toLowerCase().trim();
  const digits = toRaw.replace(/\D/g, "");
  const e164 = digits.startsWith("255") ? `+${digits}` : digits.startsWith("0") ? `+255${digits.slice(1)}` : `+${digits}`;

  switch (provider) {
    case "beem":
      return sendBeem(digits.replace(/^\+/, ""), message, env);
    case "twilio":
      return sendTwilio(e164, message, env);
    case "africastalking":
    case "africas_talking":
      return sendAfricasTalking(e164, message, env);
    default:
      logError("sms_unknown_provider", new Error(provider), {});
      return { ok: false, error: `Unknown SMS_PROVIDER: ${provider}` };
  }
}
