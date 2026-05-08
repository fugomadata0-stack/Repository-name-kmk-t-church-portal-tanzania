import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { kpiDefs, miniModules, roleAccessTraining, trainingCategories, trainingStatuses } from "./phase27-education-training-hooks.js";
import {
  addTraining,
  clearTrainings,
  deleteTraining,
  getKpis,
  getTrainings,
  loadEducationTrainingData,
  registerParticipants,
  updateTraining,
  uploadMaterials,
} from "./phase27-education-training-services.js";

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
  el("category").innerHTML = trainingCategories.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = trainingStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.active, k.participants, k.trainers, k.materials, k.completed, k.certificates, k.upcomingSeminars, k.reports];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderTrainingsTable() {
  const rows = getTrainings();
  el("trainingsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.training_id || `TRN-${r.id}`}</td>
      <td>${r.title || "-"}</td>
      <td>${r.category || "-"}</td>
      <td>${r.trainer || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.start_date || "-"}</td>
      <td>${r.participants_count || 0}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewTraining" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editTraining" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteTraining" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="registerParticipants" data-id="${r.id}">Register Participants</button>
        <button class="btn tiny" data-action="uploadMaterials" data-id="${r.id}">Upload Materials</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna mafunzo kwa sasa.</div></td></tr>`;
}

function renderTrainingCards() {
  const rows = getTrainings().slice(0, 6);
  el("trainingCards").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<article class="t-card">
      <h4>${r.title}</h4>
      <p><b>Category:</b> ${r.category}</p>
      <p><b>Trainer:</b> ${r.trainer || "-"}</p>
      <p><b>Venue:</b> ${r.venue || "-"}</p>
      <p><b>Washiriki:</b> ${r.participants_count || 0}</p>
      <p><b>Materials:</b> ${r.materials_placeholder || "N/A"}</p>
      <p><b>Status:</b> <span class="status-chip ${resolveFinalStatusColor(r.status)}">${r.status || "-"}</span></p>
    </article>`
        )
        .join("")
    : `<div class="empty">Hakuna training cards kwa sasa.</div>`;
}

function refreshAll() {
  renderKpis();
  renderTrainingsTable();
  renderTrainingCards();
}

function clearForm() {
  el("trainingForm").reset();
  const d = new Date().toISOString().slice(0, 10);
  el("startDate").value = d;
  el("endDate").value = d;
}

function collectFormData() {
  return {
    title: el("trainingTitle").value.trim(),
    category: el("category").value,
    description: el("description").value.trim(),
    trainer: el("trainer").value.trim(),
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
    start_date: el("startDate").value,
    end_date: el("endDate").value,
    venue: el("venue").value.trim(),
    materials_placeholder: el("materialsPlaceholder").value.trim() || "materials-file.pdf",
    status: el("status").value,
    notes: el("notes").value.trim(),
    participants_count: 0,
  };
}

function exportTrainingsCsv() {
  const header = "Training ID,Title,Category,Trainer,Dayosisi,Jimbo,Tawi,Start Date,Participants,Status";
  const rows = getTrainings().map((r) => {
    const values = [
      r.training_id || `TRN-${r.id}`,
      r.title || "",
      r.category || "",
      r.trainer || "",
      r.dayosisi || "",
      r.jimbo || "",
      r.tawi || "",
      r.start_date || "",
      Number(r.participants_count || 0),
      r.status || "",
    ];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-education-training.csv", [header, ...rows]);
}

async function reloadFromLive() {
  await loadEducationTrainingData();
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
  realtimeChannel = s.channel("phase27-training-live");
  ["trainings", "training_participants", "trainers", "training_materials", "certificates_placeholder", "training_reports"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive().catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("Live training update imepokelewa.");
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
  el("trainingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessTraining[appRole]?.add ?? false)) return toast("Huna ruhusa ya Add Training.");
    await addTraining(collectFormData());
    refreshAll();
    clearForm();
    toast("Training mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "addTraining") {
      el("trainingTitle").focus();
      return toast("Jaza form kuongeza training.");
    }
    if (action === "clearTrainings") {
      if (!(roleAccessTraining[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Clear.");
      await clearTrainings();
      refreshAll();
      return toast("Trainings zote zime-clear.");
    }
    if (action === "export") {
      if (!(roleAccessTraining[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Export.");
      exportTrainingsCsv();
      return toast("CSV ya trainings imeshatolewa.");
    }
    if (action === "print") {
      if (!(roleAccessTraining[appRole]?.export ?? false)) return toast("Role yako haina ruhusa ya Print.");
      return window.print();
    }
    if (!id) return;

    if (action === "viewTraining") toast(`Training #${id} details panel iko tayari.`);
    if (action === "editTraining") {
      await updateTraining(id, { status: "Active" });
      refreshAll();
      toast("Training imesasishwa.");
    }
    if (action === "deleteTraining") {
      if (!(roleAccessTraining[appRole]?.delete ?? false)) return toast("Role yako haina ruhusa ya Delete.");
      await deleteTraining(id);
      refreshAll();
      toast("Training imefutwa.");
    }
    if (action === "registerParticipants") {
      if (!(roleAccessTraining[appRole]?.register ?? false)) return toast("Role yako haina ruhusa ya register participants.");
      await registerParticipants(id);
      refreshAll();
      toast("Participants wameongezwa.");
    }
    if (action === "uploadMaterials") {
      if (!(roleAccessTraining[appRole]?.upload ?? false)) return toast("Role yako haina ruhusa ya upload materials.");
      await uploadMaterials(id, "training-material.pdf");
      refreshAll();
      toast("Materials placeholder imeongezwa.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara"])) return;
  installGlobalCrashGuards("phase27_education_training");
  renderMiniModules();
  renderFormSelects();
  clearForm();
  try {
    await loadEducationTrainingData();
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
