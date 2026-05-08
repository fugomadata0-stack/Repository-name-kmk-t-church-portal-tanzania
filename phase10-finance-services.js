import { getSafeSupabase } from "./phase-integration-core.js";
import { emitRealtimeEnterprise } from "./hooks/use-realtime-enterprise.js";

const state = {
  mode: "mock",
  income: [{ id: 1, tarehe: "2026-04-26", aina_mapato: "Sadaka", chanzo: "Ibada Kuu", dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", kiasi: 3200000, payment_method: "Cash", recorded_by: "Finance Officer", status: "approved" }],
  expenses: [{ id: 1, tarehe: "2026-04-26", aina_matumizi: "Huduma", kategoria: "Msaada", dayosisi: "Dar es Salaam", jimbo: "Kati", tawi: "Amani", kiasi: 900000, approved_by: "Admin", status: "pending" }],
  budgets: [{ id: 1, kipindi: "Q2-2026", kategoria: "Makambi", budget: 24000000, used: 11200000, remaining: 12800000, status: "on_track" }],
  approvals: [{ id: 1, reference: "FIN-2026-001", aina: "Income", kiasi: 3200000, submitted_by: "Finance Officer", reviewer: "Admin", stage: "Review", status: "approved", date: "2026-04-26" }],
};

function withAuditColumns(payload = {}, actor = "SYSTEM") {
  const now = new Date().toISOString();
  return {
    ...payload,
    created_at: payload.created_at || now,
    updated_at: now,
    created_by: payload.created_by || actor,
    updated_by: actor,
    status: payload.status || "draft",
    is_archived: Boolean(payload.is_archived),
    archived_at: payload.archived_at || null,
    archived_by: payload.archived_by || null,
  };
}

function notifyFinanceRealtime(action, table) {
  emitRealtimeEnterprise({
    module: "finance",
    table,
    action,
    at: new Date().toISOString(),
  });
}

const useSupabase = () => !!getSafeSupabase();
export const getMode = () => state.mode;

export async function loadFinanceData() {
  if (!useSupabase()) { state.mode = "mock"; return; }
  state.mode = "supabase";
  const s = getSafeSupabase();
  const [tx, budgets, approvals] = await Promise.all([
    s.from("finance_transactions").select("*").order("id", { ascending: false }),
    s.from("finance_budgets").select("*").order("id", { ascending: false }),
    s.from("finance_approvals").select("*").order("id", { ascending: false }),
  ]);
  if (!tx.error) {
    const rows = tx.data || [];
    state.income = rows.filter((x) => x.transaction_type === "income");
    state.expenses = rows.filter((x) => x.transaction_type === "expense");
  }
  if (!budgets.error) state.budgets = budgets.data || [];
  if (!approvals.error) state.approvals = approvals.data || [];
}

const list = (k) => [...state[k]];
async function save(k, payload, editId = null) {
  const normalized = withAuditColumns(payload, payload.updated_by || payload.created_by || "SYSTEM");
  if (!useSupabase()) {
    if (editId) state[k] = state[k].map((r) => (r.id === editId ? { ...r, ...normalized } : r));
    else state[k].unshift({ id: Date.now(), ...normalized });
    notifyFinanceRealtime(editId ? "update" : "insert", k);
    return;
  }
  const s = getSafeSupabase();
  const table = k === "budgets" ? "finance_budgets" : k === "approvals" ? "finance_approvals" : "finance_transactions";
  const q = editId ? s.from(table).update(normalized).eq("id", editId) : s.from(table).insert(normalized);
  const { error } = await q; if (error) throw error; await loadFinanceData();
  notifyFinanceRealtime(editId ? "update" : "insert", table);
}
async function remove(k, id) {
  if (!useSupabase()) {
    state[k] = state[k].map((r) => (r.id === id ? { ...r, status: "deleted", is_archived: true, archived_at: new Date().toISOString() } : r));
    notifyFinanceRealtime("soft_delete", k);
    return;
  }
  const table = k === "budgets" ? "finance_budgets" : k === "approvals" ? "finance_approvals" : "finance_transactions";
  const { error } = await getSafeSupabase().from(table).update({ status: "deleted", is_archived: true, archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  await loadFinanceData();
  notifyFinanceRealtime("soft_delete", table);
}
async function clear(k) {
  if (!useSupabase()) { state[k] = []; return; }
  const table = k === "budgets" ? "finance_budgets" : k === "approvals" ? "finance_approvals" : "finance_transactions";
  const { error } = await getSafeSupabase().from(table).update({ status: "archived", is_archived: true, archived_at: new Date().toISOString() }).neq("id", -1);
  if (error) throw error;
  await loadFinanceData();
  notifyFinanceRealtime("archive_all", table);
}

export const getIncome = () => list("income");
export const getExpenses = () => list("expenses");
export const getBudgets = () => list("budgets");
export const getApprovals = () => list("approvals");
export const saveIncome = (p, id) => save("income", { ...p, transaction_type: "income" }, id);
export const saveExpense = (p, id) => save("expenses", { ...p, transaction_type: "expense" }, id);
export const saveBudget = (p, id) => save("budgets", p, id);
export const saveApproval = (p, id) => save("approvals", p, id);
export const deleteIncome = (id) => remove("income", id);
export const deleteExpense = (id) => remove("expenses", id);
export const deleteBudget = (id) => remove("budgets", id);
export const deleteApproval = (id) => remove("approvals", id);
export const clearIncome = () => clear("income");
export const clearExpense = () => clear("expenses");
export const clearBudgets = () => clear("budgets");
export const clearApprovals = () => clear("approvals");

export function getFinanceMathSummary() {
  const incomeApproved = state.income.filter((x) => x.status === "approved");
  const expenseApproved = state.expenses.filter((x) => x.status === "approved");
  const incomePending = state.income.filter((x) => x.status === "pending");
  const expensePending = state.expenses.filter((x) => x.status === "pending");
  const incomeRejected = state.income.filter((x) => x.status === "rejected");
  const expenseRejected = state.expenses.filter((x) => x.status === "rejected");

  const sum = (rows) => rows.reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const openingBalance = Number(state.budgets[0]?.opening_balance || 0);
  const totalIncome = sum(incomeApproved);
  const totalExpenses = sum(expenseApproved);
  const pendingAmount = sum(incomePending) + sum(expensePending);
  const approvedAmount = totalIncome + totalExpenses;
  const unpaidAmount = sum(incomePending);
  const paidAmount = totalIncome;
  const rejectedAmount = sum(incomeRejected) + sum(expenseRejected);
  const closingBalance = openingBalance + totalIncome - totalExpenses;
  const addition = totalIncome;
  const deduction = totalExpenses;

  const budgetTotal = state.budgets.reduce((s, b) => s + Number(b.budget || 0), 0);
  const actualUsed = state.budgets.reduce((s, b) => s + Number(b.used || 0), 0);
  const remainingBalance = budgetTotal - actualUsed;
  const percentageUsed = budgetTotal > 0 ? Math.round((actualUsed / budgetTotal) * 100) : 0;

  return {
    openingBalance,
    totalIncome,
    totalExpenses,
    closingBalance,
    addition,
    deduction,
    pendingAmount,
    approvedAmount,
    paidAmount,
    unpaidAmount,
    rejectedAmount,
    budgetTotal,
    actualUsed,
    remainingBalance,
    percentageUsed,
    overExpenseWarning: closingBalance < 0,
  };
}

export function financeFilters() {
  const rows = [...state.income, ...state.expenses];
  return {
    dayosisi: [...new Set(rows.map((r) => r.dayosisi).filter(Boolean))],
    jimbo: [...new Set(rows.map((r) => r.jimbo).filter(Boolean))],
    tawi: [...new Set(rows.map((r) => r.tawi).filter(Boolean))],
    status: [...new Set(rows.map((r) => r.status).filter(Boolean))],
    type: [...new Set(rows.map((r) => r.aina_mapato || r.aina_matumizi).filter(Boolean))],
  };
}

export async function logFinanceActivity(role, action, description, payload = {}) {
  if (!useSupabase()) return;
  await getSafeSupabase().from("audit_logs").insert({ actor_role: role, module: "finance", action, description, payload });
}

export async function archiveFinanceRecord(type, id, actor = "SYSTEM") {
  const src = type === "income" ? "income" : type === "expense" ? "expenses" : type === "budget" ? "budgets" : "approvals";
  const row = state[src].find((x) => x.id === id);
  if (!row) return;
  await save(src, { ...row, status: "archived", is_archived: true, archived_at: new Date().toISOString(), archived_by: actor, updated_by: actor }, id);
}

export async function restoreFinanceRecord(type, id, actor = "SYSTEM") {
  const src = type === "income" ? "income" : type === "expense" ? "expenses" : type === "budget" ? "budgets" : "approvals";
  const row = state[src].find((x) => x.id === id);
  if (!row) return;
  await save(src, { ...row, status: "draft", is_archived: false, archived_at: null, archived_by: null, updated_by: actor }, id);
}

export async function submitFinanceRecord(type, id, actor = "SYSTEM") {
  const src = type === "income" ? "income" : type === "expense" ? "expenses" : "approvals";
  const row = state[src].find((x) => x.id === id);
  if (!row) return;
  await save(src, { ...row, status: "submitted", submitted_at: new Date().toISOString(), submitted_by: actor, updated_by: actor }, id);
}

export async function approveFinanceRecord(type, id, actor = "SYSTEM") {
  const src = type === "income" ? "income" : type === "expense" ? "expenses" : "approvals";
  const row = state[src].find((x) => x.id === id);
  if (!row) return;
  await save(src, { ...row, status: "approved", approved_at: new Date().toISOString(), approved_by: actor, updated_by: actor }, id);
}

export async function rejectFinanceRecord(type, id, actor = "SYSTEM") {
  const src = type === "income" ? "income" : type === "expense" ? "expenses" : "approvals";
  const row = state[src].find((x) => x.id === id);
  if (!row) return;
  await save(src, { ...row, status: "rejected", rejected_at: new Date().toISOString(), rejected_by: actor, updated_by: actor }, id);
}
