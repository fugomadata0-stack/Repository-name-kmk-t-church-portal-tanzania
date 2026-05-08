import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { calendarViews, eventScopes, eventStatuses, eventTypes, kpiDefs, miniModules, roleAccessCalendar } from "./phase28-national-calendar-hooks.js";
import {
  addSchedule,
  clearSchedules,
  deleteSchedule,
  detectConflicts,
  getKpis,
  getSchedules,
  loadNationalCalendarData,
  updateSchedule,
} from "./phase28-national-calendar-services.js";

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
  el("type").innerHTML = eventTypes.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("scope").innerHTML = eventScopes.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = eventStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderViewTabs() {
  el("calendarViews").innerHTML = calendarViews.map((v, i) => `<button class="btn ${i === 0 ? "gold" : ""}" data-action="switchView" data-view="${v}">${v}</button>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.eventsThisMonth, k.campsUpcoming, k.meetingsScheduled, k.conflictsDetected, k.trainingsUpcoming, k.deadlinesPending, k.syncedDayosisi, k.calendarHealth];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderCalendarSurface(view = "Month View") {
  const rows = getSchedules();
  const preview = rows.slice(0, view === "Day View" ? 4 : view === "Week View" ? 8 : 12);
  el("calendarSurface").innerHTML = preview.length
    ? preview
        .map(
          (r) => `<article class="c-item">
      <h4>${r.title}</h4>
      <p><b>${view}:</b> ${r.date} ${r.time}</p>
      <p><b>Type:</b> ${r.type}</p>
      <p><b>Scope:</b> ${r.scope}</p>
      <p><b>Dayosisi:</b> ${r.dayosisi}</p>
      <span class="status-chip ${resolveFinalStatusColor(r.status)}">${r.status}</span>
    </article>`
        )
        .join("")
    : `<div class="empty">Hakuna events kwa view hii.</div>`;
}

function renderTable() {
  const rows = getSchedules();
  el("calendarBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>CAL-${r.id}</td>
      <td>${r.title || "-"}</td>
      <td>${r.type || "-"}</td>
      <td>${r.scope || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.date || "-"}</td>
      <td>${r.time || "-"}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewSchedule" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editSchedule" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteSchedule" data-id="${r.id}">Delete</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna ratiba kwenye kalenda kuu kwa sasa.</div></td></tr>`;
}

function refreshAll(activeView = "Month View") {
  renderKpis();
  renderCalendarSurface(activeView);
  renderTable();
}

function clearForm() {
  el("calendarForm").reset();
  const d = new Date().toISOString().slice(0, 10);
  el("date").value = d;
}

function collectFormData() {
  return {
    title: el("title").value.trim(),
    type: el("type").value,
    scope: el("scope").value,
    dayosisi: el("dayosisi").value.trim() || "All Dayosisi",
    jimbo: el("jimbo").value.trim() || "All",
    tawi: el("tawi").value.trim() || "All",
    date: el("date").value,
    time: el("time").value || "09:00",
    status: el("status").value,
  };
}

function exportCalendarCsv() {
  const header = "ID,Title,Type,Scope,Dayosisi,Jimbo,Tawi,Date,Time,Status";
  const rows = getSchedules().map((r) => {
    const values = [`CAL-${r.id}`, r.title || "", r.type || "", r.scope || "", r.dayosisi || "", r.jimbo || "", r.tawi || "", r.date || "", r.time || "", r.status || ""];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-national-calendar.csv", [header, ...rows]);
}

async function reloadFromLive(view) {
  await loadNationalCalendarData();
  refreshAll(view);
}

function setupRealtime(activeViewRef) {
  const s = getSafeSupabase();
  const badgeEl = el("liveBadge");
  if (livePollInterval) clearInterval(livePollInterval);
  livePollInterval = setInterval(() => {
    reloadFromLive(activeViewRef.current).catch(() => {});
  }, 45000);

  if (!s || typeof s.channel !== "function") {
    badgeEl.textContent = "Realtime: Mock";
    return;
  }
  badgeEl.textContent = "Realtime: Live + Sync";
  if (realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  realtimeChannel = s.channel("phase28-calendar-live");
  ["national_calendar", "calendar_events", "calendar_conflicts", "calendar_sync_logs", "calendar_reminders"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive(activeViewRef.current).catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("Kalenda live update imepokelewa.");
        lastLiveToastAt = Date.now();
      }
    });
  });
  realtimeChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") badgeEl.textContent = "Realtime: Live";
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") badgeEl.textContent = "Realtime: Live (reconnecting...)";
  });
}

function bind(activeViewRef) {
  el("calendarForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessCalendar[appRole]?.add ?? false)) return toast("Huna ruhusa ya Add Schedule.");
    await addSchedule(collectFormData());
    refreshAll(activeViewRef.current);
    clearForm();
    toast("Ratiba mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "switchView") {
      activeViewRef.current = target.dataset.view || "Month View";
      return refreshAll(activeViewRef.current);
    }
    if (action === "addSchedule") {
      el("title").focus();
      return toast("Jaza form kuongeza schedule.");
    }
    if (action === "clearSchedules") {
      if (!(roleAccessCalendar[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Clear.");
      await clearSchedules();
      refreshAll(activeViewRef.current);
      return toast("Ratiba zote zime-clear.");
    }
    if (action === "detectConflict") {
      if (!(roleAccessCalendar[appRole]?.detectConflict ?? false)) return toast("Role yako haina ruhusa ya detect conflict.");
      const conflicts = await detectConflicts();
      refreshAll(activeViewRef.current);
      return toast(`Conflict detection imekamilika: ${conflicts} conflict(s).`);
    }
    if (action === "export") {
      if (!(roleAccessCalendar[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Export.");
      exportCalendarCsv();
      return toast("CSV ya national calendar imetolewa.");
    }
    if (action === "print") {
      if (!(roleAccessCalendar[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Print.");
      return window.print();
    }
    if (!id) return;

    if (action === "viewSchedule") toast(`Schedule #${id} details panel iko tayari.`);
    if (action === "editSchedule") {
      await updateSchedule(id, { status: "In Progress" });
      refreshAll(activeViewRef.current);
      toast("Schedule imesasishwa.");
    }
    if (action === "deleteSchedule") {
      if (!(roleAccessCalendar[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Delete.");
      await deleteSchedule(id);
      refreshAll(activeViewRef.current);
      toast("Schedule imefutwa.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara", "finance_officer"])) return;
  installGlobalCrashGuards("phase28_national_calendar");
  const activeViewRef = { current: "Month View" };
  renderMiniModules();
  renderFormSelects();
  renderViewTabs();
  clearForm();
  try {
    await loadNationalCalendarData();
  } catch (_) {
    toast("Supabase sync imekwama, inaendelea na mock data.");
  }
  setupRealtime(activeViewRef);
  bind(activeViewRef);
  refreshAll(activeViewRef.current);
  window.addEventListener("beforeunload", () => {
    const s = getSafeSupabase();
    if (livePollInterval) clearInterval(livePollInterval);
    if (s && realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  });
}

init();
