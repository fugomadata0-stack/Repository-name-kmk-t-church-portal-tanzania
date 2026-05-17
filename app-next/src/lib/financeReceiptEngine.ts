import { getSupabaseOrThrow } from "./supabaseClient";

/** Nambari ya risiti ya kipekee — RPC au fallback ya ndani. */
export async function generateFinanceReceiptNumber(prefix = "KMKT-RCP"): Promise<string> {
  const c = getSupabaseOrThrow();
  const { data, error } = await c.rpc("portal_generate_finance_receipt_number", {
    p_prefix: prefix,
  });
  if (!error && typeof data === "string" && data.trim()) {
    return data.trim();
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `${prefix}-${stamp}-${rand}`;
}
