import { financeRoleAccess, incomeFields, expenseFields } from "./phase10-finance-hooks.js";
import {
  loadFinanceData, getMode, getIncome, getExpenses, getBudgets, getApprovals,
  saveIncome, saveExpense, saveBudget, saveApproval,
  deleteIncome, deleteExpense, deleteBudget, deleteApproval,
  clearIncome, clearExpense, clearBudgets, clearApprovals,
  financeFilters, getFinanceMathSummary, logFinanceActivity,
  submitFinanceRecord, approveFinanceRecord, rejectFinanceRecord, archiveFinanceRecord, restoreFinanceRecord,
} from "./phase10-finance-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";

const el = (id) => document.getElementById(id);
let currentRole = localStorage.getItem("mock_role") || "admin";
const scope = { dayosisi: localStorage.getItem("mock_dayosisi") || "", tawi: localStorage.getItem("mock_tawi") || "" };
let filters = { search: "", dayosisi: "", jimbo: "", tawi: "", type: "", status: "" };
let formMeta = { type: "", id: null };
let deleteMeta = { type: "", id: null };
const can = (a) => !!(financeRoleAccess[currentRole] || financeRoleAccess.member)[a];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (s) => `<span class="status ${String(s || "").toLowerCase()}">${s || "-"}</span>`;
const toCsv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (name, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" })); a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(a.href); };

function inScope(r) {
  if (currentRole === "super_admin" || currentRole === "admin") return true;
  if (currentRole === "askofu_dayosisi") return !scope.dayosisi || r.dayosisi === scope.dayosisi;
  if (currentRole === "mchungaji" || currentRole === "finance_officer") return !scope.tawi || r.tawi === scope.tawi;
  if (currentRole === "member") return r.status === "approved";
  return true;
}
function matches(r) {
  return (!filters.search || `${r.chanzo || ""} ${r.kategoria || ""}`.toLowerCase().includes(filters.search.toLowerCase()))
    && (!filters.dayosisi || r.dayosisi === filters.dayosisi)
    && (!filters.jimbo || r.jimbo === filters.jimbo)
    && (!filters.tawi || r.tawi === filters.tawi)
    && (!filters.type || (r.aina_mapato || r.aina_matumizi) === filters.type)
    && (!filters.status || r.status === filters.status);
}

function renderKpis() {
  const income = getIncome().filter(inScope);
  const expense = getExpenses().filter(inScope);
  const today = new Date().toISOString().slice(0, 10);
  const incomeToday = income.filter((x) => x.tarehe === today).reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const week = income.slice(0, 7).reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const month = income.reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const sadaka = income.filter((x) => x.aina_mapato === "Sadaka").reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const zaka = income.filter((x) => x.aina_mapato === "Zaka").reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const donation = income.filter((x) => x.aina_mapato === "Donation").reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const math = getFinanceMathSummary();
  const used = expense.reduce((s, x) => s + Number(x.kiasi || 0), 0);
  const balance = math.closingBalance;
  const data = [
    ["k1", "Mapato ya Leo", incomeToday, "💰"], ["k2", "Mapato ya Wiki", week, "📅"], ["k3", "Mapato ya Mwezi", month, "📈"], ["k4", "Sadaka", sadaka, "🙏"],
    ["k5", "Zaka", zaka, "🧾"], ["k6", "Donations", donation, "🎁"], ["k7", "Matumizi", used, "💸"], ["k8", "Closing Balance", balance, "⚖️"],
    ["k1", "Opening Balance", math.openingBalance, "🧮"], ["k2", "Pending Amount", math.pendingAmount, "⏳"], ["k3", "Approved Amount", math.approvedAmount, "✅"], ["k4", "Budget Used %", `${math.percentageUsed}%`, "📊"],
  ];
  const fmt = (v) => (typeof v === "number" ? v.toLocaleString() : String(v));
  el("kpiGrid").innerHTML = data.map(([k, l, v, i]) => `<article class="kpi ${k}"><p>${i} ${l}</p><h3>${fmt(v)}</h3></article>`).join("");
  if (math.overExpenseWarning) toast("Warning: Expenses zimezidi available balance.");
}

function renderFilters() {
  const f = financeFilters();
  const s = (k, l, arr) => `<label>${l}<select data-filter="${k}"><option value="">All</option>${arr.map((x) => `<option ${filters[k] === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>`;
  el("filtersBar").innerHTML = `<label>Search<input data-filter="search" value="${filters.search}" /></label>${s("dayosisi","Dayosisi",f.dayosisi)}${s("jimbo","Jimbo",f.jimbo)}${s("tawi","Tawi",f.tawi)}${s("type","Type",f.type)}${s("status","Status",f.status)}`;
}

function rowBtns(type, id) {
  return `<button class="btn tiny" data-row="${type}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-row="${type}" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny" data-row="${type}" data-a="submit" data-id="${id}">Submit</button><button class="btn tiny danger" data-row="${type}" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button><button class="btn tiny" data-row="${type}" data-a="approve" data-id="${id}" ${can("approve") ? "" : "disabled"}>Approve</button><button class="btn tiny" data-row="${type}" data-a="reject" data-id="${id}" ${can("reject") ? "" : "disabled"}>Reject</button><button class="btn tiny" data-row="${type}" data-a="archive" data-id="${id}">Archive</button><button class="btn tiny" data-row="${type}" data-a="restore" data-id="${id}">Restore</button>`;
}

function renderTables() {
  const incomeRows = getIncome().filter((r) => inScope(r) && matches(r));
  el("incomeBody").innerHTML = incomeRows.map((r) => `<tr><td>${r.id}</td><td>${r.tarehe}</td><td>${r.aina_mapato}</td><td>${r.chanzo}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${Number(r.kiasi || 0).toLocaleString()}</td><td>${r.payment_method}</td><td>${r.recorded_by || "-"}</td><td>${badge(r.status)}</td><td>${rowBtns("income", r.id)}</td></tr>`).join("") || `<tr><td colspan="12">No data</td></tr>`;
  const expenseRows = getExpenses().filter((r) => inScope(r) && matches(r));
  el("expenseBody").innerHTML = expenseRows.map((r) => `<tr><td>${r.id}</td><td>${r.tarehe}</td><td>${r.aina_matumizi}</td><td>${r.kategoria}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${Number(r.kiasi || 0).toLocaleString()}</td><td>${r.approved_by || "-"}</td><td>${badge(r.status)}</td><td>${rowBtns("expense", r.id)}</td></tr>`).join("") || `<tr><td colspan="11">No data</td></tr>`;
  el("budgetBody").innerHTML = getBudgets().map((r) => `<tr><td>${r.kipindi}</td><td>${r.kategoria}</td><td>${Number(r.budget || 0).toLocaleString()}</td><td>${Number(r.used || 0).toLocaleString()}</td><td>${Number(r.remaining || 0).toLocaleString()}</td><td>${badge(r.status)}</td><td><button class="btn tiny" data-row="budget" data-a="view" data-id="${r.id}">View</button><button class="btn tiny" data-row="budget" data-a="edit" data-id="${r.id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-row="budget" data-a="delete" data-id="${r.id}" ${can("delete") ? "" : "disabled"}>Delete</button></td></tr>`).join("") || `<tr><td colspan="7">No data</td></tr>`;
  el("approvalBody").innerHTML = getApprovals().map((r) => `<tr><td>${r.reference}</td><td>${r.aina}</td><td>${Number(r.kiasi || 0).toLocaleString()}</td><td>${r.submitted_by}</td><td>${r.reviewer}</td><td>${r.stage}</td><td>${badge(r.status)}</td><td>${r.date}</td><td><button class="btn tiny" data-row="approval" data-a="view" data-id="${r.id}">View</button><button class="btn tiny" data-row="approval" data-a="approve" data-id="${r.id}" ${can("approve") ? "" : "disabled"}>Approve</button><button class="btn tiny" data-row="approval" data-a="reject" data-id="${r.id}" ${can("reject") ? "" : "disabled"}>Reject</button><button class="btn tiny" data-row="approval" data-a="changes" data-id="${r.id}">Request Changes</button></td></tr>`).join("") || `<tr><td colspan="9">No data</td></tr>`;
}

let chartReady = false;
function renderCharts() {
  if (chartReady) return;
  chartReady = true;
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dce8ff" } } }, scales: { x: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,.08)" } }, y: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,.08)" } } } };
  new Chart(el("chartIncomeExpense"), { type: "bar", data: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], datasets: [{ label: "Income", data: [120, 138, 141, 152, 168, 181], backgroundColor: "#2e83ff" }, { label: "Expense", data: [88, 104, 119, 128, 136, 142], backgroundColor: "#d9534f" }] }, options });
  new Chart(el("chartSadaka"), { type: "line", data: { labels: ["W1", "W2", "W3", "W4"], datasets: [{ label: "Sadaka", data: [12, 16, 15, 19], borderColor: "#d8b14a", backgroundColor: "#d8b14a33", fill: true }] }, options });
  new Chart(el("chartZaka"), { type: "line", data: { labels: ["W1", "W2", "W3", "W4"], datasets: [{ label: "Zaka", data: [8, 9, 11, 13], borderColor: "#2ecc71", backgroundColor: "#2ecc7133", fill: true }] }, options });
  new Chart(el("chartDonations"), { type: "doughnut", data: { labels: ["Project A", "Project B", "Project C"], datasets: [{ data: [40, 35, 25], backgroundColor: ["#7a5cff", "#31c48d", "#d8b14a"] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dce8ff" } } } } });
  new Chart(el("chartBranch"), { type: "bar", data: { labels: ["Amani", "Neema", "Tumaini", "Upendo"], datasets: [{ label: "Contribution", data: [38, 31, 22, 18], backgroundColor: "#20a4f3" }] }, options });
  new Chart(el("chartBalance"), { type: "line", data: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], datasets: [{ label: "Balance", data: [32, 34, 22, 24, 32, 39], borderColor: "#f6ad55", backgroundColor: "#f6ad5533", fill: true }] }, options });
}

function openForm(type, row = null) {
  formMeta = { type, id: row?.id || null };
  const cfg = type === "income" ? incomeFields : type === "expense" ? expenseFields : type === "budget" ? [
    { key: "kipindi", label: "Kipindi", required: true }, { key: "kategoria", label: "Kategoria", required: true }, { key: "budget", label: "Budget", type: "number", required: true },
    { key: "used", label: "Used", type: "number", required: true }, { key: "remaining", label: "Remaining", type: "number", required: true }, { key: "status", label: "Status", options: ["on_track", "warning", "over"], required: true },
  ] : [
    { key: "reference", label: "Reference", required: true }, { key: "aina", label: "Aina", required: true }, { key: "kiasi", label: "Kiasi", type: "number", required: true },
    { key: "submitted_by", label: "Submitted By", required: true }, { key: "reviewer", label: "Reviewer", required: true }, { key: "stage", label: "Stage", required: true },
    { key: "status", label: "Status", options: ["pending", "approved", "rejected", "changes_requested"], required: true }, { key: "date", label: "Date", type: "date", required: true },
  ];
  el("formTitle").textContent = `${row ? "Edit" : "Add"} ${type}`;
  el("formBody").innerHTML = cfg.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { type: "", id: null }; el("formError").textContent = ""; }
function askDelete(type, id) { deleteMeta = { type, id }; el("confirmTitle").textContent = `Delete ${type}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteMeta = { type: "", id: null }; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const rawPayload = Object.fromEntries(new FormData(el("formBody")).entries());
  const payload = normalizePayloadByFieldMap(rawPayload, {
    email: { preserveCase: true },
    password: { preserveCase: true },
    phone: { preserveCase: true },
    maelezo: { preserveCase: true },
    notes: { preserveCase: true },
    description: { preserveCase: true },
  });
  try {
    if (formMeta.type === "income") await saveIncome(payload, formMeta.id);
    if (formMeta.type === "expense") await saveExpense(payload, formMeta.id);
    if (formMeta.type === "budget") await saveBudget(payload, formMeta.id);
    if (formMeta.type === "approval") await saveApproval(payload, formMeta.id);
    await logFinanceActivity(currentRole, formMeta.id ? "edit" : "create", `Saved ${formMeta.type}`, payload);
    closeForm(); refresh(); toast("Saved.");
  } catch (e) { toast(e.message || "Save failed."); }
}

async function doDelete() {
  try {
    const { type, id } = deleteMeta;
    if (type === "income") await deleteIncome(id);
    if (type === "expense") await deleteExpense(id);
    if (type === "budget") await deleteBudget(id);
    if (type === "approval") await deleteApproval(id);
    await logFinanceActivity(currentRole, "delete", `Deleted ${type}`, { id });
    closeDelete(); refresh(); toast("Deleted.");
  } catch (e) { toast(e.message || "Delete failed."); }
}

async function setStatus(type, id, status) {
  const src = type === "income" ? getIncome() : type === "expense" ? getExpenses() : getApprovals();
  const row = src.find((x) => x.id === id); if (!row) return;
  const payload = { ...row, status };
  if (type === "income") await saveIncome(payload, id);
  if (type === "expense") await saveExpense(payload, id);
  if (type === "approval") await saveApproval(payload, id);
  await logFinanceActivity(currentRole, status, `${type} set ${status}`, { id });
  refresh();
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  renderKpis(); renderFilters(); renderTables(); renderCharts();
}

const rowTypeMap = { income: "income", expense: "expense", budget: "budget", approval: "approval" };

function bind() {
  el("filtersBar").addEventListener("input", (e) => { const k = e.target.dataset.filter; if (!k) return; filters[k] = e.target.value; renderTables(); });
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action; if (!a) return;
    if (a === "addIncome" && can("add")) openForm("income");
    if (a === "addExpense" && can("add")) openForm("expense");
    if (a === "addBudget" && can("add")) openForm("budget");
    if (a === "clearIncome" && can("clear")) { await clearIncome(); refresh(); }
    if (a === "clearExpense" && can("clear")) { await clearExpense(); refresh(); }
    if (a === "clearBudget" && can("clear")) { await clearBudgets(); refresh(); }
    if (a === "clearApproval" && can("clear")) { await clearApprovals(); refresh(); }
    if (a === "exportIncome" && can("export")) download("finance-income", getIncome());
    if (a === "exportExpense" && can("export")) download("finance-expense", getExpenses());
    if (a === "exportBudget" && can("export")) download("finance-budget", getBudgets());
    if (a === "exportApproval" && can("export")) download("finance-approvals", getApprovals());
    if (a === "print" && can("print")) window.print();
  });
  document.body.addEventListener("click", async (e) => {
    const type = e.target.dataset.row; const a = e.target.dataset.a; const id = Number(e.target.dataset.id); if (!type || !a) return;
    const src = type === "income" ? getIncome() : type === "expense" ? getExpenses() : type === "budget" ? getBudgets() : getApprovals();
    const row = src.find((x) => x.id === id);
    if (a === "view") toast(`Viewing ${type} #${id}`);
    if (a === "edit" && can("edit") && row) openForm(type, row);
    if (a === "delete" && can("delete")) askDelete(type, id);
    if (a === "submit") {
      await submitFinanceRecord(rowTypeMap[type], id, currentRole.toUpperCase());
      await logFinanceActivity(currentRole, "submit", `Submitted ${type}`, { id });
      refresh();
      toast("Record imesubmit.");
    }
    if (a === "approve" && can("approve")) {
      await approveFinanceRecord(rowTypeMap[type], id, currentRole.toUpperCase());
      await logFinanceActivity(currentRole, "approve", `Approved ${type}`, { id });
      await setStatus(type, id, "approved");
      toast("Record imeapprove.");
    }
    if (a === "reject" && can("reject")) {
      await rejectFinanceRecord(rowTypeMap[type], id, currentRole.toUpperCase());
      await logFinanceActivity(currentRole, "reject", `Rejected ${type}`, { id });
      await setStatus(type, id, "rejected");
      toast("Record imereject.");
    }
    if (a === "archive") {
      await archiveFinanceRecord(rowTypeMap[type], id, currentRole.toUpperCase());
      await logFinanceActivity(currentRole, "archive", `Archived ${type}`, { id });
      refresh();
      toast("Record imehifadhiwa (archive).");
    }
    if (a === "restore") {
      await restoreFinanceRecord(rowTypeMap[type], id, currentRole.toUpperCase());
      await logFinanceActivity(currentRole, "restore", `Restored ${type}`, { id });
      refresh();
      toast("Record imerudishwa (restore).");
    }
    if (a === "changes") {
      await setStatus(type, id, "changes_requested");
      toast("Correction request imetumwa.");
    }
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

async function init() {
  installGlobalCrashGuards("phase10_finance");
  await loadFinanceData();
  refresh();
  bind();
}
init();
