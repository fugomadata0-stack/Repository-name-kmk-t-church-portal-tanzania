import { formatPostgrestError } from "../../lib/supabaseErrors";
import { getSupabase } from "../../lib/supabaseClient";
import { unwrapList } from "../../lib/supabaseResult";
import type { NewsPostRecord } from "../../types";
import { removeGalleryFileFromStorage, uploadGalleryImage } from "./galleryService";

function clientOrThrow() {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  return c;
}

function rowToRecord(r: Record<string, unknown>): NewsPostRecord {
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    content: String(r.content ?? ""),
    summary: String(r.summary ?? ""),
    category: String(r.category ?? ""),
    author: String(r.author ?? ""),
    status: (String(r.status ?? "draft") as NewsPostRecord["status"]) ?? "draft",
    publish_date: r.publish_date ? String(r.publish_date) : null,
    is_public: Boolean(r.is_public),
    featured: Boolean(r.featured),
    image_url: r.image_url == null || String(r.image_url) === "" ? null : String(r.image_url),
    created_at: String(r.created_at ?? ""),
  };
}

export async function fetchNewsPosts(): Promise<NewsPostRecord[]> {
  const c = clientOrThrow();
  const res = await c.from("news_posts").select("*").order("created_at", { ascending: false });
  const rows = unwrapList(res, "news_posts.list");
  return rows.map((x) => rowToRecord(x as Record<string, unknown>));
}

export async function upsertNewsPost(
  row: Partial<NewsPostRecord> & { title: string; content: string }
): Promise<NewsPostRecord> {
  const c = clientOrThrow();
  const payload = {
    title: row.title.trim(),
    slug: row.slug?.trim() || null,
    content: row.content.trim(),
    summary: row.summary?.trim() || null,
    category: (row.category ?? "").trim(),
    author: row.author?.trim() || null,
    status: row.status ?? "draft",
    publish_date: row.publish_date || null,
    is_public: Boolean(row.is_public),
    featured: Boolean(row.featured),
    image_url: row.image_url?.trim() || null,
  };
  if (row.id) {
    const { data, error } = await c.from("news_posts").update(payload).eq("id", row.id).select("*").single();
    if (error) throw new Error(formatPostgrestError(error, "news_posts.update"));
    return rowToRecord(data as Record<string, unknown>);
  }
  const { data, error } = await c.from("news_posts").insert(payload).select("*").single();
  if (error) throw new Error(formatPostgrestError(error, "news_posts.insert"));
  return rowToRecord(data as Record<string, unknown>);
}

export async function deleteNewsPost(id: string): Promise<void> {
  const c = clientOrThrow();
  const { error } = await c.from("news_posts").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "news_posts.delete"));
}

export async function uploadNewsFeaturedImage(file: File): Promise<string> {
  const { publicUrl } = await uploadGalleryImage(file, "habari");
  return publicUrl;
}

export async function removeNewsImageIfStored(url: string | null | undefined): Promise<void> {
  if (!url?.trim()) return;
  await removeGalleryFileFromStorage(url);
}
