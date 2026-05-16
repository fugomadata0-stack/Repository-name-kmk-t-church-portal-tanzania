import type { RealtimeChannel } from "@supabase/supabase-js";
import { dispatchPortalReloadMetrics } from "../lib/portalEvents";
import { getSupabase, getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import { stripUndefined, unwrapOrThrow } from "../lib/supabaseResult";

export type NationalLeadershipRoleKey =
  | "askofu_mkuu"
  | "katibu_mkuu"
  | "naibu_katibu_mkuu"
  | "mhasibu_mkuu";

export type NationalLeadershipAttachment = { name: string; url: string };

export interface NationalLeadershipProfileRow {
  role_key: NationalLeadershipRoleKey;
  display_title_sw: string;
  display_title_en: string;
  full_name: string;
  gender: string;
  biography: string;
  leadership_quote: string;
  phone: string;
  whatsapp: string;
  email: string;
  website_url: string;
  country: string;
  region: string;
  district: string;
  ward: string;
  physical_address: string;
  profile_photo_url: string;
  signature_url: string;
  cv_pdf_url: string;
  attachments_json: NationalLeadershipAttachment[];
  status: "active" | "inactive";
  start_date: string | null;
  end_date: string | null;
  term_years: number | null;
  is_visible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const ROLE_ORDER: NationalLeadershipRoleKey[] = [
  "askofu_mkuu",
  "katibu_mkuu",
  "naibu_katibu_mkuu",
  "mhasibu_mkuu",
];

function normalizeAttachments(raw: unknown): NationalLeadershipAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: NationalLeadershipAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (name && url) out.push({ name, url });
  }
  return out;
}

function normalizeRow(row: Record<string, unknown> | null): NationalLeadershipProfileRow | null {
  if (!row) return null;
  const rk = String(row.role_key ?? "");
  if (!ROLE_ORDER.includes(rk as NationalLeadershipRoleKey)) return null;
  const status = row.status === "inactive" ? "inactive" : "active";
  return {
    role_key: rk as NationalLeadershipRoleKey,
    display_title_sw: String(row.display_title_sw ?? ""),
    display_title_en: String(row.display_title_en ?? ""),
    full_name: String(row.full_name ?? ""),
    gender: String(row.gender ?? ""),
    biography: String(row.biography ?? ""),
    leadership_quote: String(row.leadership_quote ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""),
    website_url: String(row.website_url ?? ""),
    country: String(row.country ?? "Tanzania"),
    region: String(row.region ?? ""),
    district: String(row.district ?? ""),
    ward: String(row.ward ?? ""),
    physical_address: String(row.physical_address ?? ""),
    profile_photo_url: String(row.profile_photo_url ?? ""),
    signature_url: String(row.signature_url ?? ""),
    cv_pdf_url: String(row.cv_pdf_url ?? ""),
    attachments_json: normalizeAttachments(row.attachments_json),
    status,
    start_date: row.start_date ? String(row.start_date).slice(0, 10) : null,
    end_date: row.end_date ? String(row.end_date).slice(0, 10) : null,
    term_years: (() => {
      const n = Number(row.term_years);
      return Number.isFinite(n) ? n : null;
    })(),
    is_visible: Boolean(row.is_visible !== false),
    sort_order: Number(row.sort_order ?? 0) || 0,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function nationalLeadershipDisplayTitle(row: NationalLeadershipProfileRow, lang: "sw" | "en" = "sw"): string {
  const sw = row.display_title_sw.trim();
  const en = row.display_title_en.trim();
  if (lang === "en" && en) return en;
  return sw || en;
}

/** Mstari mfupi wa kichwa cha PDF (viongozi wanaonekana tu). */
export function formatNationalLeadershipHeaderSummary(
  rows: NationalLeadershipProfileRow[],
  maxLen = 240
): string | null {
  const line = [...rows]
    .filter((r) => r.is_visible && r.full_name.trim())
    .sort((a, b) => a.sort_order - b.sort_order || a.role_key.localeCompare(b.role_key))
    .map((r) => `${nationalLeadershipDisplayTitle(r, "sw")}: ${r.full_name.trim()}`)
    .join("  ·  ");
  if (!line) return null;
  return line.length > maxLen ? `${line.slice(0, Math.max(0, maxLen - 1))}…` : line;
}

export type NationalLeadershipFetchResult = {
  rows: NationalLeadershipProfileRow[];
  error: { message: string } | null;
};

export async function fetchNationalLeadershipProfilesOptionalResult(): Promise<NationalLeadershipFetchResult> {
  const client = getSupabase();
  if (!client) return { rows: [], error: null };
  const res = await client.from("national_leadership_profiles").select("*").order("sort_order", { ascending: true });
  if (res.error) {
    return { rows: [], error: { message: res.error.message || "Database error" } };
  }
  const rows = (res.data ?? []) as Record<string, unknown>[];
  return {
    rows: rows.map((r) => normalizeRow(r)).filter(Boolean) as NationalLeadershipProfileRow[],
    error: null,
  };
}

export async function fetchNationalLeadershipProfilesOptional(): Promise<NationalLeadershipProfileRow[]> {
  const { rows } = await fetchNationalLeadershipProfilesOptionalResult();
  return rows;
}

export async function fetchNationalLeadershipProfiles(): Promise<NationalLeadershipProfileRow[]> {
  const client = getSupabaseOrThrow();
  const res = await client.from("national_leadership_profiles").select("*").order("sort_order", { ascending: true });
  const data = unwrapOrThrow(res, "national_leadership_profiles.fetch") as Record<string, unknown>[];
  return data.map((r) => normalizeRow(r)).filter(Boolean) as NationalLeadershipProfileRow[];
}

export async function upsertNationalLeadershipProfile(row: NationalLeadershipProfileRow): Promise<NationalLeadershipProfileRow> {
  const client = getSupabaseOrThrow();
  const t = (s: string) => s.trim();
  const sortOrder = Math.min(99, Math.max(0, Math.floor(Number(row.sort_order) || 0)));
  let term = row.term_years;
  if (term != null) {
    const n = Math.floor(Number(term));
    term = Number.isFinite(n) ? Math.min(60, Math.max(0, n)) : null;
  }
  const payload = stripUndefined({
    role_key: row.role_key,
    display_title_sw: t(row.display_title_sw),
    display_title_en: t(row.display_title_en),
    full_name: t(row.full_name),
    gender: t(row.gender),
    biography: t(row.biography),
    leadership_quote: t(row.leadership_quote),
    phone: t(row.phone),
    whatsapp: t(row.whatsapp),
    email: t(row.email),
    website_url: t(row.website_url),
    country: t(row.country) || "Tanzania",
    region: t(row.region),
    district: t(row.district),
    ward: t(row.ward),
    physical_address: t(row.physical_address),
    profile_photo_url: t(row.profile_photo_url),
    signature_url: t(row.signature_url),
    cv_pdf_url: t(row.cv_pdf_url),
    attachments_json: row.attachments_json,
    status: row.status,
    start_date: row.start_date || null,
    end_date: row.end_date || null,
    term_years: term,
    is_visible: row.is_visible,
    sort_order: sortOrder,
  } as Record<string, unknown>);
  const res = await client.from("national_leadership_profiles").upsert(payload, { onConflict: "role_key" }).select("*").single();
  const saved = normalizeRow(unwrapOrThrow(res, "national_leadership_profiles.upsert") as Record<string, unknown>) as NationalLeadershipProfileRow;
  dispatchPortalReloadMetrics({ immediate: true });
  return saved;
}

export function subscribeNationalLeadershipProfiles(onChange: () => void): RealtimeChannel | null {
  const client = getSupabase();
  if (!client || !isSupabaseRealtimeEnabled()) return null;
  return client
    .channel("national_leadership_profiles")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "national_leadership_profiles" },
      () => onChange()
    )
    .subscribe();
}
