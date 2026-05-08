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
  const res = await client.from("church_identity").select("*").limit(1).maybeSingle();
  if (res.error) return null;
  return (res.data as ChurchIdentityRow | null) ?? null;
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
  const res = await client.from("church_identity").select("*").limit(1).maybeSingle();
  return unwrapMaybe(res, "church_identity.fetch") as ChurchIdentityRow | null;
}

export async function saveChurchIdentity(payload: Omit<ChurchIdentityRow, "id">): Promise<ChurchIdentityRow> {
  const client = getSupabaseOrThrow();
  const clean = stripUndefined(payload as Record<string, unknown>) as Omit<ChurchIdentityRow, "id">;
  const existingRes = await client.from("church_identity").select("id").limit(1).maybeSingle();
  const existing = unwrapMaybe(existingRes, "church_identity.lookup");
  if (existing?.id != null) {
    const res = await client
      .from("church_identity")
      .update(clean)
      .eq("id", asDbId(existing.id))
      .select("*")
      .single();
    return unwrapOrThrow(res, "church_identity.update") as unknown as ChurchIdentityRow;
  }
  const res = await client.from("church_identity").insert(clean).select("*").single();
  return unwrapOrThrow(res, "church_identity.insert") as unknown as ChurchIdentityRow;
}
