import { getSupabaseOrThrow } from "../lib/supabaseClient";
import { safeLower } from "../lib/safe";

export interface DeveloperTaxonomyRow {
  id: string;
  name: string;
}

function normalizeTaxonomyRows(raw: unknown): DeveloperTaxonomyRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? "");
      const name = String(r.name ?? "").trim();
      if (!id || !name) return null;
      return { id, name };
    })
    .filter((x): x is DeveloperTaxonomyRow => !!x);
}

function asErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "").trim();
  }
  return "";
}

function isMissingTableError(error: unknown): boolean {
  const msg = safeLower(asErrorMessage(error));
  return (
    msg.includes("could not find the table") ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("undefined table") ||
    msg.includes("42p01")
  );
}

function throwFriendlyMissingTable(tableName: string, error: unknown): never {
  const msg = safeLower(asErrorMessage(error));
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("networkerror")) {
    throw new Error("Imeshindikana kuwasiliana na seva.");
  }
  if (isMissingTableError(error)) {
    throw new Error("Jedwali husika halijapatikana kwenye Supabase.");
  }
  console.error(`[DeveloperTaxonomy:${tableName}]`, error);
  throw new Error(asErrorMessage(error) || "Imeshindikana kusoma au kuhifadhi data ya taxonomy.");
}

async function fetchRows(tableName: string): Promise<DeveloperTaxonomyRow[]> {
  const client = getSupabaseOrThrow();
  const { data, error } = await client.from(tableName).select("id,name").order("created_at", { ascending: false }).limit(200);
  if (error) {
    // Taxonomy lists are optional; avoid breaking UI when schema cache/table is missing.
    if (isMissingTableError(error)) return [];
    throwFriendlyMissingTable(tableName, error);
  }
  return normalizeTaxonomyRows(data);
}

async function createRow(tableName: string, name: string): Promise<DeveloperTaxonomyRow> {
  const clean = name.trim();
  if (!clean) {
    throw new Error("Jina linahitajika.");
  }
  const client = getSupabaseOrThrow();
  const { data: existing, error: existingErr } = await client
    .from(tableName)
    .select("id,name")
    .ilike("name", clean)
    .limit(1)
    .maybeSingle();
  if (existingErr) throwFriendlyMissingTable(tableName, existingErr);
  if (existing && safeLower(String((existing as { name?: unknown }).name ?? "")) === safeLower(clean)) {
    throw new Error("Taarifa hii tayari ipo.");
  }
  const { data, error } = await client.from(tableName).insert({ name: clean }).select("id,name").single();
  if (error) throwFriendlyMissingTable(tableName, error);
  const rows = normalizeTaxonomyRows(data ? [data] : []);
  if (!rows[0]) throw new Error("Kumbukumbu imehifadhiwa lakini muundo wa data si sahihi.");
  return rows[0];
}

export async function fetchDeveloperTypes(): Promise<DeveloperTaxonomyRow[]> {
  return fetchRows("site_settings_types");
}

export async function createDeveloperType(name: string): Promise<DeveloperTaxonomyRow> {
  return createRow("site_settings_types", name);
}

export async function fetchDeveloperSections(): Promise<DeveloperTaxonomyRow[]> {
  return fetchRows("site_settings_sections");
}

export async function createDeveloperSection(name: string): Promise<DeveloperTaxonomyRow> {
  return createRow("site_settings_sections", name);
}
