import { KMKT_INCOME_CONTRIBUTION_TYPES } from "../data/kmktIncomeContributionTypes";
import { parseMoneyTz } from "./money";

export type ContributionRowDraft = Record<string, string>;

export type ContributionRowValidation = {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  amount: number;
  incomeCode: string;
  receiptNo: string;
};

const TYPE_CODES = new Set(KMKT_INCOME_CONTRIBUTION_TYPES.map((t) => t.code.toUpperCase()));

function t(s: string | undefined): string {
  return String(s ?? "").trim();
}

export function validateContributionRow(
  row: ContributionRowDraft,
  rowIndex: number,
  opts?: {
    existingIncomeCodes?: Set<string>;
    existingReceiptNos?: Set<string>;
    batchIncomeCodes?: Map<string, number>;
    batchReceiptNos?: Map<string, number>;
  }
): ContributionRowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const incomeCode = t(row.incomeCode);
  const sourceName = t(row.sourceName);
  const receiptNo = t(row.receiptNo);
  const typeCode = t(row.contributionTypeCode).toUpperCase();
  const collectionDate = t(row.collectionDate).slice(0, 10);
  const amountRaw = t(row.amount);
  const amount = amountRaw ? parseMoneyTz(amountRaw) : 0;

  if (!incomeCode) errors.push("Income Code linahitajika.");
  if (!sourceName) errors.push("Jina la chanzo linahitajika.");
  if (!collectionDate) errors.push("Tarehe ya ukusanyaji inahitajika.");
  if (amount <= 0) errors.push("Kiasi lazima kiwe zaidi ya 0.");

  if (typeCode && !TYPE_CODES.has(typeCode)) {
    warnings.push(`Msimbo ${typeCode} haujulikani — tumia MCH001–MCH047.`);
  }

  if (incomeCode && opts?.batchIncomeCodes?.has(incomeCode)) {
    errors.push(`Income Code "${incomeCode}" imerudiwa kwenye faili hii (safu ${opts.batchIncomeCodes.get(incomeCode)}).`);
  }
  if (incomeCode && opts?.existingIncomeCodes?.has(incomeCode.toLowerCase())) {
    errors.push(`Income Code "${incomeCode}" tayari ipo kwenye mfumo.`);
  }

  if (receiptNo) {
    if (opts?.batchReceiptNos?.has(receiptNo.toLowerCase())) {
      errors.push(`Risiti "${receiptNo}" imerudiwa kwenye faili hii.`);
    }
    if (opts?.existingReceiptNos?.has(receiptNo.toLowerCase())) {
      errors.push(`Risiti "${receiptNo}" tayari ipo kwenye mfumo.`);
    }
  }

  return {
    rowIndex,
    valid: errors.length === 0,
    errors,
    warnings,
    amount,
    incomeCode,
    receiptNo,
  };
}

export function validateContributionBatch(
  rows: ContributionRowDraft[],
  opts?: {
    existingIncomeCodes?: Set<string>;
    existingReceiptNos?: Set<string>;
  }
): { rows: ContributionRowValidation[]; totalAmount: number; validCount: number; invalidCount: number } {
  const batchIncomeCodes = new Map<string, number>();
  const batchReceiptNos = new Map<string, number>();

  rows.forEach((row, i) => {
    const code = t(row.incomeCode);
    const rcpt = t(row.receiptNo).toLowerCase();
    if (code && !batchIncomeCodes.has(code)) batchIncomeCodes.set(code, i + 2);
    if (rcpt && !batchReceiptNos.has(rcpt)) batchReceiptNos.set(rcpt, i + 2);
  });

  const validated = rows.map((row, i) =>
    validateContributionRow(row, i + 2, {
      ...opts,
      batchIncomeCodes,
      batchReceiptNos,
    })
  );

  const totalAmount = validated.reduce((s, r) => s + (r.valid ? r.amount : 0), 0);
  const validCount = validated.filter((r) => r.valid).length;
  return {
    rows: validated,
    totalAmount,
    validCount,
    invalidCount: validated.length - validCount,
  };
}

/** Linganisha jumla iliyoandikwa kwenye faili (safu ya muhtasari hiari) na jumla ya safu. */
export function checkTotalsAccuracy(
  rowTotal: number,
  declaredTotal?: number | null
): { ok: boolean; message?: string } {
  if (declaredTotal == null || !Number.isFinite(declaredTotal)) return { ok: true };
  const diff = Math.abs(rowTotal - declaredTotal);
  if (diff < 1) return { ok: true };
  return {
    ok: false,
    message: `Jumla iliyotangazwa (${declaredTotal.toLocaleString("sw-TZ")}) hailingani na jumla ya safu (${rowTotal.toLocaleString("sw-TZ")}).`,
  };
}
