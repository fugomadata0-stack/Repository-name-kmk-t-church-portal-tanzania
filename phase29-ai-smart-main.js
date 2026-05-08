import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { kpiDefs, miniModules } from "./phase29-ai-smart-hooks.js";
import { clearInsights, getInsights, getKpis, loadAiSmartData, updateInsightStatus } from "./phase29-ai-smart-services.js";

const el = (id) => document.getElementById(id);
let realtimeChannel = null;
let livePollInterval = null;
let lastLiveToastAt = 0;

const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2600);
};

const badge = (text) => `<span class="status ${resolveFinalStatusColor(text)}">${text}</span>`;

function renderMiniModules() {
  el("miniModules").innerHTML = miniModules.map((m) => `<span class="badge">${m}</span>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.insightsGenerated, k.duplicateAlerts, k.riskAlerts, k.financeWarnings, k.attendancePredictions, k.reportSummaries, k.recommendations, k.aiHealth];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderInsightCards() {
  const rows = getInsights().slice(0, 6);
  el("insightCards").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<article class="i-card">
      <h4>${r.type} - ${r.module}</h4>
      <p>${r.message_preview}</p>
      <p><b>Suggested:</b> ${r.suggested_action}</p>
      <span class="status-chip ${resolveFinalStatusColor(r.priority)}">${r.priority}</span>
    </article>`
        )
        .join("")
    : `<div class="empty">Hakuna AI insight cards kwa sasa.</div>`;
}

function renderTable() {
  const rows = getInsights();
  el("insightsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.insight_id || `AI-${r.id}`}</td>
      <td>${r.module || "-"}</td>
      <td>${r.type || "-"}</td>
      <td>${badge(r.priority || "-")}</td>
      <td>${r.message_preview || "-"}</td>
      <td>${r.suggested_action || "-"}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="view" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="accept" data-id="${r.id}">Accept</button>
        <button class="btn tiny" data-action="dismiss" data-id="${r.id}">Dismiss</button>
        <button class="btn tiny" data-action="resolve" data-id="${r.id}">Mark Resolved</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="8"><div class="empty">Hakuna insights kwa sasa.</div></td></tr>`;
}

function refreshAll() {
  renderKpis();
  renderInsightCards();
  renderTable();
}

function exportInsightsCsv() {
  const header = "Insight ID,Module,Type,Priority,Message Preview,Suggested Action,Status";
  const rows = getInsights().map((r) => {
    const values = [r.insight_id || `AI-${r.id}`, r.module || "", r.type || "", r.priority || "", r.message_preview || "", r.suggested_action || "", r.status || ""];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-ai-smart-insights.csv", [header, ...rows]);
}

async function reloadFromLive() {
  await loadAiSmartData();
  refreshAll();
}

function setupRealtime() {
  const s = getSafeSupabase();
  const badgeEl = el("liveBadge");
  if (livePollInterval) clearInterval(livePollInterval);
  livePollInterval = setInterval(() => {
    reloadFromLive().catch(() => {});
  }, 45000);

  if (!s || typeof s.channel !== "function") {
    badgeEl.textContent = "Realtime: Mock";
    return;
  }
  badgeEl.textContent = "Realtime: Live + Sync";
  if (realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  realtimeChannel = s.channel("phase29-ai-live");
  ["ai_insights", "smart_alerts", "duplicate_checks", "prediction_snapshots", "recommendation_logs"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive().catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("AI insight update imepokelewa.");
        lastLiveToastAt = Date.now();
      }
    });
  });
  realtimeChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") badgeEl.textContent = "Realtime: Live";
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") badgeEl.textContent = "Realtime: Live (reconnecting...)";
  });
}

function bind() {
  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "export") {
      exportInsightsCsv();
      return toast("CSV ya insights imetolewa.");
    }
    if (action === "clear") {
      await clearInsights();
      refreshAll();
      return toast("Insights zimefutwa.");
    }
    if (!id) return;

    if (action === "view") toast(`Insight #${id} details panel iko tayari.`);
    if (action === "accept") {
      await updateInsightStatus(id, "Accepted");
      refreshAll();
      toast("Insight ime-accept.");
    }
    if (action === "dismiss") {
      await updateInsightStatus(id, "Dismissed");
      refreshAll();
      toast("Insight ime-dismiss.");
    }
    if (action === "resolve") {
      await updateInsightStatus(id, "Resolved");
      refreshAll();
      toast("Insight imewekwa resolved.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "finance_officer", "media_admin"])) return;
  installGlobalCrashGuards("phase29_ai_smart");
  renderMiniModules();
  try {
    await loadAiSmartData();
  } catch (_) {
    toast("Supabase sync imekwama, inaendelea na placeholder data.");
  }
  setupRealtime();
  bind();
  refreshAll();
  window.addEventListener("beforeunload", () => {
    const s = getSafeSupabase();
    if (livePollInterval) clearInterval(livePollInterval);
    if (s && realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  });
}

init();
