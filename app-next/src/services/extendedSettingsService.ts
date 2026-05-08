import { getSupabaseOrThrow } from "../lib/supabaseClient";
import { asDbId, stripUndefined, unwrapMaybe, unwrapOrThrow } from "../lib/supabaseResult";

export type LocalizationSettingsRow = { id?: string | number; payload: Record<string, unknown>; created_at?: string };
export type NotificationSettingsRow = {
  id?: string | number;
  default_sms_sender: string;
  default_email_sender: string;
  default_priority: string;
  reminder_timings: string;
  retry_count: number | null;
  failure_alerts_toggle: string;
  created_at?: string;
};
export type FinanceSettingsRow = {
  id?: string | number;
  default_currency: string;
  default_payment_methods: string;
  auto_approval_threshold: string;
  receipt_prefix: string;
  finance_year_start: string;
  finance_year_end: string;
  created_at?: string;
};
export type AttendanceSettingsRow = { id?: string | number; payload: Record<string, unknown>; created_at?: string };
export type MediaSettingsRow = { id?: string | number; payload: Record<string, unknown>; created_at?: string };
export type ReportSettingsRow = { id?: string | number; payload: Record<string, unknown>; created_at?: string };
export type BackupSettingsRow = {
  id?: string | number;
  auto_backup_toggle: string;
  backup_frequency: string;
  retention_period: string;
  storage_location: string;
  restore_confirmation_toggle: string;
  created_at?: string;
};
export type SecurityPreferencesRow = { id?: string | number; payload: Record<string, unknown>; created_at?: string };

function normalizePayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function emptyNotification(): Omit<NotificationSettingsRow, "id" | "created_at"> {
  return {
    default_sms_sender: "",
    default_email_sender: "",
    default_priority: "normal",
    reminder_timings: "",
    retry_count: 3,
    failure_alerts_toggle: "on",
  };
}

function emptyFinance(): Omit<FinanceSettingsRow, "id" | "created_at"> {
  return {
    default_currency: "TZS",
    default_payment_methods: "Cash, Bank, Mobile",
    auto_approval_threshold: "",
    receipt_prefix: "RCT-",
    finance_year_start: "",
    finance_year_end: "",
  };
}

function emptyBackup(): Omit<BackupSettingsRow, "id" | "created_at"> {
  return {
    auto_backup_toggle: "off",
    backup_frequency: "weekly",
    retention_period: "90",
    storage_location: "",
    restore_confirmation_toggle: "on",
  };
}

export async function fetchLocalizationSettings(): Promise<LocalizationSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("localization_settings").select("*").limit(1).maybeSingle();
  const row = unwrapMaybe(res, "localization_settings.fetch") as Record<string, unknown> | null;
  if (!row) return null;
  return { id: row.id as string | number, payload: normalizePayload(row.payload), created_at: String(row.created_at ?? "") };
}

export async function saveLocalizationSettings(payload: Record<string, unknown>): Promise<LocalizationSettingsRow> {
  const client = getSupabaseOrThrow();
  const cleanPayload = stripUndefined({ ...payload }) as Record<string, unknown>;
  const existingRes = await client.from("localization_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "localization_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("localization_settings")
      .update({ payload: cleanPayload })
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    const r = unwrapOrThrow(res, "localization_settings.update") as unknown as Record<string, unknown>;
    return { id: r.id as string | number, payload: normalizePayload(r.payload), created_at: String(r.created_at ?? "") };
  }
  const res = await client.from("localization_settings").insert({ payload: cleanPayload }).select("*").single();
  const r = unwrapOrThrow(res, "localization_settings.insert") as unknown as Record<string, unknown>;
  return { id: r.id as string | number, payload: normalizePayload(r.payload), created_at: String(r.created_at ?? "") };
}

export async function fetchNotificationSettings(): Promise<NotificationSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("notification_settings").select("*").limit(1).maybeSingle();
  const row = unwrapMaybe(res, "notification_settings.fetch") as Record<string, unknown> | null;
  if (!row) return null;
  const base = emptyNotification();
  return {
    id: row.id as string | number,
    ...base,
    default_sms_sender: String(row.default_sms_sender ?? base.default_sms_sender),
    default_email_sender: String(row.default_email_sender ?? base.default_email_sender),
    default_priority: String(row.default_priority ?? base.default_priority),
    reminder_timings: String(row.reminder_timings ?? base.reminder_timings),
    retry_count: row.retry_count != null ? Number(row.retry_count) : base.retry_count,
    failure_alerts_toggle: String(row.failure_alerts_toggle ?? base.failure_alerts_toggle),
    created_at: String(row.created_at ?? ""),
  };
}

export async function saveNotificationSettings(payload: Omit<NotificationSettingsRow, "id" | "created_at">): Promise<NotificationSettingsRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined(payload as Record<string, unknown>) as Omit<NotificationSettingsRow, "id" | "created_at">;
  const existingRes = await client.from("notification_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "notification_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("notification_settings")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "notification_settings.update") as unknown as NotificationSettingsRow;
  }
  const res = await client.from("notification_settings").insert(clean).select("*").single();
  return unwrapOrThrow(res, "notification_settings.insert") as unknown as NotificationSettingsRow;
}

export async function fetchFinanceSettings(): Promise<FinanceSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("finance_settings").select("*").limit(1).maybeSingle();
  const row = unwrapMaybe(res, "finance_settings.fetch") as Record<string, unknown> | null;
  if (!row) return null;
  const base = emptyFinance();
  return {
    id: row.id as string | number,
    ...base,
    default_currency: String(row.default_currency ?? base.default_currency),
    default_payment_methods: String(row.default_payment_methods ?? base.default_payment_methods),
    auto_approval_threshold: String(row.auto_approval_threshold ?? ""),
    receipt_prefix: String(row.receipt_prefix ?? base.receipt_prefix),
    finance_year_start: row.finance_year_start ? String(row.finance_year_start).slice(0, 10) : "",
    finance_year_end: row.finance_year_end ? String(row.finance_year_end).slice(0, 10) : "",
    created_at: String(row.created_at ?? ""),
  };
}

export async function saveFinanceSettings(payload: Omit<FinanceSettingsRow, "id" | "created_at">): Promise<FinanceSettingsRow> {
  const client = getSupabaseOrThrow();
  const rowPayload = {
    ...payload,
    finance_year_start: payload.finance_year_start || null,
    finance_year_end: payload.finance_year_end || null,
  };
  const clean = stripUndefined(rowPayload as Record<string, unknown>) as Record<string, unknown>;
  const existingRes = await client.from("finance_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "finance_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("finance_settings")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "finance_settings.update") as unknown as FinanceSettingsRow;
  }
  const res = await client.from("finance_settings").insert(clean).select("*").single();
  return unwrapOrThrow(res, "finance_settings.insert") as unknown as FinanceSettingsRow;
}

async function fetchPayloadTable(table: string, ctx: string): Promise<Record<string, unknown> | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from(table).select("*").limit(1).maybeSingle();
  const row = unwrapMaybe(res, `${ctx}.fetch`) as Record<string, unknown> | null;
  return row;
}

async function savePayloadTable(table: string, ctx: string, payload: Record<string, unknown>): Promise<{ id: string | number; payload: Record<string, unknown> }> {
  const client = getSupabaseOrThrow();
  const cleanPayload = stripUndefined({ ...payload }) as Record<string, unknown>;
  const existingRes = await client.from(table).select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, `${ctx}.lookup`);
  if (existing?.id != null) {
    const res = await client.from(table).update({ payload: cleanPayload }).eq("id", asDbId(existing.id)).select("*").single();
    const r = unwrapOrThrow(res, `${ctx}.update`) as unknown as Record<string, unknown>;
    return { id: r.id as string | number, payload: normalizePayload(r.payload) };
  }
  const res = await client.from(table).insert({ payload: cleanPayload }).select("*").single();
  const r = unwrapOrThrow(res, `${ctx}.insert`) as unknown as Record<string, unknown>;
  return { id: r.id as string | number, payload: normalizePayload(r.payload) };
}

export async function fetchAttendanceSettings(): Promise<AttendanceSettingsRow | null> {
  const row = await fetchPayloadTable("attendance_settings", "attendance_settings");
  if (!row) return null;
  return { id: row.id as string | number, payload: normalizePayload(row.payload), created_at: String(row.created_at ?? "") };
}

export async function saveAttendanceSettings(payload: Record<string, unknown>): Promise<AttendanceSettingsRow> {
  const r = await savePayloadTable("attendance_settings", "attendance_settings", payload);
  return { id: r.id, payload: r.payload };
}

export async function fetchMediaSettings(): Promise<MediaSettingsRow | null> {
  const row = await fetchPayloadTable("media_settings", "media_settings");
  if (!row) return null;
  return { id: row.id as string | number, payload: normalizePayload(row.payload), created_at: String(row.created_at ?? "") };
}

export async function saveMediaSettings(payload: Record<string, unknown>): Promise<MediaSettingsRow> {
  const r = await savePayloadTable("media_settings", "media_settings", payload);
  return { id: r.id, payload: r.payload };
}

export async function fetchReportSettings(): Promise<ReportSettingsRow | null> {
  const row = await fetchPayloadTable("report_settings", "report_settings");
  if (!row) return null;
  return { id: row.id as string | number, payload: normalizePayload(row.payload), created_at: String(row.created_at ?? "") };
}

export async function saveReportSettings(payload: Record<string, unknown>): Promise<ReportSettingsRow> {
  const r = await savePayloadTable("report_settings", "report_settings", payload);
  return { id: r.id, payload: r.payload };
}

export async function fetchBackupSettings(): Promise<BackupSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("backup_settings").select("*").limit(1).maybeSingle();
  const row = unwrapMaybe(res, "backup_settings.fetch") as Record<string, unknown> | null;
  if (!row) return null;
  const base = emptyBackup();
  return {
    id: row.id as string | number,
    ...base,
    auto_backup_toggle: String(row.auto_backup_toggle ?? base.auto_backup_toggle),
    backup_frequency: String(row.backup_frequency ?? base.backup_frequency),
    retention_period: String(row.retention_period ?? base.retention_period),
    storage_location: String(row.storage_location ?? ""),
    restore_confirmation_toggle: String(row.restore_confirmation_toggle ?? base.restore_confirmation_toggle),
    created_at: String(row.created_at ?? ""),
  };
}

export async function saveBackupSettings(payload: Omit<BackupSettingsRow, "id" | "created_at">): Promise<BackupSettingsRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined(payload as Record<string, unknown>) as Omit<BackupSettingsRow, "id" | "created_at">;
  const existingRes = await client.from("backup_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "backup_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("backup_settings")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "backup_settings.update") as unknown as BackupSettingsRow;
  }
  const res = await client.from("backup_settings").insert(clean).select("*").single();
  return unwrapOrThrow(res, "backup_settings.insert") as unknown as BackupSettingsRow;
}

export async function fetchSecurityPreferences(): Promise<SecurityPreferencesRow | null> {
  const row = await fetchPayloadTable("security_preferences", "security_preferences");
  if (!row) return null;
  return { id: row.id as string | number, payload: normalizePayload(row.payload), created_at: String(row.created_at ?? "") };
}

export async function saveSecurityPreferences(payload: Record<string, unknown>): Promise<SecurityPreferencesRow> {
  const r = await savePayloadTable("security_preferences", "security_preferences", payload);
  return { id: r.id, payload: r.payload };
}

export const extendedDefaults = {
  localization: (): Record<string, unknown> => ({
    default_language: "sw",
    fallback_language: "en",
    rtl: false,
    notes: "Badilisha lugha na muundo wa tarehe kwa module zinazotumia localization.",
  }),
  attendance: (): Record<string, unknown> => ({
    default_service_times: "09:00, 11:00",
    track_children: true,
    visitor_registration: true,
  }),
  media: (): Record<string, unknown> => ({
    max_upload_mb: 15,
    allowed_image_formats: "jpg,png,webp",
    compress_images: true,
  }),
  report: (): Record<string, unknown> => ({
    default_export_format: "pdf",
    fiscal_alignment: "TZS",
    include_logo_on_pdf: true,
  }),
  security: (): Record<string, unknown> => ({
    session_timeout_minutes: 60,
    require_mfa_for_finance: false,
    ip_allowlist_enabled: false,
  }),
};
