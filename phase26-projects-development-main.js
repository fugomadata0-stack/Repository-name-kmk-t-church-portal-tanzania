import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { kpiDefs, miniModules, projectCategories, projectStatuses, roleAccessProjects } from "./phase26-projects-development-hooks.js";
import {
  addContribution,
  addProject,
  addUpdate,
  clearProjects,
  deleteProject,
  getKpis,
  getProjects,
  loadProjectsDevelopmentData,
  updateProject,
} from "./phase26-projects-development-services.js";

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
const formatCurrency = (value) => `TZS ${Number(value || 0).toLocaleString()}`;
const calcProgress = (r) => {
  const target = Number(r.target_amount || 0);
  const collected = Number(r.collected_amount || 0);
  return target <= 0 ? 0 : Math.min(100, Math.round((collected / target) * 100));
};

function renderMiniModules() {
  el("miniModules").innerHTML = miniModules.map((m) => `<span class="badge">${m}</span>`).join("");
}

function renderFormSelects() {
  el("category").innerHTML = projectCategories.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = projectStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.total, k.active, k.completed, formatCurrency(k.targetAmount), formatCurrency(k.collectedAmount), formatCurrency(k.remainingBalance), `${k.progressAverage}%`, k.delayed];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderProjectsTable() {
  const rows = getProjects();
  el("projectsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.project_id || `PRJ-${r.id}`}</td>
      <td>${r.title || "-"}</td>
      <td>${r.category || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${formatCurrency(r.target_amount)}</td>
      <td>${formatCurrency(r.collected_amount)}</td>
      <td>${calcProgress(r)}%</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewProject" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editProject" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteProject" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="addContribution" data-id="${r.id}">Add Contribution</button>
        <button class="btn tiny" data-action="addUpdate" data-id="${r.id}">Add Update</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna miradi kwa sasa.</div></td></tr>`;
}

function renderProgressCards() {
  const rows = getProjects().slice(0, 6);
  el("progressCards").innerHTML = rows.length
    ? rows
        .map((r) => {
          const progress = calcProgress(r);
          return `<article class="p-card">
      <h4>${r.title}</h4>
      <p><b>Category:</b> ${r.category}</p>
      <div class="progress-line"><span style="width:${progress}%"></span></div>
      <p><b>Progress:</b> ${progress}%</p>
      <p><b>Target vs Collected:</b> ${formatCurrency(r.target_amount)} / ${formatCurrency(r.collected_amount)}</p>
      <p><b>Photos:</b> ${r.image_placeholder || "project-image.jpg"}</p>
      <p><b>Latest Update:</b> ${r.notes || "Hakuna update mpya."}</p>
      <button class="btn tiny gold" data-action="donateCta" data-id="${r.id}">Donation CTA</button>
    </article>`;
        })
        .join("")
    : `<div class="empty">Hakuna project progress cards kwa sasa.</div>`;
}

function refreshAll() {
  renderKpis();
  renderProjectsTable();
  renderProgressCards();
}

function clearForm() {
  el("projectForm").reset();
  const d = new Date().toISOString().slice(0, 10);
  el("startDate").value = d;
  el("endDate").value = d;
}

function collectFormData() {
  return {
    title: el("projectTitle").value.trim(),
    category: el("category").value,
    description: el("description").value.trim(),
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
    start_date: el("startDate").value,
    end_date: el("endDate").value,
    target_amount: Number(el("targetAmount").value || 0),
    responsible_leader: el("responsibleLeader").value.trim(),
    image_placeholder: el("projectImage").value.trim() || "project-image.jpg",
    status: el("status").value,
    notes: el("notes").value.trim(),
    collected_amount: 0,
  };
}

async function reloadFromLive() {
  await loadProjectsDevelopmentData();
  refreshAll();
}

function exportProjectsCsv() {
  const header = "Project ID,Title,Category,Dayosisi,Jimbo,Tawi,Target Amount,Collected,Progress,Status";
  const rows = getProjects().map((r) => {
    const values = [
      r.project_id || `PRJ-${r.id}`,
      r.title || "",
      r.category || "",
      r.dayosisi || "",
      r.jimbo || "",
      r.tawi || "",
      Number(r.target_amount || 0),
      Number(r.collected_amount || 0),
      `${calcProgress(r)}%`,
      r.status || "",
    ];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-projects-development.csv", [header, ...rows]);
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
  realtimeChannel = s.channel("phase26-projects-live");
  ["projects", "project_contributions", "project_expenses", "project_updates", "project_gallery", "project_reports"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive().catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("Live update imepokelewa kutoka Supabase.");
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
  el("projectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessProjects[appRole]?.add ?? false)) {
      toast("Huna ruhusa ya Add Project.");
      return;
    }
    await addProject(collectFormData());
    refreshAll();
    clearForm();
    toast("Project mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "addProject") {
      el("projectTitle").focus();
      toast("Jaza form kuongeza project.");
      return;
    }
    if (action === "clearProjects") {
      if (!(roleAccessProjects[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Clear.");
      await clearProjects();
      refreshAll();
      toast("Projects zote zime-clear.");
      return;
    }
    if (action === "export") {
      if (!(roleAccessProjects[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Export.");
      exportProjectsCsv();
      return toast("CSV ya miradi imeshatolewa.");
    }
    if (action === "print") {
      if (!(roleAccessProjects[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Print.");
      return window.print();
    }
    if (!id) return;

    if (action === "viewProject") toast(`Project #${id} details panel iko tayari.`);
    if (action === "editProject") {
      await updateProject(id, { status: "Active" });
      refreshAll();
      toast("Project imesasishwa.");
    }
    if (action === "deleteProject") {
      if (!(roleAccessProjects[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Delete.");
      await deleteProject(id);
      refreshAll();
      toast("Project imefutwa.");
    }
    if (action === "addContribution") {
      if (!(roleAccessProjects[appRole]?.contribute ?? false)) return toast("Role yako haina ruhusa ya contribution.");
      await addContribution(id);
      refreshAll();
      toast("Contribution imeongezwa.");
    }
    if (action === "addUpdate") {
      if (!(roleAccessProjects[appRole]?.update ?? false)) return toast("Role yako haina ruhusa ya update.");
      await addUpdate(id, "Progress update imeongezwa kupitia module.");
      refreshAll();
      toast("Project update imeongezwa.");
    }
    if (action === "donateCta") {
      await addContribution(id);
      refreshAll();
      toast("Donation CTA imetekelezwa.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara", "finance_officer"])) return;
  installGlobalCrashGuards("phase26_projects_development");
  renderMiniModules();
  renderFormSelects();
  clearForm();
  try {
    await loadProjectsDevelopmentData();
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
