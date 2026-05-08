import { formatPostgrestError } from "../lib/supabaseErrors";
import { parseMoneyTz } from "../lib/money";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import type { FedhaRecord, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase().replace(/\s+/g, "_").replace(/[()/]/g, "");
  if (s === "pending") return "Pending";
  if (s === "inactive") return "Inactive";
  if (s === "archived") return "Archived";
  if (s === "needs_review") return "Needs Review";
  if (s === "draft") return "Draft";
  if (s === "submitted") return "Submitted";
  if (s === "verified") return "Verified";
  if (s === "approved") return "Approved";
  if (s === "posted_to_ledger") return "Posted to Ledger";
  if (s === "locked") return "Locked";
  if (s === "reversed_cancelled" || s === "reversedcancelled") return "Reversed / Cancelled";
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
    Draft: "draft",
    Submitted: "submitted",
    Verified: "verified",
    Approved: "approved",
    "Posted to Ledger": "posted_to_ledger",
    Locked: "locked",
    "Reversed / Cancelled": "reversed_cancelled",
  };
  if (map[raw]) return map[raw];
  const slug = raw.toLowerCase().replace(/\s+/g, "_").replace(/\//g, "_");
  return slug || "active";
}

export function mapFinanceRow(row: Record<string, unknown>): FedhaRecord {
  const amt = row.amount_tz;
  const num =
    typeof amt === "number" ? amt : typeof amt === "string" ? Number(amt) : Number.NaN;
  const kiasi = Number.isFinite(num) ? Math.round(Number(num) * 100) / 100 : 0;

  const ds = row.dayosisi as { jina?: string } | null | undefined;
  const jb = row.church_jimbo as { jina?: string } | null | undefined;
  const tw = row.church_tawi as { jina?: string } | null | undefined;

  const entryDate = row.entry_date ? String(row.entry_date).slice(0, 10) : "";

  return {
    id: String(row.id),
    tarehe: entryDate,
    aina: String(row.aina ?? ""),
    kategoria: String(row.kategoria ?? ""),
    kiasi,
    ngazi: String(row.ngazi ?? ""),
    dayosisi: ds?.jina != null ? String(ds.jina) : "",
    jimbo: jb?.jina != null ? String(jb.jina) : "",
    tawi: tw?.jina != null ? String(tw.jina) : "",
    status: uiStatus(row.status as string),
    dayosisi_id: row.dayosisi_id ? String(row.dayosisi_id) : undefined,
    jimbo_id: row.jimbo_id ? String(row.jimbo_id) : undefined,
    tawi_id: row.tawi_id ? String(row.tawi_id) : undefined,
  };
}

export async function fetchChurchFinanceEntries(limit = 800): Promise<FedhaRecord[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c
    .from("church_finance_entries")
    .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
    .order("entry_date", { ascending: false })
    .limit(limit);
  const rows = unwrapList(res, "church_finance_entries.list");
  return rows.map((r) => mapFinanceRow(r as unknown as Record<string, unknown>));
}

export async function upsertFinanceEntry(row: Partial<FedhaRecord> & { kiasi: number | string }): Promise<FedhaRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const amount =
    typeof row.kiasi === "number" ? row.kiasi : parseMoneyTz(row.kiasi);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Kiasi si sahihi.");

  const aina = String(row.aina ?? "").trim();
  if (!["Mapato", "Matumizi", "Michango", "Nyingine"].includes(aina)) {
    throw new Error('Aina lazima iwe Mapato, Matumizi, Michango, au Nyingine.');
  }

  const payload = {
    entry_date: (row.tarehe ?? "").trim().slice(0, 10) || new Date().toISOString().slice(0, 10),
    aina,
    kategoria: row.kategoria?.trim() || null,
    amount_tz: amount,
    ngazi: row.ngazi?.trim() || null,
    dayosisi_id: row.dayosisi_id && isPersistedUuid(row.dayosisi_id) ? row.dayosisi_id : null,
    jimbo_id: row.jimbo_id && isPersistedUuid(row.jimbo_id) ? row.jimbo_id : null,
    tawi_id: row.tawi_id && isPersistedUuid(row.tawi_id) ? row.tawi_id : null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (row.id && isPersistedUuid(row.id)) {
    const res = await c
      .from("church_finance_entries")
      .update(payload)
      .eq("id", row.id)
      .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
      .single();
    const data = unwrapOrThrow(res, "church_finance_entries.update");
    return mapFinanceRow(data as unknown as Record<string, unknown>);
  }

  const res = await c
    .from("church_finance_entries")
    .insert(payload)
    .select("*, dayosisi ( jina ), church_jimbo ( jina ), church_tawi ( jina )")
    .single();
  const data = unwrapOrThrow(res, "church_finance_entries.insert");
  return mapFinanceRow(data as unknown as Record<string, unknown>);
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isPersistedUuid(id)) return;
  const { error } = await c.from("church_finance_entries").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_finance_entries.delete"));
}

/** Kategoria zilizotumika tayari kwenye DB (kusaidia orodha ya chaguo). */
export async function fetchDistinctFinanceKategoria(): Promise<string[]> {
  const c = getSupabase();
  if (!c) return [];
  const res = await c.from("church_finance_entries").select("kategoria").limit(2000);
  const rows = unwrapList(res, "church_finance_entries.kategoria_distinct");
  const set = new Set<string>();
  for (const r of rows) {
    const k = String((r as { kategoria?: string | null }).kategoria ?? "").trim();
    if (k) set.add(k);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "sw"));
}
