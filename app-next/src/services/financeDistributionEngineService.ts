import { exportRowsToExcel } from "../lib/exportHelpers";
import { validateDistributionPercents, validateFinanceSummary } from "../lib/financeDistributionCalculations";
import { generateFinanceReceiptNumber } from "../lib/financeReceiptEngine";
import { getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import {
  fetchFinanceDistributionSummary,
  listIncomeDistributionSettings,
  listIncomeRemittances,
  type FinanceDistributionSummary,
  type IncomeDistributionSetting,
  type IncomeRemittance,
  type Phase1Scope,
} from "./phase1FoundationService";

export type FinanceDistributionBundle = {
  summary: FinanceDistributionSummary;
  settings: IncomeDistributionSetting[];
  remittances: IncomeRemittance[];
  validation: ReturnType<typeof validateFinanceSummary>;
};

export type FinanceDistributionSummaryExtended = FinanceDistributionSummary & {
  direct_kmkt_total?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchFinanceDistributionBundle(
  scope: Phase1Scope,
  entityId: string | null,
  periodStart: string,
  periodEnd: string
): Promise<FinanceDistributionBundle> {
  const [summaryRaw, settings, remittances] = await Promise.all([
    fetchFinanceDistributionSummary(scope, entityId, periodStart, periodEnd),
    listIncomeDistributionSettings(),
    listIncomeRemittancesForPeriod(periodStart, periodEnd, scope, entityId),
  ]);

  const summary: FinanceDistributionSummaryExtended = {
    ...summaryRaw,
    direct_kmkt_total: num((summaryRaw as FinanceDistributionSummaryExtended).direct_kmkt_total),
  };

  const validation = validateFinanceSummary(summary);

  return { summary, settings, remittances, validation };
}

export async function listIncomeRemittancesForPeriod(
  periodStart: string,
  periodEnd: string,
  _scope?: Phase1Scope,
  _entityId?: string | null,
  limit = 200
): Promise<IncomeRemittance[]> {
  const all = await listIncomeRemittances(limit);
  const start = periodStart.slice(0, 10);
  const end = periodEnd.slice(0, 10);
  return all.filter((r) => {
    const ps = (r.period_start ?? r.created_at?.slice(0, 10) ?? start);
    const pe = (r.period_end ?? r.period_start ?? r.created_at?.slice(0, 10) ?? end);
    return ps <= end && pe >= start;
  });
}

export async function upsertDistributionSetting(row: {
  id?: string;
  scope_level: Phase1Scope;
  entity_id?: string | null;
  retain_percent: number;
  upward_percent: number;
  direct_to_kmkt_allowed: boolean;
  notes?: string | null;
}): Promise<IncomeDistributionSetting> {
  const check = validateDistributionPercents(row.retain_percent, row.upward_percent);
  if (!check.valid) throw new Error(check.message ?? "Asilimia si sahihi");

  const payload = {
    scope_level: row.scope_level,
    entity_id: row.entity_id ?? null,
    retain_percent: row.retain_percent,
    upward_percent: row.upward_percent,
    direct_to_kmkt_allowed: row.direct_to_kmkt_allowed,
    notes: row.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const c = getSupabaseOrThrow();
  if (row.id) {
    const { data, error } = await c
      .from("church_income_distribution_settings")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as IncomeDistributionSetting;
  }

  const { data, error } = await c
    .from("church_income_distribution_settings")
    .upsert(payload, { onConflict: "scope_level,entity_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as IncomeDistributionSetting;
}

export async function updateRemittanceApproval(
  id: string,
  approvalStatus: "pending" | "approved" | "rejected" | "cancelled",
  approvedBy?: string | null,
  receiptNumber?: string | null
): Promise<IncomeRemittance> {
  const c = getSupabaseOrThrow();
  const receipt =
    receiptNumber?.trim() ||
    (approvalStatus === "approved" ? await generateFinanceReceiptNumber() : null);

  const { data, error } = await c
    .from("church_income_remittances")
    .update({
      approval_status: approvalStatus,
      approved_by: approvedBy?.trim() || null,
      approved_at: approvalStatus === "approved" ? new Date().toISOString() : null,
      receipt_number: receipt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as IncomeRemittance;
}

export function subscribeFinanceDistributionRealtime(onChange: () => void): () => void {
  if (!isSupabaseRealtimeEnabled()) return () => undefined;
  const c = getSupabaseOrThrow();
  const ch = c
    .channel("finance-distribution-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "church_income_remittances" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "church_income_lines" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "church_finance_entries" }, () => onChange())
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "church_income_distribution_settings" },
      () => onChange()
    )
    .subscribe();
  return () => {
    void c.removeChannel(ch);
  };
}

export async function exportFinanceDistributionExcel(
  summary: FinanceDistributionSummary,
  remittances: IncomeRemittance[],
  basename: string
): Promise<void> {
  const summaryRows: (string | number)[][] = [
    ["Mapato", summary.income_total],
    ["Mapato ya ndani", summary.income_local],
    ["Mapato ya juu", summary.income_upward],
    ["Matumizi", summary.expenses_total],
    ["Salio", summary.balance],
    ["Uhamisho (idhini)", summary.transfers_approved],
    ["Uhamisho (inasubiri)", summary.transfers_pending],
    ["Moja kwa moja KMK(T)", summary.direct_kmkt_total ?? 0],
    ["Kilichobaki", summary.remaining],
  ];
  await exportRowsToExcel(
    basename,
    ["Kipengele", "Kiasi (TZS)"],
    summaryRows,
    { reportTitle: "Usambazaji & Remittance — Finance Distribution" }
  );
  if (remittances.length > 0) {
    await exportRowsToExcel(
      `${basename}-ledger`,
      ["Kutoka", "Kwenda", "Kiasi", "Uhamisho", "Kilichobaki", "Idhini", "Risiti"],
      remittances.map((r) => [
        r.from_level,
        r.to_level,
        r.amount_tz,
        r.transfer_amount_tz,
        r.remaining_amount_tz,
        r.approval_status,
        r.receipt_number ?? "",
      ]),
      { reportTitle: "Daftari la Uhamisho" }
    );
  }
}

export { generateFinanceReceiptNumber };
