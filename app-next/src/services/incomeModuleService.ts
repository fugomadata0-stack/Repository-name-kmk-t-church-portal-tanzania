import { dedupeInFlight } from "../lib/inFlightDedupe";
import { formatPostgrestError, isAbortLikeError } from "../lib/supabaseErrors";
import { parseMoneyTz } from "../lib/money";
import { getSupabase } from "../lib/supabaseClient";
import { unwrapList, unwrapOrThrow } from "../lib/supabaseResult";
import { computeIncomeDistributionSplit } from "../lib/incomeDistribution";
import { KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT } from "../data/kmktIncomeContributionTypes";
import type { IncomeDistributionMode, IncomeManagementRecord, IncomeSourceRecord, Status } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isIncomeUuid(id: string): boolean {
  return UUID_RE.test(id);
}

function uiStatus(raw: string | null | undefined): Status {
  const s = String(raw ?? "active").toLowerCase().replace(/\s+/g, "_");
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
  if (s === "reversed_cancelled") return "Reversed / Cancelled";
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

function parseDistributionMode(raw: unknown): IncomeDistributionMode {
  return String(raw ?? "") === "full_remittance" ? "full_remittance" : "hierarchy_share";
}

function parseUpwardPercent(raw: unknown, mode: IncomeDistributionMode): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) return mode === "full_remittance" ? 100 : Math.min(100, Math.max(0, n));
  return mode === "full_remittance" ? 100 : KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT;
}

export function mapIncomeSourceRow(row: Record<string, unknown>): IncomeSourceRecord {
  const aina = String(row.aina ?? "");
  const ok = aina === "Taarifa ya Msingi" ? "Taarifa ya Msingi" : "Mapato Halisi";
  const distributionMode = parseDistributionMode(row.distribution_mode);
  return {
    id: String(row.id),
    chanzo: String(row.chanzo ?? ""),
    source_type: String(row.source_type ?? "custom") === "predefined" ? "predefined" : "custom",
    source_code: String(row.source_code ?? ""),
    category: String(row.category ?? ""),
    subtitle: String(row.subtitle ?? ""),
    frequency: ["Daily", "Weekly", "Monthly", "Quarterly", "Annual", "One-time"].includes(String(row.frequency ?? ""))
      ? (String(row.frequency) as IncomeSourceRecord["frequency"])
      : "Monthly",
    restrictedFund: String(row.restricted_fund ?? "No") === "Yes" ? "Yes" : "No",
    approvalRequired: String(row.approval_required ?? "No") === "Yes" ? "Yes" : "No",
    distributionMode,
    upwardSharePercent: parseUpwardPercent(row.upward_share_percent, distributionMode),
    aina: ok,
    maelezo: String(row.maelezo ?? ""),
    status: uiStatus(row.status as string),
  };
}

export function mapIncomeLineRow(row: Record<string, unknown>): IncomeManagementRecord {
  const amt = row.amount_tz;
  const num = typeof amt === "number" ? amt : typeof amt === "string" ? Number(amt) : Number.NaN;
  const amount = Number.isFinite(num) ? Math.round(Number(num) * 100) / 100 : 0;

  const ic = String(row.income_type ?? "Cash");
  const incomeType =
    ic === "Bank" ||
    ic === "Mobile Money" ||
    ic === "In-kind" ||
    ic === "Transfer" ||
    ic === "Cash"
      ? (ic as IncomeManagementRecord["incomeType"])
      : "Cash";

  const fq = String(row.frequency ?? "One-time");
  const frequency =
    ["Daily", "Weekly", "Monthly", "Quarterly", "Annual", "One-time"].includes(fq)
      ? (fq as IncomeManagementRecord["frequency"])
      : "One-time";

  const cd = row.collection_date ? String(row.collection_date).slice(0, 10) : "";
  const sd = row.service_event_date ? String(row.service_event_date).slice(0, 10) : "";

  return {
    id: String(row.id),
    sourceId: row.source_id ? String(row.source_id) : undefined,
    incomeCode: String(row.income_code ?? ""),
    sourceName: String(row.source_name ?? ""),
    mainCategory: String(row.main_category ?? ""),
    subCategory: String(row.sub_category ?? ""),
    churchLevel: String(row.church_level ?? ""),
    incomeType,
    frequency,
    budgeted: String(row.budgeted ?? "No") === "Yes" ? "Yes" : "No",
    restrictedFund: String(row.restricted_fund ?? "No") === "Yes" ? "Yes" : "No",
    approvalRequired: String(row.approval_required ?? "No") === "Yes" ? "Yes" : "No",
    fundPurpose: String(row.fund_purpose ?? ""),
    collectionDate: cd,
    serviceEventDate: sd,
    collectorReceiver: String(row.collector_receiver ?? ""),
    approvedBy: String(row.approved_by ?? ""),
    receiptNo: String(row.receipt_no ?? ""),
    transactionReference: String(row.transaction_reference ?? ""),
    amount,
    currency: String(row.currency ?? "TZS"),
    status: uiStatus(row.status as string),
    branchCenter: String(row.branch_center ?? ""),
    remarks: String(row.remarks ?? ""),
    dayosisi_id: row.dayosisi_id != null ? String(row.dayosisi_id) : undefined,
    jimbo_id: row.jimbo_id != null ? String(row.jimbo_id) : undefined,
    tawi_id: row.tawi_id != null ? String(row.tawi_id) : undefined,
    distributionMode: row.distribution_mode ? parseDistributionMode(row.distribution_mode) : undefined,
    upwardSharePercent:
      row.upward_share_percent != null
        ? parseUpwardPercent(row.upward_share_percent, parseDistributionMode(row.distribution_mode))
        : undefined,
    amountLocal:
      row.amount_local_tz != null
        ? typeof row.amount_local_tz === "number"
          ? row.amount_local_tz
          : Number(row.amount_local_tz)
        : undefined,
    amountUpward:
      row.amount_upward_tz != null
        ? typeof row.amount_upward_tz === "number"
          ? row.amount_upward_tz
          : Number(row.amount_upward_tz)
        : undefined,
  };
}

export async function fetchChurchIncomeSources(): Promise<IncomeSourceRecord[]> {
  return dedupeInFlight("church_income_sources.list", async () => {
    try {
      const c = getSupabase();
      if (!c) return [];
      const res = await c.from("church_income_sources").select("*").order("chanzo", { ascending: true });
      const rows = unwrapList(res, "church_income_sources.list");
      return rows.map((r) => mapIncomeSourceRow(r as unknown as Record<string, unknown>));
    } catch (err) {
      if (isAbortLikeError(err)) throw err;
      console.error("[IncomeSources:fetch]", err);
      throw new Error("Imeshindikana kupakua source za mapato.");
    }
  });
}

export async function fetchChurchIncomeLines(limit = 1500): Promise<IncomeManagementRecord[]> {
  return dedupeInFlight(`church_income_lines.list:${limit}`, async () => {
    const c = getSupabase();
    if (!c) return [];
    const res = await c
      .from("church_income_lines")
      .select("*")
      .order("collection_date", { ascending: false, nullsFirst: false })
      .limit(limit);
    const rows = unwrapList(res, "church_income_lines.list");
    return rows.map((r) => mapIncomeLineRow(r as unknown as Record<string, unknown>));
  });
}

export async function upsertIncomeSource(row: Partial<IncomeSourceRecord> & { chanzo: string }): Promise<IncomeSourceRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");
  const aina =
    row.aina === "Taarifa ya Msingi" ? "Taarifa ya Msingi" : "Mapato Halisi";
  const distributionMode = parseDistributionMode(row.distributionMode ?? "hierarchy_share");
  const upwardSharePercent = parseUpwardPercent(row.upwardSharePercent, distributionMode);
  const payload = {
    chanzo: row.chanzo.trim(),
    source_type: row.source_type === "predefined" ? "predefined" : "custom",
    source_code: row.source_code?.trim() || null,
    category: row.category?.trim() || null,
    subtitle: row.subtitle?.trim() || null,
    frequency: row.frequency ?? "Monthly",
    restricted_fund: row.restrictedFund ?? "No",
    approval_required: row.approvalRequired ?? "No",
    distribution_mode: distributionMode,
    upward_share_percent: upwardSharePercent,
    aina,
    maelezo: row.maelezo?.trim() || null,
    status: dbStatus(row.status ?? "Active"),
    updated_at: new Date().toISOString(),
  };

  if (row.id && isIncomeUuid(row.id)) {
    const res = await c.from("church_income_sources").update(payload).eq("id", row.id).select("*").single();
    const data = unwrapOrThrow(res, "church_income_sources.update");
    return mapIncomeSourceRow(data as unknown as Record<string, unknown>);
  }
  const res = await c.from("church_income_sources").insert(payload).select("*").single();
  const data = unwrapOrThrow(res, "church_income_sources.insert");
  return mapIncomeSourceRow(data as unknown as Record<string, unknown>);
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isIncomeUuid(id)) return;
  const { error } = await c.from("church_income_sources").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_income_sources.delete"));
}

export async function upsertIncomeLine(row: Partial<IncomeManagementRecord>): Promise<IncomeManagementRecord> {
  const c = getSupabase();
  if (!c) throw new Error("Supabase haijasanidiwa.");

  const amount =
    typeof row.amount === "number" ? row.amount : parseMoneyTz(row.amount ?? "");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Kiasi si sahihi.");

  const itOpts = ["Cash", "Bank", "Mobile Money", "In-kind", "Transfer"] as const;
  const itRaw = String(row.incomeType ?? "Cash");
  const incomeType = (itOpts as readonly string[]).includes(itRaw) ? itRaw : "Cash";
  const fqOpts = ["Daily", "Weekly", "Monthly", "Quarterly", "Annual", "One-time"] as const;
  const fqRaw = String(row.frequency ?? "One-time");
  const frequency = (fqOpts as readonly string[]).includes(fqRaw) ? fqRaw : "One-time";

  const distributionMode = parseDistributionMode(row.distributionMode ?? "hierarchy_share");
  const upwardSharePercent = parseUpwardPercent(row.upwardSharePercent, distributionMode);
  const split = computeIncomeDistributionSplit(amount, distributionMode, upwardSharePercent);

  const payload = {
    source_id: row.sourceId?.trim() || null,
    income_code: String(row.incomeCode ?? "").trim(),
    source_name: String(row.sourceName ?? "").trim(),
    main_category: row.mainCategory?.trim() || null,
    sub_category: row.subCategory?.trim() || null,
    church_level: row.churchLevel?.trim() || null,
    income_type: incomeType,
    frequency,
    budgeted: row.budgeted ?? "No",
    restricted_fund: row.restrictedFund ?? "No",
    approval_required: row.approvalRequired ?? "No",
    fund_purpose: row.fundPurpose?.trim() || null,
    collection_date: row.collectionDate?.trim().slice(0, 10) || null,
    service_event_date: row.serviceEventDate?.trim().slice(0, 10) || null,
    collector_receiver: row.collectorReceiver?.trim() || null,
    approved_by: row.approvedBy?.trim() || null,
    receipt_no: row.receiptNo?.trim() || null,
    transaction_reference: row.transactionReference?.trim() || null,
    amount_tz: amount,
    distribution_mode: distributionMode,
    upward_share_percent: upwardSharePercent,
    amount_local_tz: split.amountLocal,
    amount_upward_tz: split.amountUpward,
    currency: row.currency?.trim() || "TZS",
    status: dbStatus(row.status ?? "Active"),
    branch_center: row.branchCenter?.trim() || null,
    remarks: row.remarks?.trim() || null,
    dayosisi_id: row.dayosisi_id?.trim() || null,
    jimbo_id: row.jimbo_id?.trim() || null,
    tawi_id: row.tawi_id?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (!payload.income_code || !payload.source_name) {
    throw new Error("Income code na jina la chanzo vinahitajika.");
  }
  if (!payload.source_id) throw new Error("Jaza taarifa muhimu.");

  if (row.id && isIncomeUuid(row.id)) {
    try {
      const res = await c.from("church_income_lines").update(payload).eq("id", row.id).select("*").single();
      const data = unwrapOrThrow(res, "church_income_lines.update");
      return mapIncomeLineRow(data as unknown as Record<string, unknown>);
    } catch (err) {
      console.error("[IncomeLine:update]", err);
      throw new Error("Imeshindikana kuhifadhi mapato.");
    }
  }

  try {
    const res = await c.from("church_income_lines").insert(payload).select("*").single();
    const data = unwrapOrThrow(res, "church_income_lines.insert");
    return mapIncomeLineRow(data as unknown as Record<string, unknown>);
  } catch (err) {
    console.error("[IncomeLine:insert]", err);
    throw new Error("Imeshindikana kuhifadhi mapato.");
  }
}

export async function deleteIncomeLine(id: string): Promise<void> {
  const c = getSupabase();
  if (!c || !isIncomeUuid(id)) return;
  const { error } = await c.from("church_income_lines").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error, "church_income_lines.delete"));
}
