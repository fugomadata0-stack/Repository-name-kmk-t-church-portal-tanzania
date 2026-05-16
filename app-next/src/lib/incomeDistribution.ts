import {
  KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT,
  type IncomeDistributionMode,
} from "../data/kmktIncomeContributionTypes";

export interface IncomeDistributionSplit {
  mode: IncomeDistributionMode;
  upwardPercent: number;
  amountTotal: number;
  amountLocal: number;
  amountUpward: number;
}

function roundTz(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Gawanya kiasi kilichokusanywa kwa ngazi ya sasa (tawi/jimbo/dayosisi). */
export function computeIncomeDistributionSplit(
  amountTotal: number,
  mode: IncomeDistributionMode,
  upwardPercent = KMKT_DEFAULT_HIERARCHY_SHARE_PERCENT
): IncomeDistributionSplit {
  const total = Math.max(0, roundTz(amountTotal));
  const pct = mode === "full_remittance" ? 100 : Math.min(100, Math.max(0, upwardPercent));
  const amountUpward = roundTz((total * pct) / 100);
  const amountLocal = roundTz(total - amountUpward);
  return {
    mode,
    upwardPercent: pct,
    amountTotal: total,
    amountLocal,
    amountUpward,
  };
}

/** Ngazi zinazopokea mchango kutoka chini: tawi → jimbo → dayosisi → kmkt */
export const NGAZI_REMITTANCE_CHAIN = ["tawi", "jimbo", "dayosisi", "kmkt"] as const;
export type NgaziRemittanceKind = (typeof NGAZI_REMITTANCE_CHAIN)[number];

export function parentNgazi(level: NgaziRemittanceKind): NgaziRemittanceKind | null {
  const i = NGAZI_REMITTANCE_CHAIN.indexOf(level);
  if (i < 0 || i >= NGAZI_REMITTANCE_CHAIN.length - 1) return null;
  return NGAZI_REMITTANCE_CHAIN[i + 1] ?? null;
}

export function ngaziRemittanceLabel(level: NgaziRemittanceKind): string {
  const map: Record<NgaziRemittanceKind, string> = {
    tawi: "Tawi",
    jimbo: "Jimbo",
    dayosisi: "Dayosisi",
    kmkt: "KMK(T) — Makao Makuu",
  };
  return map[level];
}
