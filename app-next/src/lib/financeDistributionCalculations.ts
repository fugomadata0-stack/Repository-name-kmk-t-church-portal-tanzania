import type { FinanceDistributionSummary } from "../services/phase1FoundationService";

function roundTz(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Thibitisha jumla za RPC — salio na kilichobaki. */
export function validateFinanceSummary(s: FinanceDistributionSummary): {
  valid: boolean;
  balanceCheck: number;
  remainingCheck: number;
} {
  const income = s.income_total ?? 0;
  const expenses = s.expenses_total ?? 0;
  const transfers = s.transfers_approved ?? 0;
  const expectedBalance = roundTz(income - expenses);
  const balanceCheck = roundTz((s.balance ?? 0) - expectedBalance);
  const incomeLocal = s.income_local ?? 0;
  const expectedRemaining = roundTz(Math.max(incomeLocal - transfers, expectedBalance - transfers));
  const remainingCheck = roundTz((s.remaining ?? 0) - expectedRemaining);
  const valid = Math.abs(balanceCheck) < 1 && Math.abs(remainingCheck) < 1;
  return { valid, balanceCheck, remainingCheck };
}

export type DistributionHopPreview = {
  from: string;
  to: string;
  amount: number;
  retainAtFrom: number;
};

/** Hakiki retain + upward = 100 kwa kila ngazi. */
export function validateDistributionPercents(
  retain: number,
  upward: number
): { valid: boolean; message?: string } {
  const sum = roundTz(retain + upward);
  if (Math.abs(sum - 100) > 0.01) {
    return {
      valid: false,
      message: `Retain + Upward lazima iwe 100% (sasa ${sum}%)`,
    };
  }
  if (retain < 0 || retain > 100 || upward < 0 || upward > 100) {
    return { valid: false, message: "Asilimia lazima iwe 0–100" };
  }
  return { valid: true };
}
