import { mediaRoleAccess, mediaFields } from "./phase12-media-hooks.js";
import {
  loadMediaData, getMode, getMedia, getFeatured, getCategories, getStreams,
  saveMedia, saveFeatured, saveStream, deleteMedia, clearMedia, logMediaActivity,
} from "./phase12-media-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let currentRole = localStorage.getItem("mock_role") || "admin";
let formMeta = { id: null };
let deleteId = null;
const can = (k) => !!(mediaRoleAccess[currentRole] || mediaRoleAccess.member)[k];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (v) => `<span class="status ${String(v || "").toLowerCase()}">${v || "-"}</span>`;
const csv = (rows) => { if (!rows.length) return ""; const k = Object.keys(rows[0]); return [k.join(","), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n"); };
const download = (n, rows) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" })); a.download = `${n}.csv`; a.click(); URL.revokeObjectURL(a.href); };

function renderKpis() {
  const rows = getMedia();
  const videos = rows.filter((x) => x.type === "Video").length;
  const audios = rows.filter((x) => x.type === "Audio").length;
  const docs = rows.filter((x) => ["PDF", "DOC", "PPT"].includes(x.type)).length;
  const downloads = rows.length * 7;
  const live = getStreams().length;
  const storage = `${(rows.length * 0.28).toFixed(1)} GB`;
  const featured = getFeatured().length;
  const newUploads = rows.filter((x) => x.date >= "2026-04-20").length;
  const data = [
    ["k1", "Video Mahubiri", videos], ["k2", "Audio Mahubiri", audios], ["k3", "Documents", docs], ["k4", "Downloads", downloads],
    ["k5", "Live Sessions", live], ["k6", "Storage Used", storage], ["k7", "Featured Sermons", featured], ["k8", "New Uploads", newUploads],
  ];
  el("kpiGrid").innerHTML = data.map(([k, l, v]) => `<article class="kpi ${k}"><p>${l}</p><h3>${v}</h3></article>`).join("");
}

function actions(id) {
  return `<button class="btn tiny" data-a="view" data-id="${id}">View</button><button class="btn tiny" data-a="download" data-id="${id}">Download</button><button class="btn tiny" data-a="feature" data-id="${id}" ${can("feature") ? "" : "disabled"}>Feature</button><button class="btn tiny" data-a="share" data-id="${id}" ${can("share") ? "" : "disabled"}>Share</button><button class="btn tiny" data-a="edit" data-id="${id}" ${can("edit") ? "" : "disabled"}>Edit</button><button class="btn tiny danger" data-a="delete" data-id="${id}" ${can("delete") ? "" : "disabled"}>Delete</button>`;
}

function renderMediaTable() {
  el("mediaBody").innerHTML = getMedia().map((r) => `<tr><td>${r.id}</td><td>${r.thumbnail || "-"}</td><td>${r.title}</td><td>${r.type}</td><td>${r.category}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td><td>${r.speaker}</td><td>${r.date}</td><td>${badge(r.visibility)}</td><td>${badge(r.status)}</td><td>${actions(r.id)}</td></tr>`).join("") || `<tr><td colspan="13">No media</td></tr>`;
}

function renderFeatured() {
  el("featuredGrid").innerHTML = getFeatured().map((f) => `<article class="feature-card"><div class="thumb">${f.thumbnail || "THUMB"}</div><h4>${f.title}</h4><p>${f.speaker}</p><p>${f.scripture || "-"}</p><p>${f.duration || "-"}</p><div class="actions"><button class="btn tiny">View</button><button class="btn tiny">Download</button></div></article>`).join("") || `<p>No featured sermons.</p>`;
}

function renderLive() {
  const defaults = [
    { title: "Current stream placeholder", detail: "Live now placeholder" },
    { title: "Upcoming stream", detail: "Next Sunday 09:00" },
    { title: "Schedule", detail: "Weekly services schedule placeholder" },
    { title: "Streaming settings placeholder", detail: "Bitrate/Key/Platform placeholder" },
  ];
  const streams = getStreams();
  const cards = streams.length ? streams.map((s) => ({ title: s.title, detail: `${s.kind || "-"} • ${s.schedule || "-"}` })) : defaults;
  el("liveGrid").innerHTML = cards.map((c) => `<article class="live-card"><h4>${c.title}</h4><p>${c.detail}</p></article>`).join("");
}

function openForm(row = null) {
  formMeta = { id: row?.id || null };
  el("formTitle").textContent = `${row ? "Edit" : "Upload"} Media`;
  el("formBody").innerHTML = mediaFields.map((f) => {
    const v = row?.[f.key] ?? "";
    if (f.options) return `<label>${f.label}<select name="${f.key}">${f.options.map((o) => `<option value="${o}" ${String(v) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("");
  el("formModal").classList.add("open");
}
function closeForm() { el("formModal").classList.remove("open"); formMeta = { id: null }; el("formError").textContent = ""; }
function askDelete(id) { deleteId = id; el("confirmTitle").textContent = `Delete media ${id}`; el("confirmModal").classList.add("open"); }
function closeDelete() { deleteId = null; el("confirmModal").classList.remove("open"); }

async function saveForm() {
  const payload = Object.fromEntries(new FormData(el("formBody")).entries());
  try {
    await saveMedia(payload, formMeta.id);
    await logMediaActivity(currentRole, formMeta.id ? "edit" : "create", "Saved media", payload);
    closeForm(); refresh(); toast("Saved media.");
  } catch (e) { toast(e.message || "Save failed"); }
}

async function doDelete() {
  if (!deleteId) return;
  try {
    await deleteMedia(deleteId);
    await logMediaActivity(currentRole, "delete", "Deleted media", { id: deleteId });
    closeDelete(); refresh(); toast("Deleted media.");
  } catch (e) { toast(e.message || "Delete failed"); }
}

async function handleAction(a, id) {
  const row = getMedia().find((x) => String(x.id) === String(id)); if (!row) return;
  if (a === "view") toast(`Viewing ${row.title}`);
  if (a === "download") toast(`Download started for ${row.title} (placeholder).`);
  if (a === "share") toast(`Share link copied (placeholder).`);
  if (a === "edit" && can("edit")) openForm(row);
  if (a === "delete" && can("delete")) askDelete(id);
  if (a === "feature" && can("feature")) {
    await saveFeatured({ media_id: row.id, title: row.title, speaker: row.speaker, scripture: row.scripture || "-", duration: row.duration || "30m", thumbnail: row.thumbnail || "THUMB" });
    await logMediaActivity(currentRole, "feature", "Featured sermon", { media_id: row.id });
    refresh();
  }
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const act = e.target.dataset.action;
    if (!act) return;
    if (act === "upload" && can("add")) openForm();
    if (act === "clear" && can("clear")) { await clearMedia(); refresh(); }
    if (act === "export" && can("export")) download("media-library", getMedia());
  });
  document.body.addEventListener("click", (e) => {
    const a = e.target.dataset.a; const id = e.target.dataset.id; if (!a || !id) return;
    handleAction(a, id);
  });
  el("cancelFormBtn").addEventListener("click", closeForm);
  el("saveFormBtn").addEventListener("click", saveForm);
  el("cancelDeleteBtn").addEventListener("click", closeDelete);
  el("confirmDeleteBtn").addEventListener("click", doDelete);
}

function refresh() {
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${currentRole}`;
  renderKpis(); renderMediaTable(); renderFeatured(); renderLive();
}

async function init() {
  installGlobalCrashGuards("phase12_media");
  await loadMediaData();
  refresh();
  bind();
}
init();
