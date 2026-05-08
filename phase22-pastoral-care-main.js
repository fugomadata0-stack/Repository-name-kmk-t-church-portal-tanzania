import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { caseStatuses, hudumaTypes, kpiDefs, miniModules, priorityOptions, roleAccessPastoral } from "./phase22-pastoral-care-hooks.js";
import {
  addPastoralCase,
  assignPastor,
  clearPastoralCases,
  deletePastoralCase,
  getKpis,
  getPastoralCases,
  loadPastoralCareData,
  markComplete,
  updatePastoralCase,
} from "./phase22-pastoral-care-services.js";

const el = (id) => document.getElementById(id);
const appRole = localStorage.getItem("kmt_user_role") || "admin";
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
const confidentialMask = (row) => (row.confidential && !(roleAccessPastoral[appRole]?.viewConfidential ?? false) ? "Imefichwa / Restricted" : row.member_name || "-");

function renderMiniModules() {
  el("miniModules").innerHTML = miniModules.map((m) => `<span class="badge">${m}</span>`).join("");
}

function renderFormSelects() {
  el("hudumaType").innerHTML = hudumaTypes.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("priority").innerHTML = priorityOptions.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = caseStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.maombiMapya, k.zinazoendelea, k.followupLeo, k.ziaraNyumbani, k.ziaraHospitali, k.confidential, k.completed, k.pendingReports];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderTable() {
  const rows = getPastoralCases();
  el("pastoralBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>PC-${r.id}</td>
      <td>${confidentialMask(r)}</td>
      <td>${r.huduma_type || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.leader_name || "-"}</td>
      <td>${badge(r.priority || "-")}</td>
      <td>${badge(r.status || "-")}</td>
      <td>${r.followup_date || "-"}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewDetails" data-id="${r.id}">View Details</button>
        <button class="btn tiny" data-action="editCase" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteCase" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="assignPastor" data-id="${r.id}">Assign Pastor</button>
        <button class="btn tiny" data-action="markComplete" data-id="${r.id}">Mark Complete</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna huduma za kichungaji kwa sasa.</div></td></tr>`;
}

function refreshAll() {
  renderKpis();
  renderTable();
}

function clearForm() {
  el("pastoralForm").reset();
  el("followupDate").value = new Date().toISOString().slice(0, 10);
}

function collectFormData() {
  return {
    member_name: el("memberName").value.trim(),
    huduma_type: el("hudumaType").value,
    description: el("description").value.trim(),
    priority: el("priority").value,
    confidential: el("confidentialToggle").checked,
    leader_name: el("leaderName").value.trim(),
    followup_date: el("followupDate").value,
    notes: el("notes").value.trim(),
    status: el("status").value,
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
  };
}

async function reloadFromLive() {
  await loadPastoralCareData();
  refreshAll();
}

function exportPastoralCsv() {
  const header = "ID,Jina la Muumini,Aina ya Huduma,Dayosisi,Jimbo,Tawi,Mchungaji/Kiongozi,Priority,Status,Follow-up Date";
  const rows = getPastoralCases().map((r) => {
    const values = [
      `PC-${r.id}`,
      r.member_name || "",
      r.huduma_type || "",
      r.dayosisi || "",
      r.jimbo || "",
      r.tawi || "",
      r.leader_name || "",
      r.priority || "",
      r.status || "",
      r.followup_date || "",
    ];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-pastoral-care.csv", [header, ...rows]);
}

function setLiveBadge(text) {
  const badgeEl = el("liveBadge");
  if (badgeEl) badgeEl.textContent = text;
}

function setupRealtime() {
  const s = getSafeSupabase();
  if (livePollInterval) clearInterval(livePollInterval);
  livePollInterval = setInterval(() => {
    reloadFromLive().catch(() => {});
  }, 45000);

  if (!s || typeof s.channel !== "function") {
    setLiveBadge("Realtime: Mock");
    return;
  }
  setLiveBadge("Realtime: Live + Sync");
  if (realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  realtimeChannel = s.channel("phase22-pastoral-care-live");
  ["pastoral_cases", "prayer_requests", "member_followups", "pastoral_visits", "confidential_notes", "pastoral_reports"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive().catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("Live update imepokelewa kutoka Supabase.");
        lastLiveToastAt = Date.now();
      }
    });
  });
  realtimeChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") setLiveBadge("Realtime: Live");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLiveBadge("Realtime: Live (reconnecting...)");
  });
}

function bind() {
  el("pastoralForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessPastoral[appRole]?.add ?? false)) {
      toast("Huna ruhusa ya Add Case kwa role yako.");
      return;
    }
    await addPastoralCase(collectFormData());
    refreshAll();
    clearForm();
    toast("Pastoral case mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "clearCases") {
      if (!(roleAccessPastoral[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Clear.");
        return;
      }
      await clearPastoralCases();
      refreshAll();
      toast("Cases zote zime-clear.");
      return;
    }
    if (action === "print") {
      if (!(roleAccessPastoral[appRole]?.reports ?? false)) {
        toast("Role yako haina ruhusa ya Print.");
        return;
      }
      window.print();
      return;
    }
    if (action === "export") {
      if (!(roleAccessPastoral[appRole]?.reports ?? false)) {
        toast("Role yako haina ruhusa ya Export.");
        return;
      }
      exportPastoralCsv();
      toast("CSV ya huduma ya kichungaji imeshatolewa.");
      return;
    }
    if (action === "addCase") {
      el("memberName").focus();
      toast("Jaza form ili kuongeza case mpya.");
      return;
    }
    if (!id) return;

    if (action === "editCase") {
      await updatePastoralCase(id, { status: "In Progress" });
      refreshAll();
      toast("Case imewekwa In Progress.");
    }
    if (action === "deleteCase") {
      if (!(roleAccessPastoral[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya kufuta case.");
        return;
      }
      await deletePastoralCase(id);
      refreshAll();
      toast("Case imefutwa.");
    }
    if (action === "assignPastor") {
      if (!(roleAccessPastoral[appRole]?.assign ?? false)) {
        toast("Role yako haina ruhusa ya assign.");
        return;
      }
      await assignPastor(id, "Mch. Assigned Leader");
      refreshAll();
      toast("Case imepewa mchungaji/kiongozi.");
    }
    if (action === "markComplete") {
      await markComplete(id);
      refreshAll();
      toast("Case imekamilishwa.");
    }
    if (action === "viewDetails") toast(`Case #${id} details panel iko tayari.`);
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara"])) return;
  installGlobalCrashGuards("phase22_pastoral_care");
  renderMiniModules();
  renderFormSelects();
  clearForm();
  try {
    await loadPastoralCareData();
  } catch (_) {
    toast("Supabase sync imekwama, inaendelea na mock data.");
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
