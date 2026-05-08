import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  mode: "mock",
  tx: [{ id: "TXN-1001", tarehe: "2026-04-26", mlipaji: "Rehema John", mawasiliano: "0712334455", channel: "M-Pesa", purpose: "Donation", amount: 150000, reference: "MPX123", verification_status: "verified", final_status: "success" }],
  failed: [{ id: "TXN-1002", tarehe: "2026-04-26", mlipaji: "Paul", mawasiliano: "paul@mail.com", channel: "Card", purpose: "Project", amount: 220000, reference: "CRD778", verification_status: "pending", final_status: "failed" }],
  verifyQueue: [{ id: "TXN-1003", tarehe: "2026-04-26", mlipaji: "Neema", mawasiliano: "0755000011", channel: "Airtel Money", purpose: "Zaka", amount: 80000, reference: "AIR123", verification_status: "pending", final_status: "pending" }],
  refunds: [{ id: "RF-001", tx_id: "TXN-0999", requester: "Admin", amount: 120000, reason: "Duplicate", status: "pending", date: "2026-04-26" }],
  settings: [{ key: "mobile_money_api", value: "placeholder" }, { key: "card_gateway", value: "placeholder" }, { key: "callback_url", value: "https://example/callback" }, { key: "verification_timeout", value: "10m" }, { key: "retry_rules", value: "3 retries" }, { key: "notifications", value: "enabled" }],
};

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadPaymentsData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [tx, v, r, settings] = await Promise.all([
    s.from("payment_transactions").select("*").order("created_at", { ascending: false }),
    s.from("payment_verifications").select("*").order("created_at", { ascending: false }),
    s.from("refund_requests").select("*").order("created_at", { ascending: false }),
    s.from("payment_settings").select("*").order("id", { ascending: true }),
  ]);
  if (!tx.error) {
    const all = tx.data || [];
    state.tx = all;
    state.failed = all.filter((x) => x.final_status === "failed");
  }
  if (!v.error) state.verifyQueue = v.data || [];
  if (!r.error) state.refunds = r.data || [];
  if (!settings.error) state.settings = settings.data || [];
}

function arr(k) { return [...state[k]]; }
async function save(k, payload, id = null) {
  if (!useSupabase()) {
    if (id) state[k] = state[k].map((x) => (String(x.id) === String(id) ? { ...x, ...payload } : x));
    else state[k].unshift({ id: payload.id || Date.now(), ...payload });
    return;
  }
  const table = k === "tx" || k === "failed" ? "payment_transactions" : k === "verifyQueue" ? "payment_verifications" : k === "refunds" ? "refund_requests" : "payment_settings";
  const s = getSafeSupabase();
  const q = id ? s.from(table).update(payload).eq("id", id) : s.from(table).insert(payload);
  const { error } = await q; if (error) throw error; await loadPaymentsData();
}
async function del(k, id) {
  if (!useSupabase()) { state[k] = state[k].filter((x) => String(x.id) !== String(id)); return; }
  const table = k === "tx" || k === "failed" ? "payment_transactions" : k === "verifyQueue" ? "payment_verifications" : "refund_requests";
  const { error } = await getSafeSupabase().from(table).delete().eq("id", id); if (error) throw error; await loadPaymentsData();
}
async function clear(k) {
  if (!useSupabase()) { state[k] = []; return; }
  const table = k === "tx" || k === "failed" ? "payment_transactions" : k === "verifyQueue" ? "payment_verifications" : "refund_requests";
  const { error } = await getSafeSupabase().from(table).delete().neq("id", -1); if (error) throw error; await loadPaymentsData();
}

export const getTransactions = () => arr("tx");
export const getFailed = () => arr("failed");
export const getVerifyQueue = () => arr("verifyQueue");
export const getRefunds = () => arr("refunds");
export const getSettings = () => arr("settings");
export const saveTransaction = (p, id) => save("tx", p, id);
export const saveVerification = (p, id) => save("verifyQueue", p, id);
export const saveRefund = (p, id) => save("refunds", p, id);
export const saveSetting = (p, id) => save("settings", p, id);
export const deleteTransaction = (id) => del("tx", id);
export const deleteVerification = (id) => del("verifyQueue", id);
export const deleteRefund = (id) => del("refunds", id);
export const clearTransactions = () => clear("tx");
export const clearVerifications = () => clear("verifyQueue");
export const clearRefunds = () => clear("refunds");

export async function logPaymentActivity(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  await getSafeSupabase().from("payment_logs").insert({ actor_role: role, action, description, payload });
}
