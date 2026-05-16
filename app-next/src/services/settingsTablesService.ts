import { getSupabase, getSupabaseOrThrow } from "../lib/supabaseClient";
import { asDbId, stripUndefined, unwrapMaybe, unwrapOrThrow } from "../lib/supabaseResult";

export interface SystemSettingsRow {
  id?: string | number;
  system_name: string;
  short_name: string;
  motto: string;
  official_description: string;
  timezone: string;
  default_date_format: string;
  default_currency: string;
  status: string;
}

export interface BrandingSettingsRow {
  id?: string | number;
  logo: string;
  favicon: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  hero_bg: string;
  jesus_image: string;
  bible_image: string;
  church_image: string;
  theme_mode: string;
  footer_text: string;
}

export interface ChurchIdentityRow {
  id?: string | number;
  singleton_key?: string;
  official_church_name: string;
  country: string;
  headquarters: string;
  main_phone: string;
  main_email: string;
  postal_address: string;
  website_url: string;
  vision: string;
  mission: string;
  core_values: string;
  logo_url: string;
  favicon_url: string;
  cover_image_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  facebook_url: string;
  youtube_url: string;
  instagram_url: string;
  whatsapp_url: string;
  region: string;
  district: string;
  gps_coordinates: string;
  google_maps_url: string;
  updated_at?: string;
}

export const DEFAULT_CHURCH_WEBSITE_URL = "https://v0-church-portal-tanzania.vercel.app";

export function emptyChurchIdentity(): Omit<ChurchIdentityRow, "id"> {
  return {
    official_church_name: "",
    country: "Tanzania",
    headquarters: "",
    main_phone: "",
    main_email: "",
    postal_address: "",
    website_url: DEFAULT_CHURCH_WEBSITE_URL,
    vision: "",
    mission: "",
    core_values: "",
    logo_url: "",
    favicon_url: "",
    cover_image_url: "",
    primary_color: "#0B1F3A",
    secondary_color: "#123C69",
    accent_color: "#D4AF37",
    facebook_url: "",
    youtube_url: "",
    instagram_url: "",
    whatsapp_url: "",
    region: "",
    district: "",
    gps_coordinates: "",
    google_maps_url: "",
    updated_at: "",
  };
}

function normalizeChurchIdentity(row: Partial<ChurchIdentityRow> | null): ChurchIdentityRow | null {
  if (!row) return null;
  return {
    ...emptyChurchIdentity(),
    ...row,
    main_email: row.main_email?.trim().replace(/^mailt:/i, "mailto:").replace(/^mailto:/i, "") ?? "",
    website_url: row.website_url?.trim() || DEFAULT_CHURCH_WEBSITE_URL,
    primary_color: row.primary_color?.trim() || "#0B1F3A",
    secondary_color: row.secondary_color?.trim() || "#123C69",
    accent_color: row.accent_color?.trim() || "#D4AF37",
  };
}

/** Kwa dashibodi / fallback — hatua nyeti (haituki Error ikiwa DB haipo) */
export async function fetchSystemSettingsOptional(): Promise<SystemSettingsRow | null> {
  const client = getSupabase();
  if (!client) return null;
  const res = await client.from("system_settings").select("*").limit(1).maybeSingle();
  if (res.error) return null;
  return (res.data as SystemSettingsRow | null) ?? null;
}

export async function fetchChurchIdentityOptional(): Promise<ChurchIdentityRow | null> {
  const client = getSupabase();
  if (!client) return null;
  const defaultRes = await client.from("church_identity").select("*").eq("singleton_key", "default").maybeSingle();
  if (!defaultRes.error) return normalizeChurchIdentity((defaultRes.data as ChurchIdentityRow | null) ?? null);
  const legacyRes = await client.from("church_identity").select("*").order("id", { ascending: true }).limit(1).maybeSingle();
  if (legacyRes.error) return null;
  return normalizeChurchIdentity((legacyRes.data as ChurchIdentityRow | null) ?? null);
}

export async function fetchSystemSettings(): Promise<SystemSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("system_settings").select("*").limit(1).maybeSingle();
  return unwrapMaybe(res, "system_settings.fetch") as SystemSettingsRow | null;
}

export async function saveSystemSettings(payload: Omit<SystemSettingsRow, "id">): Promise<SystemSettingsRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined(payload as Record<string, unknown>) as Omit<SystemSettingsRow, "id">;
  const existingRes = await client.from("system_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "system_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("system_settings")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "system_settings.update") as unknown as SystemSettingsRow;
  }
  const res = await client.from("system_settings").insert(clean).select("*").single();
  return unwrapOrThrow(res, "system_settings.insert") as unknown as SystemSettingsRow;
}

export async function fetchBrandingSettings(): Promise<BrandingSettingsRow | null> {
  const client = getSupabaseOrThrow();
  const res = await client.from("branding_settings").select("*").limit(1).maybeSingle();
  return unwrapMaybe(res, "branding_settings.fetch") as BrandingSettingsRow | null;
}

export async function saveBrandingSettings(payload: Omit<BrandingSettingsRow, "id">): Promise<BrandingSettingsRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined(payload as Record<string, unknown>) as Omit<BrandingSettingsRow, "id">;
  const existingRes = await client.from("branding_settings").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "branding_settings.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("branding_settings")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "branding_settings.update") as unknown as BrandingSettingsRow;
  }
  const res = await client.from("branding_settings").insert(clean).select("*").single();
  return unwrapOrThrow(res, "branding_settings.insert") as unknown as BrandingSettingsRow;
}

export async function fetchChurchIdentity(): Promise<ChurchIdentityRow | null> {
  const client = getSupabaseOrThrow();
  const defaultRes = await client.from("church_identity").select("*").eq("singleton_key", "default").maybeSingle();
  if (!defaultRes.error) return normalizeChurchIdentity(unwrapMaybe(defaultRes, "church_identity.fetch") as ChurchIdentityRow | null);
  const legacyRes = await client.from("church_identity").select("*").order("id", { ascending: true }).limit(1).maybeSingle();
  return normalizeChurchIdentity(unwrapMaybe(legacyRes, "church_identity.fetch_legacy") as ChurchIdentityRow | null);
}

export async function saveChurchIdentity(payload: Omit<ChurchIdentityRow, "id">): Promise<ChurchIdentityRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined({
    ...payload,
    website_url: payload.website_url?.trim() || DEFAULT_CHURCH_WEBSITE_URL,
    main_email: payload.main_email?.trim().replace(/^mailt:/i, "mailto:").replace(/^mailto:/i, ""),
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>) as Omit<ChurchIdentityRow, "id">;
  const existingDefaultRes = await client.from("church_identity").select("id").eq("singleton_key", "default").maybeSingle();
  const existing =
    existingDefaultRes.error && String(existingDefaultRes.error.message ?? "").toLowerCase().includes("singleton_key")
      ? unwrapMaybe(await client.from("church_identity").select("id").order("id", { ascending: true }).limit(1).maybeSingle(), "church_identity.lookup_legacy")
      : unwrapMaybe(existingDefaultRes, "church_identity.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("church_identity")
      .update({ ...clean, singleton_key: "default" })
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return normalizeChurchIdentity(unwrapOrThrow(res, "church_identity.update") as unknown as ChurchIdentityRow) as ChurchIdentityRow;
  }
  const res = await client.from("church_identity").insert({ ...clean, singleton_key: "default" }).select("*").single();
  return normalizeChurchIdentity(unwrapOrThrow(res, "church_identity.insert") as unknown as ChurchIdentityRow) as ChurchIdentityRow;
}
