import {
  KMKT_INCOME_CONTRIBUTION_TYPES,
  KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT,
} from "../data/kmktIncomeContributionTypes";
import {
  buildContributionFormsExcelBundle,
  CONTRIBUTION_CSV_MAX_BYTES,
  CONTRIBUTION_EXCEL_MAX_BYTES,
  CONTRIBUTION_FORMS_COLUMNS,
} from "../lib/contributionFormsSpec";
import {
  validateContributionBatch,
  type ContributionRowDraft,
  type ContributionRowValidation,
} from "../lib/contributionFormsValidation";
import { mapLabelRowsToKeyRecords, parsePortalExcelDataSheet } from "../lib/excelPortalBulk";
import { parseCsvData } from "../lib/csvPortalBulk";
import { enrichIncomeLineGeo } from "../lib/incomeGeoResolve";
import { parseMoneyTz } from "../lib/money";
import { getSupabaseOrThrow, isSupabaseRealtimeEnabled } from "../lib/supabaseClient";
import type { IncomeManagementRecord, IncomeSourceRecord, Status } from "../types";
import {
  fetchChurchIncomeLines,
  fetchChurchIncomeSources,
  upsertIncomeLine,
  upsertIncomeSource,
} from "./incomeModuleService";
import { syncIncomeLineRemittances } from "../lib/incomeRemittanceSync";

export type ContributionUploadRecord = {
  id: string;
  batch_code: string;
  file_name: string;
  file_kind: "xlsx" | "csv" | "pdf";
  file_hash: string | null;
  file_size_bytes: number;
  row_count: number;
  rows_ok: number;
  rows_fail: number;
  rows_skipped: number;
  total_amount_tz: number;
  validation_json: unknown;
  verification_status: "pending" | "verified" | "rejected" | "partial";
  verified_by: string | null;
  verified_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  notes: string | null;
};

export type ParsedContributionFile = {
  kind: "xlsx" | "csv";
  rows: ContributionRowDraft[];
  labels: string[];
};

function t(s: string | undefined): string {
  return String(s ?? "").trim();
}

export async function fileFingerprint(file: File): Promise<string> {
  try {
    const slice = file.slice(0, Math.min(file.size, 65536));
    const buf = await slice.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}

export function detectContributionFileKind(file: File): "xlsx" | "csv" | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "xlsx";
  if (name.endsWith(".csv")) return "csv";
  return null;
}

export async function parseContributionFile(file: File): Promise<ParsedContributionFile> {
  const kind = detectContributionFileKind(file);
  if (!kind) throw new Error("Aina ya faili: tumia .xlsx au .csv pekee kwa kupakia.");
  const labels = CONTRIBUTION_FORMS_COLUMNS.map((c) => c.label);
  if (kind === "xlsx") {
    const raw = await parsePortalExcelDataSheet(file, labels);
    return { kind, rows: mapLabelRowsToKeyRecords(raw, CONTRIBUTION_FORMS_COLUMNS), labels };
  }
  const raw = await parseCsvData(file, labels);
  return { kind, rows: mapLabelRowsToKeyRecords(raw, CONTRIBUTION_FORMS_COLUMNS), labels };
}

export async function fetchDuplicateKeys(): Promise<{
  incomeCodes: Set<string>;
  receiptNos: Set<string>;
}> {
  const lines = await fetchChurchIncomeLines(3000);
  const incomeCodes = new Set<string>();
  const receiptNos = new Set<string>();
  for (const l of lines) {
    if (l.incomeCode) incomeCodes.add(l.incomeCode.toLowerCase());
    if (l.receiptNo) receiptNos.add(l.receiptNo.toLowerCase());
  }
  return { incomeCodes, receiptNos };
}

export async function checkDuplicateUploadHash(hash: string): Promise<ContributionUploadRecord | null> {
  if (!hash) return null;
  const { data, error } = await getSupabaseOrThrow()
    .from("church_contribution_form_uploads")
    .select("*")
    .eq("file_hash", hash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as ContributionUploadRecord;
}

export async function listContributionUploadHistory(limit = 40): Promise<ContributionUploadRecord[]> {
  const { data, error } = await getSupabaseOrThrow()
    .from("church_contribution_form_uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContributionUploadRecord[];
}

async function resolveIncomeSourceId(
  sourceName: string,
  typeCode: string,
  mainCategory: string,
  sources: IncomeSourceRecord[]
): Promise<string> {
  const nameLow = sourceName.toLowerCase();
  const found = sources.find((s) => s.chanzo.trim().toLowerCase() === nameLow);
  if (found?.id) return found.id;

  const typeMeta = KMKT_INCOME_CONTRIBUTION_TYPES.find((x) => x.code === typeCode.toUpperCase());
  const created = await upsertIncomeSource({
    chanzo: sourceName,
    source_code: typeCode || undefined,
    category: mainCategory || typeMeta?.category || "Michango",
    distributionMode: typeMeta?.defaultDistribution ?? "hierarchy_share",
    upwardSharePercent: typeMeta?.defaultUpwardPercent ?? KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT,
    aina: "Mapato Halisi",
    status: "Active",
  });
  sources.push(created);
  return created.id;
}

function rowToIncomeRecord(
  row: ContributionRowDraft,
  sourceId: string
): Partial<IncomeManagementRecord> {
  const typeMeta = KMKT_INCOME_CONTRIBUTION_TYPES.find(
    (x) => x.code === t(row.contributionTypeCode).toUpperCase()
  );
  const amount = parseMoneyTz(t(row.amount));
  return {
    incomeCode: t(row.incomeCode),
    sourceId,
    sourceName: t(row.sourceName),
    mainCategory: t(row.mainCategory) || typeMeta?.category || "Michango",
    subCategory: typeMeta?.name,
    churchLevel: t(row.churchLevel) || "tawi",
    incomeType: "Cash",
    frequency: "One-time",
    budgeted: "No",
    restrictedFund: "No",
    collectionDate: t(row.collectionDate).slice(0, 10),
    serviceEventDate: t(row.collectionDate).slice(0, 10),
    collectorReceiver: t(row.collectorReceiver),
    receiptNo: t(row.receiptNo),
    amount,
    currency: "TZS",
    status: "Submitted" as Status,
    remarks: t(row.remarks),
    dayosisi_id: t(row.dayosisi_id) || undefined,
    jimbo_id: t(row.jimbo_id) || undefined,
    tawi_id: t(row.tawi_id) || undefined,
    distributionMode: typeMeta?.defaultDistribution ?? "hierarchy_share",
    upwardSharePercent: typeMeta?.defaultUpwardPercent ?? KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT,
  };
}

export async function validateContributionFileRows(
  rows: ContributionRowDraft[]
): Promise<{
  validation: ReturnType<typeof validateContributionBatch>;
  nonEmptyRows: ContributionRowDraft[];
}> {
  const nonEmpty = rows.filter((r) => t(r.incomeCode) || t(r.sourceName) || t(r.amount));
  const dup = await fetchDuplicateKeys();
  const validation = validateContributionBatch(nonEmpty, {
    existingIncomeCodes: dup.incomeCodes,
    existingReceiptNos: dup.receiptNos,
  });
  return { validation, nonEmptyRows: nonEmpty };
}

export type ImportContributionResult = {
  batchId: string;
  batchCode: string;
  ok: number;
  fail: number;
  skipped: number;
  totalAmount: number;
};

export async function importValidatedContributionRows(opts: {
  file: File;
  rows: ContributionRowDraft[];
  validations: ContributionRowValidation[];
  uploadedBy: string;
  onProgress?: (pct: number) => void;
}): Promise<ImportContributionResult> {
  const c = getSupabaseOrThrow();
  const hash = await fileFingerprint(opts.file);
  const dupUpload = await checkDuplicateUploadHash(hash);
  if (dupUpload && dupUpload.verification_status !== "rejected") {
    throw new Error(
      `Faili hii tayari imepakuliwa (${dupUpload.batch_code}). Badilisha faili au wasiliana na msimamizi.`
    );
  }

  const kind = detectContributionFileKind(opts.file);
  if (!kind) throw new Error("Aina ya faili si sahihi.");

  const batchCode = `CF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const validRows = opts.validations.filter((v) => v.valid);
  const totalAmount = validRows.reduce((s, v) => s + v.amount, 0);

  const { data: batchRow, error: batchErr } = await c
    .from("church_contribution_form_uploads")
    .insert({
      batch_code: batchCode,
      file_name: opts.file.name,
      file_kind: kind,
      file_hash: hash,
      file_size_bytes: opts.file.size,
      row_count: opts.rows.length,
      rows_ok: 0,
      rows_fail: 0,
      rows_skipped: opts.rows.length - validRows.length,
      total_amount_tz: totalAmount,
      validation_json: opts.validations,
      verification_status: validRows.length === opts.rows.length ? "pending" : "partial",
      uploaded_by: opts.uploadedBy,
    })
    .select("*")
    .single();

  if (batchErr || !batchRow) throw new Error(batchErr?.message ?? "Imeshindikana kuunda kundi la upakiaji.");

  const batchId = String(batchRow.id);
  const sources = await fetchChurchIncomeSources();
  let ok = 0;
  let fail = 0;

  const pairs = opts.rows
    .map((row, i) => ({ row, v: opts.validations[i] }))
    .filter((p): p is { row: ContributionRowDraft; v: ContributionRowValidation } => Boolean(p.v?.valid));

  for (let i = 0; i < pairs.length; i++) {
    const { row } = pairs[i]!;
    try {
      const sourceId = await resolveIncomeSourceId(
        t(row.sourceName),
        t(row.contributionTypeCode),
        t(row.mainCategory),
        sources
      );
      const merged = await enrichIncomeLineGeo(rowToIncomeRecord(row, sourceId));
      const saved = await upsertIncomeLine(merged);
      await c.from("church_income_lines").update({ upload_batch_id: batchId }).eq("id", saved.id);
      try {
        await syncIncomeLineRemittances(saved);
      } catch {
        /* remittance optional */
      }
      ok++;
    } catch {
      fail++;
    }
    opts.onProgress?.(Math.round(((i + 1) / Math.max(pairs.length, 1)) * 100));
  }

  await c
    .from("church_contribution_form_uploads")
    .update({
      rows_ok: ok,
      rows_fail: fail,
      total_amount_tz: totalAmount,
      verification_status: fail > 0 && ok > 0 ? "partial" : ok > 0 ? "pending" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  return { batchId, batchCode, ok, fail, skipped: opts.rows.length - validRows.length, totalAmount };
}

export async function updateContributionUploadVerification(
  id: string,
  status: "verified" | "rejected" | "pending",
  verifiedBy: string
): Promise<void> {
  const { error } = await getSupabaseOrThrow()
    .from("church_contribution_form_uploads")
    .update({
      verification_status: status,
      verified_by: verifiedBy,
      verified_at: status === "pending" ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeContributionUploadsRealtime(onChange: () => void): () => void {
  if (!isSupabaseRealtimeEnabled()) return () => undefined;
  const c = getSupabaseOrThrow();
  const ch = c
    .channel("contribution-forms-uploads")
    .on("postgres_changes", { event: "*", schema: "public", table: "church_contribution_form_uploads" }, () =>
      onChange()
    )
    .subscribe();
  return () => {
    void c.removeChannel(ch);
  };
}

export function contributionFileGuard(file: File): string | null {
  const kind = detectContributionFileKind(file);
  if (!kind) return "Tumia faili .xlsx au .csv.";
  const max = kind === "xlsx" ? CONTRIBUTION_EXCEL_MAX_BYTES : CONTRIBUTION_CSV_MAX_BYTES;
  if (file.size > max) {
    return kind === "xlsx" ? "Excel: kikomo 5MB." : "CSV: kikomo 2MB.";
  }
  if (file.size <= 0) return "Faili ni tupu.";
  return null;
}

export { buildContributionFormsExcelBundle };
