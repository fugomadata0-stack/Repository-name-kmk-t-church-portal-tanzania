/** Sehemu ya thamani halisi ya namba (epuka NaN kwenye jumla za KPI / fedha). */
export const safeFiniteNumber = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const safeSumAmount = (rows: any[] | null | undefined, field = "amount_tz") => {
  return (rows ?? []).reduce((sum, row) => sum + safeFiniteNumber(row?.[field]), 0);
};
