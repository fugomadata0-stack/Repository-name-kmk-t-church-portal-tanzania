export const safeSumAmount = (rows: any[] | null | undefined, field = "amount_tz") => {
  return (rows ?? []).reduce((sum, row) => sum + Number(row?.[field] || 0), 0);
};
