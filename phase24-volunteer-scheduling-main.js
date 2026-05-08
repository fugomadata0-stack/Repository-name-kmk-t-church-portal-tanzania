import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import {
  availabilityOptions,
  hudumaTypes,
  kpiDefs,
  miniModules,
  roleAccessVolunteer,
  scheduleStatuses,
  teamOptions,
  volunteerStatuses,
} from "./phase24-volunteer-scheduling-hooks.js";
import {
  addSchedule,
  addVolunteer,
  assignDuty,
  clearSchedules,
  clearVolunteers,
  deleteSchedule,
  deleteVolunteer,
  getKpis,
  getSchedules,
  getVolunteers,
  loadVolunteerSchedulingData,
  markScheduleDone,
  updateSchedule,
  updateVolunteer,
} from "./phase24-volunteer-scheduling-services.js";

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
  el("team").innerHTML = teamOptions.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("availability").innerHTML = availabilityOptions.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("volunteerStatus").innerHTML = volunteerStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");

  el("scheduleHudumaType").innerHTML = hudumaTypes.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("scheduleTeam").innerHTML = teamOptions.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("scheduleStatus").innerHTML = scheduleStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.activeVolunteers, k.teams, k.dutiesWeek, k.pendingAssignments, k.completedDuties, k.serviceTeams, k.conflicts, k.reportsReady];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderVolunteersTable() {
  const rows = getVolunteers();
  el("volunteersBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>VL-${r.id}</td>
      <td>${r.name || "-"}</td>
      <td>${r.phone || "-"}</td>
      <td>${r.team || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.availability || "-"}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewVolunteer" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editVolunteer" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteVolunteer" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="assignDutyVolunteer" data-id="${r.id}">Assign Duty</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="10"><div class="empty">Hakuna volunteers kwa sasa.</div></td></tr>`;
}

function renderSchedulesTable() {
  const rows = getSchedules();
  el("schedulesBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.schedule_date || "-"}</td>
      <td>${r.huduma_type || "-"}</td>
      <td>${r.team || "-"}</td>
      <td>${r.volunteer || "-"}</td>
      <td>${r.role || "-"}</td>
      <td>${r.location || "-"}</td>
      <td>${r.time || "-"}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewSchedule" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editSchedule" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteSchedule" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="markDone" data-id="${r.id}">Mark Done</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="9"><div class="empty">Hakuna ratiba za huduma kwa sasa.</div></td></tr>`;
}

function renderCalendarCards() {
  const rows = getSchedules().slice(0, 4);
  el("scheduleCards").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<article class="schedule-card">
      <h4>${r.huduma_type}</h4>
      <p><b>Tarehe:</b> ${r.schedule_date}</p>
      <p><b>Team:</b> ${r.team}</p>
      <p><b>Volunteer:</b> ${r.volunteer}</p>
      <p><b>Time:</b> ${r.time}</p>
      <span class="status-chip ${resolveFinalStatusColor(r.status)}">${r.status}</span>
    </article>`
        )
        .join("")
    : `<div class="empty">Hakuna schedule cards kwa sasa.</div>`;
}

function refreshAll() {
  renderKpis();
  renderVolunteersTable();
  renderSchedulesTable();
  renderCalendarCards();
}

function clearForms() {
  el("volunteerForm").reset();
  el("scheduleForm").reset();
  const date = new Date().toISOString().slice(0, 10);
  el("scheduleDate").value = date;
}

function collectVolunteerData() {
  return {
    name: el("volunteerName").value.trim(),
    phone: el("volunteerPhone").value.trim(),
    team: el("team").value,
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
    availability: el("availability").value,
    status: el("volunteerStatus").value,
  };
}

function collectScheduleData() {
  return {
    schedule_date: el("scheduleDate").value,
    huduma_type: el("scheduleHudumaType").value,
    team: el("scheduleTeam").value,
    volunteer: el("scheduleVolunteer").value.trim(),
    role: el("scheduleRole").value.trim(),
    location: el("scheduleLocation").value.trim(),
    time: el("scheduleTime").value,
    status: el("scheduleStatus").value,
  };
}

async function reloadFromLive() {
  await loadVolunteerSchedulingData();
  refreshAll();
}

function exportVolunteersCsv() {
  const header = "ID,Jina,Simu,Team/Huduma,Dayosisi,Jimbo,Tawi,Availability,Status";
  const rows = getVolunteers().map((r) => {
    const values = [`VL-${r.id}`, r.name || "", r.phone || "", r.team || "", r.dayosisi || "", r.jimbo || "", r.tawi || "", r.availability || "", r.status || ""];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-volunteers.csv", [header, ...rows]);
}

function exportSchedulesCsv() {
  const header = "Tarehe,Aina ya Huduma,Team,Volunteer,Role,Location,Time,Status";
  const rows = getSchedules().map((r) => {
    const values = [r.schedule_date || "", r.huduma_type || "", r.team || "", r.volunteer || "", r.role || "", r.location || "", r.time || "", r.status || ""];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-service-schedules.csv", [header, ...rows]);
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
  realtimeChannel = s.channel("phase24-volunteer-scheduling-live");
  ["volunteers", "service_teams", "duty_rosters", "service_schedules", "volunteer_reports", "schedule_conflicts"].forEach((table) => {
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
  el("volunteerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessVolunteer[appRole]?.add ?? false)) {
      toast("Huna ruhusa ya Add Volunteer.");
      return;
    }
    await addVolunteer(collectVolunteerData());
    refreshAll();
    toast("Volunteer ameongezwa.");
  });

  el("scheduleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessVolunteer[appRole]?.assign ?? false)) {
      toast("Huna ruhusa ya Add Schedule.");
      return;
    }
    await addSchedule(collectScheduleData());
    refreshAll();
    toast("Ratiba mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "addVolunteer") {
      el("volunteerName").focus();
      toast("Jaza form ya volunteer kwanza.");
      return;
    }
    if (action === "addSchedule") {
      el("scheduleVolunteer").focus();
      toast("Jaza form ya schedule kwanza.");
      return;
    }
    if (action === "clearVolunteers") {
      if (!(roleAccessVolunteer[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Clear Volunteers.");
        return;
      }
      await clearVolunteers();
      refreshAll();
      toast("Volunteers zime-clear.");
      return;
    }
    if (action === "clearSchedules") {
      if (!(roleAccessVolunteer[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Clear Schedules.");
        return;
      }
      await clearSchedules();
      refreshAll();
      toast("Schedules zime-clear.");
      return;
    }
    if (action === "export") {
      if (!(roleAccessVolunteer[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Export.");
        return;
      }
      exportVolunteersCsv();
      exportSchedulesCsv();
      toast("CSV ya volunteers na schedules imeshatolewa.");
      return;
    }
    if (action === "print") {
      if (!(roleAccessVolunteer[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Print.");
        return;
      }
      window.print();
      return;
    }
    if (!id) return;

    if (action === "viewVolunteer") toast(`Volunteer #${id} profile iko tayari.`);
    if (action === "editVolunteer") {
      await updateVolunteer(id, { status: "Assigned" });
      refreshAll();
      toast("Volunteer status imewekwa Assigned.");
    }
    if (action === "deleteVolunteer") {
      if (!(roleAccessVolunteer[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Delete Volunteer.");
        return;
      }
      await deleteVolunteer(id);
      refreshAll();
      toast("Volunteer amefutwa.");
    }
    if (action === "assignDutyVolunteer") {
      if (!(roleAccessVolunteer[appRole]?.assign ?? false)) {
        toast("Role yako haina ruhusa ya Assign Duty.");
        return;
      }
      await updateVolunteer(id, { status: "Assigned" });
      refreshAll();
      toast("Volunteer amepewa duty.");
    }

    if (action === "viewSchedule") toast(`Schedule #${id} details iko tayari.`);
    if (action === "editSchedule") {
      await updateSchedule(id, { status: "Assigned" });
      refreshAll();
      toast("Schedule imewekwa Assigned.");
    }
    if (action === "deleteSchedule") {
      if (!(roleAccessVolunteer[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Delete Schedule.");
        return;
      }
      await deleteSchedule(id);
      refreshAll();
      toast("Schedule imefutwa.");
    }
    if (action === "markDone") {
      if (!(roleAccessVolunteer[appRole]?.markDone ?? false)) {
        toast("Role yako haina ruhusa ya Mark Done.");
        return;
      }
      await markScheduleDone(id);
      refreshAll();
      toast("Schedule imewekwa Done.");
    }
    if (action === "assignDutySchedule") {
      await assignDuty(id);
      refreshAll();
      toast("Schedule ime-assigniwa duty.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara"])) return;
  installGlobalCrashGuards("phase24_volunteer_scheduling");
  renderMiniModules();
  renderFormSelects();
  clearForms();
  try {
    await loadVolunteerSchedulingData();
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
