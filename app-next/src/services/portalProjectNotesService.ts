import { formatPostgrestError, isMissingTableError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapMaybe } from "../lib/supabaseResult";

export type PortalProjectNotesRow = {
  id: string;
  singleton_key: string;
  body: string;
  updated_at: string;
  updated_by: string | null;
};

let tableMissing = false;

function mapRow(row: Record<string, unknown>): PortalProjectNotesRow {
  return {
    id: String(row.id ?? ""),
    singleton_key: String(row.singleton_key ?? "default"),
    body: String(row.body ?? ""),
    updated_at: row.updated_at ? String(row.updated_at) : "",
    updated_by: row.updated_by ? String(row.updated_by) : null,
  };
}

export async function fetchPortalProjectNotes(): Promise<PortalProjectNotesRow | null> {
  if (tableMissing) return null;
  const c = getSupabase();
  if (!c) return null;
  const res = await c.from("portal_project_notes").select("id,singleton_key,body,updated_at,updated_by").eq("singleton_key", "default").maybeSingle();
  if (res.error) {
    if (isMissingTableError(res.error)) {
      tableMissing = true;
      return null;
    }
    throw new Error(formatPostgrestError(res.error, "portal_project_notes.fetch"));
  }
  const data = unwrapMaybe(res, "portal_project_notes.fetch");
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function savePortalProjectNotes(body: string): Promise<PortalProjectNotesRow> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const trimmed = body.trimEnd();
  const res = await c
    .from("portal_project_notes")
    .update({ body: trimmed })
    .eq("singleton_key", "default")
    .select("id,singleton_key,body,updated_at,updated_by")
    .maybeSingle();
  if (res.error) {
    if (isMissingTableError(res.error)) {
      tableMissing = true;
      throw new Error("Jedwali la maelezo halipo bado (migration).");
    }
    throw new Error(formatPostgrestError(res.error, "portal_project_notes.save"));
  }
  if (!res.data) {
    throw new Error("Imeshindikana kuhifadhi maelezo (hakuna safu iliyosasishwa au ruhusa imekataliwa).");
  }
  return mapRow(res.data as Record<string, unknown>);
}
