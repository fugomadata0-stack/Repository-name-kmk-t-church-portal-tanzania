import type { PostgrestError } from "@supabase/supabase-js";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { safeJsonParseObject, safeSessionStorage } from "../lib/security";
import type {
  CommunicationChannel,
  CommunicationRecord,
  CommunicationRecipientRecord,
  CommunicationStatus,
  CommunicationTargetType,
  CommunicationTemplateRecord,
} from "../types";

const PREFILL_KEY = "kmt_communications_prefill";

export type CommunicationPrefill = {
  title?: string;
  message?: string;
  subject?: string;
  channel?: CommunicationChannel;
  target_type?: CommunicationTargetType;
  target_role?: string | null;
  target_group?: string | null;
  target_email?: string | null;
  target_phone?: string | null;
  /** ISO */
  scheduled_at?: string | null;
};

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToComm(r: Record<string, unknown>): CommunicationRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    message: String(r.message ?? ""),
    subject: r.subject == null ? null : String(r.subject),
    custom_recipients_raw: r.custom_recipients_raw == null ? null : String(r.custom_recipients_raw),
    channel: (r.channel as CommunicationChannel) ?? "sms",
    target_type: (r.target_type as CommunicationTargetType) ?? "all",
    target_role: r.target_role == null ? null : String(r.target_role),
    target_user_id: r.target_user_id == null ? null : String(r.target_user_id),
    target_group: r.target_group == null ? null : String(r.target_group),
    target_email: r.target_email == null ? null : String(r.target_email),
    target_phone: r.target_phone == null ? null : String(r.target_phone),
    recipients_count: Number(r.recipients_count ?? 0),
    status: (r.status as CommunicationStatus) ?? "draft",
    scheduled_at: r.scheduled_at == null ? null : String(r.scheduled_at),
    sent_at: r.sent_at == null ? null : String(r.sent_at),
    created_by: r.created_by == null ? null : String(r.created_by),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

function rowToRec(r: Record<string, unknown>): CommunicationRecipientRecord {
  return {
    id: String(r.id ?? ""),
    communication_id: String(r.communication_id ?? ""),
    recipient_name: r.recipient_name == null ? null : String(r.recipient_name),
    recipient_email: r.recipient_email == null ? null : String(r.recipient_email),
    recipient_phone: r.recipient_phone == null ? null : String(r.recipient_phone),
    recipient_type: r.recipient_type == null ? null : String(r.recipient_type),
    delivery_status: (r.delivery_status as CommunicationRecipientRecord["delivery_status"]) ?? "pending",
    provider_message_id: r.provider_message_id == null ? null : String(r.provider_message_id),
    error_message: r.error_message == null ? null : String(r.error_message),
    sent_at: r.sent_at == null ? null : String(r.sent_at),
    created_at: String(r.created_at ?? ""),
  };
}

function rowToTemplate(r: Record<string, unknown>): CommunicationTemplateRecord {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    channel: (r.channel as CommunicationTemplateRecord["channel"]) ?? "sms",
    subject: r.subject == null ? null : String(r.subject),
    body: String(r.body ?? ""),
    category: r.category == null ? null : String(r.category),
    is_active: Boolean(r.is_active),
    created_by: r.created_by == null ? null : String(r.created_by),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export type ResolvedRecipient = {
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_type: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(p: string): string | null {
  const d = p.replace(/\D/g, "");
  if (d.length < 9) return null;
  return d.startsWith("255") ? `+${d}` : d.startsWith("0") ? `+255${d.slice(1)}` : `+${d}`;
}

export function parseCustomRecipientLines(raw: string): { email?: string; phone?: string }[] {
  const lines = raw
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const out: { email?: string; phone?: string }[] = [];
  for (const line of lines) {
    if (EMAIL_RE.test(line)) {
      out.push({ email: line.toLowerCase() });
      continue;
    }
    const ph = normalizePhone(line);
    if (ph) out.push({ phone: ph });
  }
  return out;
}

function channelAllowsEmail(ch: CommunicationChannel): boolean {
  return ch === "email" || ch === "both";
}
function channelAllowsSms(ch: CommunicationChannel): boolean {
  return ch === "sms" || ch === "both";
}

function deliveryStatusForChannel(
  ch: CommunicationChannel,
  email: string | null,
  phone: string | null
): "pending" | "skipped" {
  const needEmail = channelAllowsEmail(ch);
  const needSms = channelAllowsSms(ch);
  if (ch === "both") {
    if (!email && !phone) return "skipped";
    return "pending";
  }
  if (needEmail && !email) return "skipped";
  if (needSms && !phone) return "skipped";
  return "pending";
}

export async function resolveRecipients(args: {
  channel: CommunicationChannel;
  target_type: CommunicationTargetType;
  target_role?: string | null;
  target_user_id?: string | null;
  target_group?: string | null;
  target_email?: string | null;
  target_phone?: string | null;
  custom_recipients_raw?: string | null;
}): Promise<ResolvedRecipient[]> {
  const c = clientOrThrow();
  const { target_type } = args;
  const out: ResolvedRecipient[] = [];

  if (target_type === "individual") {
    const email = args.target_email?.trim() || null;
    const phone = args.target_phone ? normalizePhone(args.target_phone) : null;
    let name: string | null = null;
    if (args.target_user_id) {
      const { data: prof } = await c
        .from("portal_directory_profiles")
        .select("full_name, email, phone")
        .eq("auth_user_id", args.target_user_id)
        .maybeSingle();
      if (prof) {
        const p = prof as Record<string, unknown>;
        name = p.full_name == null ? null : String(p.full_name);
        out.push({
          recipient_name: name,
          recipient_email: email ?? (p.email == null ? null : String(p.email)),
          recipient_phone: phone ?? (p.phone == null ? null : normalizePhone(String(p.phone))),
          recipient_type: "individual",
        });
        return out;
      }
    }
    out.push({
      recipient_name: name,
      recipient_email: email,
      recipient_phone: phone,
      recipient_type: "individual",
    });
    return out;
  }

  if (target_type === "custom_list") {
    const parsed = parseCustomRecipientLines(args.custom_recipients_raw ?? "");
    for (const row of parsed) {
      const email = row.email ?? null;
      const phone = row.phone ? normalizePhone(row.phone) : null;
      out.push({
        recipient_name: null,
        recipient_email: email,
        recipient_phone: phone,
        recipient_type: "custom",
      });
    }
    return out;
  }

  if (target_type === "all") {
    const { data, error } = await c
      .from("portal_directory_profiles")
      .select("full_name, email, phone, role_key")
      .eq("status", "active")
      .limit(5000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve all"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      out.push({
        recipient_name: p.full_name == null ? null : String(p.full_name),
        recipient_email: p.email == null ? null : String(p.email).toLowerCase(),
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: `portal:${String(p.role_key ?? "")}`,
      });
    }
    return out;
  }

  if (target_type === "role" && args.target_role?.trim()) {
    const { data, error } = await c
      .from("portal_directory_profiles")
      .select("full_name, email, phone, role_key")
      .eq("status", "active")
      .eq("role_key", args.target_role.trim())
      .limit(5000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve role"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      out.push({
        recipient_name: p.full_name == null ? null : String(p.full_name),
        recipient_email: p.email == null ? null : String(p.email).toLowerCase(),
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: `role:${args.target_role}`,
      });
    }
    return out;
  }

  if (target_type === "members") {
    const { data, error } = await c
      .from("church_members")
      .select("first_name, last_name, email, phone, membership_status")
      .eq("membership_status", "active")
      .limit(10000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve members"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      const fn = String(p.first_name ?? "");
      const ln = String(p.last_name ?? "");
      const full = `${fn} ${ln}`.trim();
      out.push({
        recipient_name: full || null,
        recipient_email: p.email == null ? null : String(p.email).toLowerCase(),
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: "member",
      });
    }
    return out;
  }

  if (target_type === "group" && args.target_group?.trim()) {
    const g = args.target_group.trim();
    const { data, error } = await c
      .from("church_members")
      .select("first_name, last_name, email, phone, tawi_name")
      .eq("membership_status", "active")
      .ilike("tawi_name", `%${g}%`)
      .limit(5000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve group"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      const fn = String(p.first_name ?? "");
      const ln = String(p.last_name ?? "");
      const full = `${fn} ${ln}`.trim();
      out.push({
        recipient_name: full || null,
        recipient_email: p.email == null ? null : String(p.email).toLowerCase(),
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: "group",
      });
    }
    return out;
  }

  if (target_type === "beneficiaries") {
    const { data, error } = await c.from("aid_beneficiaries").select("full_name, phone").limit(5000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve beneficiaries"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      out.push({
        recipient_name: p.full_name == null ? null : String(p.full_name),
        recipient_email: null,
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: "beneficiary",
      });
    }
    return out;
  }

  if (target_type === "event_participants") {
    const eventId = args.target_group?.trim();
    let suffix = "";
    if (eventId && /^[0-9a-f-]{36}$/i.test(eventId)) {
      const { data: ev } = await c.from("events").select("title, event_date, location").eq("id", eventId).maybeSingle();
      if (ev) {
        const e = ev as Record<string, unknown>;
        suffix = ` [Tukio: ${e.title ?? ""} ${e.event_date ?? ""}]`;
      }
    }
    const { data, error } = await c
      .from("church_members")
      .select("first_name, last_name, email, phone")
      .eq("membership_status", "active")
      .limit(8000);
    if (error) throw new Error(formatPostgrestError(error, "communications.resolve event_participants"));
    for (const r of data ?? []) {
      const p = r as Record<string, unknown>;
      const fn = String(p.first_name ?? "");
      const ln = String(p.last_name ?? "");
      const full = `${fn} ${ln}`.trim();
      out.push({
        recipient_name: ((full || "") + suffix).trim(),
        recipient_email: p.email == null ? null : String(p.email).toLowerCase(),
        recipient_phone: p.phone == null ? null : normalizePhone(String(p.phone)),
        recipient_type: "event_broadcast",
      });
    }
    return out;
  }

  return out;
}

/** Dedupe by email / phone */
export function dedupeRecipients(rows: ResolvedRecipient[], channel: CommunicationChannel): ResolvedRecipient[] {
  const seen = new Set<string>();
  const list: ResolvedRecipient[] = [];
  for (const r of rows) {
    const key =
      channelAllowsEmail(channel) && r.recipient_email
        ? `e:${r.recipient_email}`
        : channelAllowsSms(channel) && r.recipient_phone
          ? `p:${r.recipient_phone}`
          : channel === "both"
            ? r.recipient_email
              ? `e:${r.recipient_email}`
              : r.recipient_phone
                ? `p:${r.recipient_phone}`
                : ""
            : "";
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(r);
  }
  return list;
}

export async function fetchCommunications(): Promise<CommunicationRecord[]> {
  const c = clientOrThrow();
  const { data, error } = await c.from("communications").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(formatPostgrestError(error, "communications.list"));
  return (data ?? []).map((x) => rowToComm(x as Record<string, unknown>));
}

export async function fetchRecipients(communicationId: string): Promise<CommunicationRecipientRecord[]> {
  const c = clientOrThrow();
  const { data, error } = await c
    .from("communication_recipients")
    .select("*")
    .eq("communication_id", communicationId)
    .order("created_at", { ascending: true })
    .limit(20000);
  if (error) throw new Error(formatPostgrestError(error, "communication_recipients.list"));
  return (data ?? []).map((x) => rowToRec(x as Record<string, unknown>));
}

export async function fetchTemplates(): Promise<CommunicationTemplateRecord[]> {
  const c = clientOrThrow();
  const { data, error } = await c.from("communication_templates").select("*").order("name", { ascending: true }).limit(500);
  if (error) throw new Error(formatPostgrestError(error, "communication_templates.list"));
  return (data ?? []).map((x) => rowToTemplate(x as Record<string, unknown>));
}

export async function upsertTemplate(
  row: Partial<CommunicationTemplateRecord> & { name: string; body: string }
): Promise<CommunicationTemplateRecord> {
  const c = clientOrThrow();
  const payload = {
    name: row.name.trim(),
    body: row.body,
    channel: row.channel ?? "sms",
    subject: row.subject?.trim() || null,
    category: row.category?.trim() || null,
    is_active: row.is_active ?? true,
  };
  if (row.id) {
    const { data, error } = await c.from("communication_templates").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "communication_templates.update"));
    return rowToTemplate(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("communication_templates").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "communication_templates.insert"));
  return rowToTemplate(data as Record<string, unknown>);
}

export async function deleteTemplate(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("communication_templates").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "communication_templates.delete"));
}

export async function saveDraftCommunication(input: {
  title: string;
  message: string;
  subject?: string | null;
  channel: CommunicationChannel;
  target_type: CommunicationTargetType;
  target_role?: string | null;
  target_user_id?: string | null;
  target_group?: string | null;
  target_email?: string | null;
  target_phone?: string | null;
  custom_recipients_raw?: string | null;
  scheduled_at?: string | null;
}): Promise<CommunicationRecord> {
  const c = clientOrThrow();
  const payload = {
    title: input.title.trim(),
    message: input.message.trim(),
    subject: input.subject?.trim() || null,
    channel: input.channel,
    target_type: input.target_type,
    target_role: input.target_role?.trim() || null,
    target_user_id: input.target_user_id || null,
    target_group: input.target_group?.trim() || null,
    target_email: input.target_email?.trim() || null,
    target_phone: input.target_phone?.trim() || null,
    custom_recipients_raw: input.custom_recipients_raw?.trim() || null,
    scheduled_at: input.scheduled_at || null,
    status: "draft" as const,
    recipients_count: 0,
  };
  const { data, error } = await c.from("communications").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "communications.draft"));
  return rowToComm(data as Record<string, unknown>);
}

export async function queueCommunication(input: {
  title: string;
  message: string;
  subject?: string | null;
  channel: CommunicationChannel;
  target_type: CommunicationTargetType;
  target_role?: string | null;
  target_user_id?: string | null;
  target_group?: string | null;
  target_email?: string | null;
  target_phone?: string | null;
  custom_recipients_raw?: string | null;
  scheduled_at?: string | null;
  skipNotification?: boolean;
}): Promise<{ communication: CommunicationRecord; recipients: number }> {
  const c = clientOrThrow();
  let resolved = await resolveRecipients({
    channel: input.channel,
    target_type: input.target_type,
    target_role: input.target_role,
    target_user_id: input.target_user_id,
    target_group: input.target_group,
    target_email: input.target_email,
    target_phone: input.target_phone,
    custom_recipients_raw: input.custom_recipients_raw,
  });
  resolved = dedupeRecipients(resolved, input.channel);
  const usable = resolved.filter((r) => deliveryStatusForChannel(input.channel, r.recipient_email, r.recipient_phone) === "pending");
  if (usable.length === 0) {
    throw new Error("NO_RECIPIENTS");
  }

  const { data: comm, error: e1 } = await c
    .from("communications")
    .insert({
      title: input.title.trim(),
      message: input.message.trim(),
      subject: input.subject?.trim() || null,
      channel: input.channel,
      target_type: input.target_type,
      target_role: input.target_role?.trim() || null,
      target_user_id: input.target_user_id || null,
      target_group: input.target_group?.trim() || null,
      target_email: input.target_email?.trim() || null,
      target_phone: input.target_phone?.trim() || null,
      custom_recipients_raw: input.custom_recipients_raw?.trim() || null,
      scheduled_at: input.scheduled_at || null,
      recipients_count: usable.length,
      status: "queued" as const,
    })
    .select("*")
    .single();
  if (e1) throw new Error(formatPostgrestError(e1, "communications.queue"));

  const commRow = rowToComm(comm as Record<string, unknown>);
  const recPayload = resolved.map((r) => ({
    communication_id: commRow.id,
    recipient_name: r.recipient_name,
    recipient_email: r.recipient_email,
    recipient_phone: r.recipient_phone,
    recipient_type: r.recipient_type,
    delivery_status: deliveryStatusForChannel(input.channel, r.recipient_email, r.recipient_phone),
  }));

  const { error: e2 } = await c.from("communication_recipients").insert(recPayload);
  if (e2) throw new Error(formatPostgrestError(e2, "communication_recipients.insert"));

  if (!input.skipNotification) {
    await notifyCommunicationLifecycle("Ujumbe kwenye foleni", `Kampeni "${commRow.title}" — wapokeaji ${usable.length}.`, "system");
  }

  return { communication: commRow, recipients: usable.length };
}

export async function notifyCommunicationLifecycle(title: string, message: string, type = "system"): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const { error } = await c.rpc("portal_enqueue_notification", {
      p_title: title.slice(0, 500),
      p_message: message.slice(0, 4000),
      p_type: type,
      p_target_role: null,
      p_target_user_id: null,
      p_is_global: true,
    });
    if (error) throw error;
  } catch {
    /* RPC haipatikani */
  }
}

export async function cancelScheduledCommunication(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("communications").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "communications.cancel"));
}

export async function deleteCommunication(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("communications").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "communications.delete"));
}

export async function simulateSendCommunication(id: string): Promise<void> {
  const c = clientOrThrow();
  const now = new Date().toISOString();
  const { error: e1 } = await c
    .from("communications")
    .update({ status: "sent", sent_at: now })
    .eq("id", id);
  if (e1) throw new Error(formatPostgrestError(e1, "communications.simulate"));
  const { error: e2 } = await c
    .from("communication_recipients")
    .update({ delivery_status: "sent", sent_at: now })
    .eq("communication_id", id)
    .eq("delivery_status", "pending");
  if (e2) throw new Error(formatPostgrestError(e2, "communication_recipients.simulate"));
  await notifyCommunicationLifecycle("Ujumbe umetumwa (mfano)", `Kampeni imewekwa sent kwa mfano wa maendeleo.`, "success");
}

export async function fetchCommunicationStats(): Promise<{
  total: number;
  queued: number;
  sent: number;
  failed: number;
  draft: number;
  recipients: number;
  smsCampaigns: number;
  emailCampaigns: number;
}> {
  const c = clientOrThrow();
  const pick = (res: { error: PostgrestError | null; count: number | null }) => {
    if (res.error) throw new Error(formatPostgrestError(res.error, "communications.stats"));
    return res.count ?? 0;
  };

  const [r0, r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    c.from("communications").select("*", { count: "exact", head: true }),
    c.from("communications").select("*", { count: "exact", head: true }).eq("status", "queued"),
    c.from("communications").select("*", { count: "exact", head: true }).eq("status", "sent"),
    c.from("communications").select("*", { count: "exact", head: true }).eq("status", "failed"),
    c.from("communications").select("*", { count: "exact", head: true }).eq("status", "draft"),
    c.from("communication_recipients").select("*", { count: "exact", head: true }),
    c.from("communications").select("*", { count: "exact", head: true }).in("channel", ["sms", "both"]),
    c.from("communications").select("*", { count: "exact", head: true }).in("channel", ["email", "both"]),
  ]);

  return {
    total: pick(r0),
    queued: pick(r1),
    sent: pick(r2),
    failed: pick(r3),
    draft: pick(r4),
    recipients: pick(r5),
    smsCampaigns: pick(r6),
    emailCampaigns: pick(r7),
  };
}

export function readCommunicationPrefill(): CommunicationPrefill | null {
  const raw = safeSessionStorage.get(PREFILL_KEY);
  if (!raw) return null;
  return safeJsonParseObject(raw, {}) as CommunicationPrefill;
}

export function writeCommunicationPrefill(p: CommunicationPrefill): void {
  safeSessionStorage.set(PREFILL_KEY, JSON.stringify(p));
}

export function clearCommunicationPrefill(): void {
  safeSessionStorage.remove(PREFILL_KEY);
}

export type DeliverySummary = {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function fetchDeliverySummary(communicationId: string): Promise<DeliverySummary> {
  const c = clientOrThrow();
  const { data, error } = await c
    .from("communication_recipients")
    .select("delivery_status")
    .eq("communication_id", communicationId);
  if (error) throw new Error(formatPostgrestError(error, "communication_recipients.summary"));
  const sum: DeliverySummary = { pending: 0, sent: 0, failed: 0, skipped: 0 };
  for (const row of data ?? []) {
    const s = String((row as { delivery_status: string }).delivery_status);
    if (s === "pending") sum.pending++;
    else if (s === "sent") sum.sent++;
    else if (s === "failed") sum.failed++;
    else if (s === "skipped") sum.skipped++;
  }
  return sum;
}

/**
 * Anza Edge Function ya kutuma SMS/barua halisi (si siri kwenye browser).
 * Funguo za seva zinapatikana kwenye mazingira ya Supabase / Edge pekee, si kwenye mteja.
 */
export async function invokeSendCommunicationWorkflow(
  communicationId: string,
  opts?: { retryFailed?: boolean }
): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const c = getSupabase();
  if (!c) return { ok: false, error: "Supabase haijasanidiwa." };
  try {
    const { data, error } = await c.functions.invoke("send-communication", {
      body: { communicationId, retryFailed: Boolean(opts?.retryFailed) },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, raw: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Misaada: SMS kwa mwanufaika baada ya idhini */
export async function queueBeneficiaryApprovalSms(params: { beneficiaryName: string; phone: string | null }): Promise<void> {
  const phone = params.phone ? normalizePhone(params.phone) : null;
  if (!phone) return;
  try {
    const { communication } = await queueCommunication({
      title: `Msaada umeidhinishwa — ${params.beneficiaryName}`,
      message: `Habari ${params.beneficiaryName}, ombi lako la msaada limeidhinishwa. Tutawasiliana kwa hatua zinazofuata.`,
      channel: "sms",
      target_type: "individual",
      target_phone: phone,
      scheduled_at: null,
      skipNotification: true,
    });
    await invokeSendCommunicationWorkflow(communication.id);
  } catch {
    /* foleni / Edge Function bado */
  }
}

/** Fedha: arifa kwa wanaoshiriki wa finance baada ya utoaji */
export async function queueFinanceDisbursementNotice(params: { beneficiaryName: string; amountLabel: string }): Promise<void> {
  try {
    const { communication } = await queueCommunication({
      title: `Utoaji wa msaada — ${params.beneficiaryName}`,
      message: `Msaada kwa ${params.beneficiaryName} umetolewa. Kiasi: ${params.amountLabel}.`,
      channel: "email",
      target_type: "role",
      target_role: "finance_admin",
      scheduled_at: null,
      skipNotification: true,
    });
    await invokeSendCommunicationWorkflow(communication.id);
  } catch {
    /* foleni / Edge Function bado */
  }
}

/** Muumini mpya — SMS karibu (ikiwa simu ipo) */
export async function queueMemberWelcomeSms(params: { fullName: string; phone: string | null }): Promise<void> {
  const phone = params.phone ? normalizePhone(params.phone) : null;
  if (!phone) return;
  try {
    const { communication } = await queueCommunication({
      title: `Karibu Kanisani — ${params.fullName}`,
      message: `Habari ${params.fullName}, karibu kwenye rekodi za waumini wa KMKT. Mungu akubariki.`,
      channel: "sms",
      target_type: "individual",
      target_phone: phone,
      scheduled_at: null,
      skipNotification: true,
    });
    await invokeSendCommunicationWorkflow(communication.id);
  } catch {
    /* foleni / Edge Function bado */
  }
}
