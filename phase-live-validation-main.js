import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { loadValidationHistory, runLiveValidation, saveValidationRun } from "./phase-live-validation-services.js";

const el = (id) => document.getElementById(id);

const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2500);
};

let currentResults = [];
let historyRows = [];

function renderResults() {
  const body = el("validationBody");
  body.innerHTML = currentResults.length
    ? currentResults
        .map((r) => `<tr><td>${r.name}</td><td><span class="status-badge">${r.status}</span></td><td>${r.detail}</td></tr>`)
        .join("")
    : `<tr><td colspan="3"><div class="empty">Hakuna validation result bado.</div></td></tr>`;

  const totals = {
    pass: currentResults.filter((x) => x.status === "PASS").length,
    warn: currentResults.filter((x) => x.status === "WARN").length,
    fail: currentResults.filter((x) => x.status === "FAIL").length,
  };

  el("validationKpis").innerHTML = `
    <article class="kpi-card green"><h4>PASS</h4><p>${totals.pass}</p></article>
    <article class="kpi-card yellow"><h4>WARN</h4><p>${totals.warn}</p></article>
    <article class="kpi-card red"><h4>FAIL</h4><p>${totals.fail}</p></article>
    <article class="kpi-card blue"><h4>Total Checks</h4><p>${currentResults.length}</p></article>
  `;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
}

function downloadCsv(name, rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderHistory() {
  const body = el("historyBody");
  body.innerHTML = historyRows.length
    ? historyRows
        .map(
          (r) =>
            `<tr><td>${String(r.run_at || "").slice(0, 19).replace("T", " ")}</td><td>${r.pass_count}</td><td>${r.warn_count}</td><td>${r.fail_count}</td><td>${r.total_count}</td><td>${r.mode}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="6"><div class="empty">Hakuna run history bado.</div></td></tr>`;
}

function bind() {
  el("runValidationBtn").addEventListener("click", async () => {
    toast("Live validation inaendelea...");
    currentResults = await runLiveValidation();
    await saveValidationRun(currentResults);
    historyRows = await loadValidationHistory();
    renderResults();
    renderHistory();
    toast("Live validation imekamilika.");
  });
  el("exportValidationBtn").addEventListener("click", () => {
    if (!currentResults.length) {
      toast("Hakuna results za ku-export bado.");
      return;
    }
    downloadCsv("kmt-live-validation-report", currentResults);
    toast("Validation report ime-export (CSV).");
  });
  el("clearValidationBtn").addEventListener("click", () => {
    currentResults = [];
    renderResults();
    toast("Validation result imefutwa.");
  });
}

function init() {
  installGlobalCrashGuards("live_validation_center");
  bind();
  renderResults();
  loadValidationHistory().then((rows) => {
    historyRows = rows;
    renderHistory();
  });
}

init();
