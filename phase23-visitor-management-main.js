import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { followupStatuses, kpiDefs, miniModules, roleAccessVisitor, visitorSources, visitorStatuses } from "./phase23-visitor-management-hooks.js";
import {
  addVisitor,
  clearVisitors,
  convertToMember,
  deleteVisitor,
  getKpis,
  getVisitors,
  loadVisitorManagementData,
  sendWelcomeSms,
  updateVisitor,
} from "./phase23-visitor-management-services.js";

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

function renderMiniModules() {
  el("miniModules").innerHTML = miniModules.map((m) => `<span class="badge">${m}</span>`).join("");
}

function renderFormSelects() {
  el("source").innerHTML = visitorSources.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("followupStatus").innerHTML = followupStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = visitorStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.todayRows, k.weekRows, k.firstTime, k.repeat, k.followupsPending, k.converted, k.smsSent, k.visitorGrowth];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderTable() {
  const rows = getVisitors();
  el("visitorsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>VG-${r.id}</td>
      <td>${r.visitor_name || "-"}</td>
      <td>${r.phone || "-"}</td>
      <td>${r.email || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.visit_date || "-"}</td>
      <td>${r.source || "-"}</td>
      <td>${badge(r.followup_status || "-")}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewVisitor" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editVisitor" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteVisitor" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="sendSms" data-id="${r.id}">Send Welcome SMS</button>
        <button class="btn tiny" data-action="convertMember" data-id="${r.id}">Convert to Member</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="12"><div class="empty">Hakuna wageni waliosajiliwa kwa sasa.</div></td></tr>`;
}

function refreshAll() {
  renderKpis();
  renderTable();
}

function clearForm() {
  el("visitorForm").reset();
  const date = new Date().toISOString().slice(0, 10);
  el("visitDate").value = date;
  el("followupDate").value = date;
}

function collectFormData() {
  return {
    visitor_name: el("visitorName").value.trim(),
    phone: el("phone").value.trim(),
    email: el("email").value.trim(),
    address: el("address").value.trim(),
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
    invited_by: el("invitedBy").value.trim(),
    source: el("source").value,
    notes: el("notes").value.trim(),
    followup_date: el("followupDate").value,
    followup_status: el("followupStatus").value,
    visit_date: el("visitDate").value,
    status: el("status").value,
  };
}

async function reloadFromLive() {
  await loadVisitorManagementData();
  refreshAll();
}

function exportVisitorsCsv() {
  const header = "ID,Jina la Mgeni,Simu,Email,Dayosisi,Jimbo,Tawi,Tarehe ya Kutembelea,Source,Follow-up Status,Status";
  const rows = getVisitors().map((r) => {
    const values = [
      `VG-${r.id}`,
      r.visitor_name || "",
      r.phone || "",
      r.email || "",
      r.dayosisi || "",
      r.jimbo || "",
      r.tawi || "",
      r.visit_date || "",
      r.source || "",
      r.followup_status || "",
      r.status || "",
    ];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-visitor-management.csv", [header, ...rows]);
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
  realtimeChannel = s.channel("phase23-visitor-management-live");
  ["visitors", "visitor_followups", "visitor_notes", "visitor_sms_logs", "visitor_conversion_logs"].forEach((table) => {
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
  el("visitorForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessVisitor[appRole]?.add ?? false)) {
      toast("Huna ruhusa ya Add Visitor kwa role yako.");
      return;
    }
    await addVisitor(collectFormData());
    refreshAll();
    clearForm();
    toast("Visitor mpya ameongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "addVisitor") {
      el("visitorName").focus();
      toast("Jaza form kuongeza mgeni mpya.");
      return;
    }
    if (action === "clearVisitors") {
      if (!(roleAccessVisitor[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Clear.");
        return;
      }
      await clearVisitors();
      refreshAll();
      toast("Visitor records zime-clear.");
      return;
    }
    if (action === "export") {
      if (!(roleAccessVisitor[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Export.");
        return;
      }
      exportVisitorsCsv();
      toast("CSV ya wageni imeshatolewa.");
      return;
    }
    if (action === "print") {
      if (!(roleAccessVisitor[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Print.");
        return;
      }
      window.print();
      return;
    }
    if (!id) return;

    if (action === "viewVisitor") toast(`Visitor #${id} profile iko tayari.`);
    if (action === "editVisitor") {
      await updateVisitor(id, { followup_status: "In Progress" });
      refreshAll();
      toast("Visitor follow-up imewekwa In Progress.");
    }
    if (action === "deleteVisitor") {
      if (!(roleAccessVisitor[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Delete.");
        return;
      }
      await deleteVisitor(id);
      refreshAll();
      toast("Visitor amefutwa.");
    }
    if (action === "sendSms") {
      if (!(roleAccessVisitor[appRole]?.sms ?? false)) {
        toast("Role yako haina ruhusa ya SMS.");
        return;
      }
      await sendWelcomeSms(id);
      refreshAll();
      toast("Welcome SMS imetumwa.");
    }
    if (action === "convertMember") {
      if (!(roleAccessVisitor[appRole]?.convert ?? false)) {
        toast("Role yako haina ruhusa ya conversion.");
        return;
      }
      await convertToMember(id);
      refreshAll();
      toast("Visitor amebadilishwa kuwa muumini.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara"])) return;
  installGlobalCrashGuards("phase23_visitor_management");
  renderMiniModules();
  renderFormSelects();
  clearForm();
  try {
    await loadVisitorManagementData();
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
