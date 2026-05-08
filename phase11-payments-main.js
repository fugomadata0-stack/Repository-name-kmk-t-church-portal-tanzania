import { paymentRoleAccess, paymentFields } from "./phase11-payments-hooks.js";
import {
  loadPaymentsData, getMode, getTransactions, getFailed, getVerifyQueue, getRefunds, getSettings,
  saveTransaction, saveVerification, saveRefund, saveSetting,
  deleteTransaction, deleteVerification, deleteRefund,
  clearTransactions, clearVerifications, clearRefunds,
  logPaymentActivity,
} from "./phase11-payments-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let currentRole = localStorage.getItem("mock_role") || "admin";
let formMeta = { id: null };
let deleteMeta = { type: "", id: null };
const can = (k) => !!(paymentRoleAccess[currentRole] || paymentRoleAccess.member)[k];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (v) => `<span class="status ${String(v || "").toLowerCase()}">${v || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (n, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${n}.csv`; a.click(); URL.revokeObjectURL(a.href); };

function renderKpis() {
  const tx = getTransactions();
  const today = new Date().toISOString().slice(0, 10);
  const paymentsToday = tx.filter((x) => x.tarehe === today).reduce((s, x) => s + Number(x.amount || 0), 0);
  const success = tx.filter((x) => x.final_status === "success").length;
  const pending = tx.filter((x) => x.verification_status === "pending").length;
  const failed = tx.filter((x) => x.final_status === "failed").length;
  const donations = tx.filter((x) => x.purpose === "Donation" && x.tarehe === today).reduce((s, x) => s + Number(x.amount || 0), 0);
  const mm = tx.filter((x) => ["M-Pesa", "Airtel Money", "Tigo Pesa", "HaloPesa"].includes(x.channel)).reduce((s, x) => s + Number(x.amount || 0), 0);
  const card = tx.filter((x) => x.channel === "Card").reduce((s, x) => s + Number(x.amount || 0), 0);
  const refunds = getRefunds().filter((x) => x.status === "pending").length;
  const data = [
    ["k1", "Payments Today", paymentsToday], ["k2", "Successful Transactions", success], ["k3", "Pending Verification", pending], ["k4", "Failed Transactions", failed],
    ["k5", "Donations Today", donations], ["k6", "Mobile Money Total", mm], ["k7", "Card Payments Total", card], ["k8", "Refund Requests", refunds],
  ];
  el("kpiGrid").innerHTML = data.map(([k, l, v]) => `<article class="kpi ${k}"><p>${l}</p><h3>${Number(v).toLocaleString()}</h3></article>`).join("");
}

function txButtons(id) {
  return `<button class="btn tiny" data-type="tx" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-type="tx" data-a="verify" data-id="${id}" ${can("verify") ? "" : "disabled"}>Verify</button><button class="btn tiny" data-type="tx" data-a="success" data-id="${id}" ${can("verify") ? "" : "disabled"}>Mark Success</button><button class="btn tiny" data-type="tx" data-a="failed" data-id="${id}" ${can("verify") ? "" : "disabled"}>Mark Failed</button><button class="btn tiny" data-type="tx" data-a="refund" data-id="${id}" ${can("refund") ? "" : "disabled"}>Refund</button><button class="btn tiny danger" data-type="tx" data-a="delete" data-id="${id}" ${can("edit") ? "" : "disabled"}>Delete</button>`;
}
function queueButtons(type, id) {
  return `<button class="btn tiny" data-type="${type}" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-type="${type}" data-a="verify" data-id="${id}" ${can("verify") ? "" : "disabled"}>Verify</button><button class="btn tiny" data-type="${type}" data-a="approve" data-id="${id}" ${can("verify") ? "" : "disabled"}>Approve</button><button class="btn tiny" data-type="${type}" data-a="reject" data-id="${id}" ${can("verify") ? "" : "disabled"}>Reject</button><button class="btn tiny" data-type="${type}" data-a="retry" data-id="${id}">Retry</button><button class="btn tiny danger" data-type="${type}" data-a="delete" data-id="${id}" ${can("edit") ? "" : "disabled"}>Delete</button>`;
}

function renderTables() {
  el("txBody").innerHTML = getTransactions().map((r) => `<tr><td>${r.id}</td><td>${r.tarehe}</td><td>${r.mlipaji}</td><td>${r.mawasiliano}</td><td>${r.channel}</td><td>${r.purpose}</td><td>${Number(r.amount || 0).toLocaleString()}</td><td>${r.reference}</td><td>${badge(r.verification_status)}</td><td>${badge(r.final_status)}</td><td>${txButtons(r.id)}</td></tr>`).join("") || `<tr><td colspan="11">No data</td></tr>`;
  el("failedBody").innerHTML = getFailed().map((r) => `<tr><td>${r.id}</td><td>${r.mlipaji}</td><td>${r.channel}</td><td>${Number(r.amount || 0).toLocaleString()}</td><td>${badge(r.final_status)}</td><td>${queueButtons("failed", r.id)}</td></tr>`).join("") || `<tr><td colspan="6">No data</td></tr>`;
  el("verifyBody").innerHTML = getVerifyQueue().map((r) => `<tr><td>${r.id}</td><td>${r.mlipaji || "-"}</td><td>${r.reference || "-"}</td><td>${badge(r.verification_status || r.status)}</td><td>${queueButtons("verify", r.id)}</td></tr>`).join("") || `<tr><td colspan="5">No data</td></tr>`;
  el("refundBody").innerHTML = getRefunds().map((r) => `<tr><td>${r.id}</td><td>${r.tx_id}</td><td>${r.requester}</td><td>${Number(r.amount || 0).toLocaleString()}</td><td>${badge(r.status)}</td><td>${queueButtons("refund", r.id)}</td></tr>`).join("") || `<tr><td colspan="6">No data</td></tr>`;
}

function renderSettings() {
  el("settingsGrid").innerHTML = getSettings().map((s) => `<article class="setting-card"><h4>${s.key.replaceAll("_", " ")}</h4><p>${s.value}</p><button class="btn tiny" data-type="setting" data-a="edit" data-id="${s.id || s.key}">Edit</button></article>`).join("");
}

function openForm(row = null) {
  formMeta = { id: row?.id || null };
  el("formTitle").textContent = `${row ? "Edit" : "Add"} Payment`;
  el("formBody").innerHTML = paymentFields.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { id: null }; el("formError").textContent = ""; }
function askDelete(type, id) { deleteMeta = { type, id }; el("confirmTitle").textContent = `Delete ${type}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteMeta = { type: "", id: null }; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const payload = Object.fromEntries(new FormData(el("formBody")).entries());
  try {
    await saveTransaction(payload, formMeta.id);
    await logPaymentActivity(currentRole, formMeta.id ? "edit" : "create", "Saved payment", payload);
    closeForm(); refresh(); toast("Saved.");
  } catch (e) { toast(e.message || "Save failed"); }
}

async function doDelete() {
  try {
    if (deleteMeta.type === "tx" || deleteMeta.type === "failed") await deleteTransaction(deleteMeta.id);
    if (deleteMeta.type === "verify") await deleteVerification(deleteMeta.id);
    if (deleteMeta.type === "refund") await deleteRefund(deleteMeta.id);
    await logPaymentActivity(currentRole, "delete", `Deleted ${deleteMeta.type}`, { id: deleteMeta.id });
    closeDelete(); refresh(); toast("Deleted.");
  } catch (e) { toast(e.message || "Delete failed"); }
}

async function updateStatus(type, id, verificationStatus, finalStatus) {
  const source = type === "tx" || type === "failed" ? getTransactions() : type === "verify" ? getVerifyQueue() : getRefunds();
  const row = source.find((x) => String(x.id) === String(id)); if (!row) return;
  if (type === "refund") {
    await saveRefund({ ...row, status: finalStatus || verificationStatus }, id);
  } else if (type === "verify") {
    await saveVerification({ ...row, verification_status: verificationStatus || row.verification_status, status: finalStatus || row.status }, id);
  } else {
    await saveTransaction({ ...row, verification_status: verificationStatus || row.verification_status, final_status: finalStatus || row.final_status }, id);
  }
  await logPaymentActivity(currentRole, "status", `${type} status updated`, { id, verificationStatus, finalStatus });
  refresh();
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const a = e.target.dataset.action; if (!a) return;
    if (a === "addTx" && can("add")) openForm();
    if (a === "clearTx" && can("clear")) { await clearTransactions(); refresh(); }
    if (a === "exportTx" && can("export")) download("payments-transactions", getTransactions());
    if (a === "clearFailed" && can("clear")) { await clearTransactions(); refresh(); }
    if (a === "exportFailed" && can("export")) download("payments-failed", getFailed());
    if (a === "clearVerify" && can("clear")) { await clearVerifications(); refresh(); }
    if (a === "exportVerify" && can("export")) download("payments-verification", getVerifyQueue());
    if (a === "clearRefund" && can("clear")) { await clearRefunds(); refresh(); }
    if (a === "exportRefund" && can("export")) download("payments-refunds", getRefunds());
    if (a === "print" && can("print")) window.print();
  });
  document.body.addEventListener("click", async (e) => {
    const type = e.target.dataset.type; const a = e.target.dataset.a; const id = e.target.dataset.id; if (!type || !a) return;
    if (a === "view") toast(`Viewing ${type} ${id}`);
    if (a === "edit" && type === "tx") {
      const row = getTransactions().find((x) => String(x.id) === String(id)); if (row) openForm(row);
    }
    if (a === "delete") askDelete(type, id);
    if (a === "verify") updateStatus(type, id, "verified", null);
    if (a === "success") updateStatus(type, id, "verified", "success");
    if (a === "failed") updateStatus(type, id, "verified", "failed");
    if (a === "refund") {
      const tx = getTransactions().find((x) => String(x.id) === String(id));
      if (tx) await saveRefund({ id: `RF-${Date.now()}`, tx_id: tx.id, requester: currentRole, amount: tx.amount, reason: "Manual request", status: "pending", date: new Date().toISOString().slice(0, 10) });
      refresh();
    }
    if (a === "approve") updateStatus(type, id, "verified", "approved");
    if (a === "reject") updateStatus(type, id, "rejected", "rejected");
    if (a === "retry") toast("Retry process imeanzishwa (placeholder).");
    if (a === "changes") toast("Request changes sent.");
    if (a === "edit" && type === "setting") {
      const current = getSettings().find((x) => String(x.id || x.key) === String(id)); if (!current) return;
      const value = window.prompt(`Update ${current.key}`, current.value); if (value == null) return;
      await saveSetting({ ...current, value }, current.id);
      refresh();
    }
  });
  el("donateBtn").addEventListener("click", async () => {
    const payload = Object.fromEntries(new FormData(el("donationForm")).entries());
    const amount = Number(payload.amount || payload.preset?.replaceAll(",", "") || 0);
    if (!amount) return toast("Weka amount.");
    await saveTransaction({
      id: `TXN-${Date.now()}`, tarehe: new Date().toISOString().slice(0, 10), mlipaji: payload.mlipaji || "Anonymous",
      mawasiliano: payload.phone || payload.email || "-", channel: payload.channel, purpose: payload.purpose, amount,
      reference: `DON-${Math.floor(Math.random() * 99999)}`, verification_status: "pending", final_status: "pending",
    });
    toast("Donation request submitted.");
    refresh();
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  renderKpis(); renderTables(); renderSettings();
}

async function init() {
  installGlobalCrashGuards("phase11_payments");
  await loadPaymentsData();
  refresh();
  bind();
}
init();
