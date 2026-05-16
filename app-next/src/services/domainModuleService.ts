import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { DomainEntityRecord, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDomainEntityUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase().replace(/\s+/g, "_");
  if (s === "pending") return "Pending";
  if (s === "inactive") return "Inactive";
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  return "Active";
}

function dbStatus(ui: Status): string {
  const raw = String(ui).trim();
  const map: Record<string, string> = {
    Active: "active",
    Pending: "pending",
    Inactive: "inactive",
    Archived: "archived",
    "Needs Review": "needs_review",
  };
  if (map[raw]) return map[raw];
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_") || "active";
}

export function mapDomainEntityRow(row: Record<string, unknown>): DomainEntityRecord {
  const ev = row.event_date ? String(row.event_date).slice(0, 10) : "";
  const extra =
    row.extra && typeof row.extra === "object" && row.extra !== null && !Array.isArray(row.extra)
      ? (row.extra as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    module_key: String(row.module_key ?? ""),
    submodule_key: String(row.submodule_key ?? ""),
    title: String(row.title ?? ""),
    details: String(row.details ?? ""),
    category: String(row.category ?? ""),
    reference_code: String(row.reference_code ?? ""),
    event_date: ev,
    extra,
    profile_completeness: Number(row.profile_completeness ?? extra.profile_completeness ?? 0),
    hierarchy_summary: row.hierarchy_summary ? String(row.hierarchy_summary) : String(extra.hierarchy_summary ?? "") || null,
    attachment_urls: Array.isArray(row.attachment_urls)
      ? (row.attachment_urls as unknown[]).map((x) => String(x)).filter(Boolean)
      : Array.isArray(extra.attachment_urls)
      ? (extra.attachment_urls as unknown[]).map((x) => String(x)).filter(Boolean)
      : [],
    category_tags: Array.isArray(row.category_tags)
      ? (row.category_tags as unknown[]).map((x) => String(x)).filter(Boolean)
      : Array.isArray(extra.category_tags)
      ? (extra.category_tags as unknown[]).map((x) => String(x)).filter(Boolean)
      : [],
    status: uiStatus(row.status as string),
  };
}

export async function fetchDomainEntities(
  moduleKey: string,
  opts?: { submoduleKey?: string; contextKey?: string; limit?: number }
): Promise<DomainEntityRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const lim = opts?.limit ?? 500;
  let q = c.from("portal_domain_entities").select("*").eq("module_key", moduleKey).order("updated_at", { ascending: false }).limit(lim);

  if (opts?.contextKey) {
    q = q.eq("submodule_key", opts.contextKey);
  } else if (opts?.submoduleKey && opts.submoduleKey.trim() !== "" && opts.submoduleKey !== "Overview" && opts.submoduleKey !== "Muhtasari") {
    q = q.eq("submodule_key", opts.submoduleKey);
  }

  const res = await q;
  const rows = unwrapList(res, "portal_domain_entities.list");
  return rows.map((r) => mapDomainEntityRow(r as unknown as Record<string, unknown>));
}

export async function upsertDomainEntity(
  row: Partial<DomainEntityRecord> & { module_key: string; title: string }
): Promise<DomainEntityRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const extra = row.extra && typeof row.extra === "object" ? row.extra : {};
  const payload = {
    module_key: row.module_key.trim(),
    submodule_key: row.submodule_key?.trim() ?? "",
    title: row.title.trim(),
    details: row.details?.trim() || null,
    category: row.category?.trim() || null,
    reference_code: row.reference_code?.trim() || null,
    event_date: row.event_date?.trim().slice(0, 10) || null,
    extra,
    profile_completeness:
      typeof row.profile_completeness === "number"
        ? row.profile_completeness
        : typeof extra.profile_completeness === "number"
        ? extra.profile_completeness
        : 0,
    hierarchy_summary: row.hierarchy_summary || (typeof extra.hierarchy_summary === "string" ? extra.hierarchy_summary : null),
    attachment_urls: Array.isArray(row.attachment_urls)
      ? row.attachment_urls
      : Array.isArray(extra.attachment_urls)
      ? extra.attachment_urls
      : [],
    category_tags: Array.isArray(row.category_tags)
      ? row.category_tags
      : Array.isArray(extra.category_tags)
      ? extra.category_tags
      : [],
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (!payload.title) throw new Error("Kichwa kinahitajika.");

  if (row.id && isDomainEntityUuid(row.id)) {
    const res = await c.from("portal_domain_entities").update(payload).eq("id", row.id).select("*").single();
    const data = unwrapOrThrow(res, "portal_domain_entities.update");
    return mapDomainEntityRow(data as unknown as Record<string, unknown>);
  }

  const res = await c.from("portal_domain_entities").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "portal_domain_entities.insert");
  return mapDomainEntityRow(data as unknown as Record<string, unknown>);
}

export async function deleteDomainEntity(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isDomainEntityUuid(id)) return;
  const { error } = await c.from("portal_domain_entities").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "portal_domain_entities.delete"));
}
