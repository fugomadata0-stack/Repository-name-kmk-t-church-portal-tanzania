import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList } from "../lib/supabaseResult";
import type { SermonRecord } from "../types";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): SermonRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    preacher: String(r.preacher ?? ""),
    date: String(r.date ?? ""),
    scripture: String(r.scripture ?? ""),
    media_type: r.media_type === "audio" || r.media_type === "video" ? r.media_type : "video",
    media_url: String(r.media_url ?? ""),
    description: String(r.description ?? ""),
    created_at: String(r.created_at ?? ""),
    status: "Active",
  };
}

export async function fetchSermons(): Promise<SermonRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("sermons").select("*").order("date", { ascending: false });
  const rows = unwrapList(res, "sermons.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertSermon(
  row: Partial<SermonRecord> & {
    title: string;
    media_type: "audio" | "video";
    media_url: string;
  }
): Promise<SermonRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    preacher: String(row.preacher ?? "").trim(),
    date: row.date?.trim() || new Date().toISOString().slice(0, 10),
    scripture: String(row.scripture ?? "").trim(),
    media_type: row.media_type,
    media_url: row.media_url.trim(),
    description: String(row.description ?? "").trim(),
  };
  if (row.id) {
    const { data, error } = await c.from("sermons").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "sermons.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("sermons").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "sermons.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteSermon(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("sermons").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "sermons.delete"));
}
