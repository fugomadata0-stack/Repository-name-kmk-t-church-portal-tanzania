import { formatCaughtError, formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { dispatchMasterSettingsUpdated } from "../lib/portalEvents";
import { getSupabase, getSupabaseOrThrow } from "../lib/supabaseClient";
import { safeStorage } from "../lib/security";

export const MASTER_SETTINGS_CACHE_KEY = "kmkt_master_settings_cache_v2";
export const DEFAULT_MASTER_WEBSITE_URL = "https://v0-church-portal-tanzania.vercel.app";
let masterSettingsTablesMissing = false;

export interface MasterIdentitySettings {
  official_name: string;
  short_name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  timezone: string;
  registration_info: string;
  official_seal_text: string;
  language_primary: string;
  language_secondary: string;
  language_ratio_sw: number;
  language_ratio_en: number;
  show_kpi_cards: boolean;
  default_date_range_days: number;
  default_hierarchy_filter: string;
  dashboard_refresh_interval_sec: number;
  system_footer: string;
}

export interface MasterThemeSettings {
  logo_url: string;
  favicon_url: string;
  letterhead_url: string;
  signature_image_url: string;
  seal_image_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  pdf_header_text: string;
  excel_header_text: string;
  print_header_text: string;
}

export interface MasterTemplateSettings {
  email_welcome: string;
  email_password_reset: string;
  email_signup_approval: string;
  email_finance_receipt: string;
  email_document_approval: string;
  sms_alert: string;
  notification_message: string;
}

export interface MasterSettingsRow {
  identity: MasterIdentitySettings;
  theme: MasterThemeSettings;
  templates: MasterTemplateSettings;
  updated_at?: string;
}

export function emptyMasterSettings(): MasterSettingsRow {
  return {
    identity: {
      official_name: "KANISA LA MENNONITE LA KIINJILI TANZANIA",
      short_name: "KMK(T)",
      motto: "",
      address: "",
      phone: "",
      email: "",
      website: DEFAULT_MASTER_WEBSITE_URL,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
      registration_info: "",
      official_seal_text: "",
      language_primary: "sw",
      language_secondary: "en",
      language_ratio_sw: 70,
      language_ratio_en: 30,
      show_kpi_cards: true,
      default_date_range_days: 30,
      default_hierarchy_filter: "ALL",
      dashboard_refresh_interval_sec: 60,
      system_footer: "KMK(T) Tanzania",
    },
    theme: {
      logo_url: "",
      favicon_url: "",
      letterhead_url: "",
      signature_image_url: "",
      seal_image_url: "",
      primary_color: "#0B1F3A",
      secondary_color: "#123C69",
      accent_color: "#D4AF37",
      background_color: "#FFFFFF",
      text_color: "#0F172A",
      pdf_header_text: "",
      excel_header_text: "",
      print_header_text: "",
    },
    templates: {
      email_welcome: "Karibu {name}, akaunti yako ya KMK(T) iko tayari.",
      email_password_reset: "Bonyeza kiungo hiki kubadili nenosiri lako: {reset_link}",
      email_signup_approval: "Ombi lako la usajili limekubaliwa. Karibu KMK(T).",
      email_finance_receipt: "Tumepokea malipo yako. Kumbukumbu: {receipt_no}",
      email_document_approval: "Nyaraka yako imekaguliwa na kukubaliwa.",
      sms_alert: "Tahadhari: {message}",
      notification_message: "Una taarifa mpya kwenye portal ya KMK(T).",
    },
  };
}

function mergeSettings(raw: Partial<MasterSettingsRow> | null): MasterSettingsRow {
  const base = emptyMasterSettings();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    identity: { ...base.identity, ...(raw.identity ?? {}) },
    theme: { ...base.theme, ...(raw.theme ?? {}) },
    templates: { ...base.templates, ...(raw.templates ?? {}) },
  };
}

function writeCache(row: MasterSettingsRow): void {
  safeStorage.set(MASTER_SETTINGS_CACHE_KEY, JSON.stringify(row));
}

export function readMasterSettingsCache(): MasterSettingsRow {
  const raw = safeStorage.get(MASTER_SETTINGS_CACHE_KEY);
  if (!raw) return emptyMasterSettings();
  try {
    const parsed = JSON.parse(raw) as Partial<MasterSettingsRow>;
    return mergeSettings(parsed);
  } catch {
    return emptyMasterSettings();
  }
}

async function fetchFromTables(client: ReturnType<typeof getSupabaseOrThrow>): Promise<MasterSettingsRow> {
  const [masterRes, themeRes, tplRes] = await Promise.all([
    client.from("portal_master_settings").select("*").eq("singleton_key", "default").maybeSingle(),
    client.from("portal_theme_settings").select("*").eq("singleton_key", "default").maybeSingle(),
    client.from("portal_template_settings").select("*").eq("singleton_key", "default").maybeSingle(),
  ]);

  if (masterRes.error) throw new Error(formatPostgrestError(masterRes.error, "portal_master_settings.fetch"));
  if (themeRes.error) throw new Error(formatPostgrestError(themeRes.error, "portal_theme_settings.fetch"));
  if (tplRes.error) throw new Error(formatPostgrestError(tplRes.error, "portal_template_settings.fetch"));

  const merged = mergeSettings({
    identity: (masterRes.data ?? undefined) as MasterIdentitySettings | undefined,
    theme: (themeRes.data ?? undefined) as MasterThemeSettings | undefined,
    templates: (tplRes.data ?? undefined) as MasterTemplateSettings | undefined,
    updated_at: String(masterRes.data?.updated_at ?? themeRes.data?.updated_at ?? tplRes.data?.updated_at ?? ""),
  });

  writeCache(merged);
  return merged;
}

export async function fetchMasterSettingsOptional(): Promise<MasterSettingsRow | null> {
  const c = getSupabase();
  if (!c) return null;
  if (masterSettingsTablesMissing) return readMasterSettingsCache();
  try {
    return await fetchFromTables(c as ReturnType<typeof getSupabaseOrThrow>);
  } catch (e) {
    if (isMissingTableError((e as { cause?: unknown })?.cause as any) || String((e as Error)?.message ?? "").toLowerCase().includes("does not exist")) {
      masterSettingsTablesMissing = true;
      return readMasterSettingsCache();
    }
    return readMasterSettingsCache();
  }
}

export async function fetchMasterSettings(): Promise<MasterSettingsRow> {
  const c = getSupabaseOrThrow();
  return fetchFromTables(c);
}

/** Pakua mipangilio kutoka Supabase na sasisha localStorage — tumia baada ya Realtime au kabla ya chapishi. */
export async function refreshMasterSettingsCache(): Promise<MasterSettingsRow> {
  const row = await fetchMasterSettingsOptional();
  const merged = row ?? readMasterSettingsCache();
  dispatchMasterSettingsUpdated();
  return merged;
}

export async function saveMasterSettings(payload: MasterSettingsRow): Promise<MasterSettingsRow> {
  const c = getSupabaseOrThrow();
  const clean = mergeSettings(payload);

  const [m, t, p] = await Promise.all([
    c
      .from("portal_master_settings")
      .upsert({ singleton_key: "default", ...clean.identity }, { onConflict: "singleton_key" })
      .select("*")
      .single(),
    c
      .from("portal_theme_settings")
      .upsert({ singleton_key: "default", ...clean.theme }, { onConflict: "singleton_key" })
      .select("*")
      .single(),
    c
      .from("portal_template_settings")
      .upsert({ singleton_key: "default", ...clean.templates }, { onConflict: "singleton_key" })
      .select("*")
      .single(),
  ]);

  if (m.error) throw new Error(formatPostgrestError(m.error, "portal_master_settings.save"));
  if (t.error) throw new Error(formatPostgrestError(t.error, "portal_theme_settings.save"));
  if (p.error) throw new Error(formatPostgrestError(p.error, "portal_template_settings.save"));

  const merged = mergeSettings({
    identity: (m.data ?? undefined) as MasterIdentitySettings | undefined,
    theme: (t.data ?? undefined) as MasterThemeSettings | undefined,
    templates: (p.data ?? undefined) as MasterTemplateSettings | undefined,
    updated_at: String(m.data?.updated_at ?? t.data?.updated_at ?? p.data?.updated_at ?? ""),
  });

  writeCache(merged);
  dispatchMasterSettingsUpdated();
  return merged;
}

export function validateHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(String(value ?? "").trim());
}

export function validateEmail(value: string): boolean {
  const v = String(value ?? "").trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function validatePhone(value: string): boolean {
  const v = String(value ?? "").trim();
  if (!v) return true;
  return /^[+]?[-0-9()\s]{7,20}$/.test(v);
}

export function normalizeSettingsError(err: unknown): string {
  return formatCaughtError(err);
}

