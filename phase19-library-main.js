import { installGlobalCrashGuards } from "./phase-integration-core.js";

const modules = [
  "Machapisho ya Kanisa", "Katiba", "Katekisimu", "Tenzi", "Vitabu", "Miongozo",
  "Media / News / Gallery", "Official Documents", "Circulars", "Minutes", "Reports", "Policies",
];

let docs = [
  { id: 1, title: "Katiba ya KMT", category: "Katiba", type: "Policy", tags: "katiba,official", access: "Public", stage: "Publish", version: "v3.2", downloads: 1289, updated: "2026-04-20", preview: "Katiba rasmi ya KMT, toleo la sasa.", isPublic: true },
  { id: 2, title: "Mwongozo wa Katekisimu", category: "Katekisimu", type: "Guide", tags: "katekisimu,mafunzo", access: "Internal", stage: "Review", version: "v1.4", downloads: 245, updated: "2026-04-18", preview: "Mwongozo wa walimu wa darasa la katekisimu.", isPublic: false },
  { id: 3, title: "Minutes: Mkutano Mkuu", category: "Minutes", type: "Minutes", tags: "minutes,executive", access: "Restricted", stage: "Draft", version: "v0.9", downloads: 34, updated: "2026-04-22", preview: "Dakika za mkutano mkuu wa viongozi.", isPublic: false },
  { id: 4, title: "Tenzi za Ibada", category: "Tenzi", type: "Book", tags: "tenzi,worship", access: "Public", stage: "Publish", version: "v2.1", downloads: 809, updated: "2026-04-12", preview: "Collection ya tenzi kwa ibada na makongamano.", isPublic: true },
];

const galleryData = [
  { title: "News: Mkutano wa Vijana", img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80" },
  { title: "Gallery: Kwaya Taifa", img: "https://images.unsplash.com/photo-1461773518188-b3e86f98242f?auto=format&fit=crop&w=900&q=80" },
  { title: "News: Dayosisi Outreach", img: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80" },
];

const el = (id) => document.getElementById(id);
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };
const badge = (v, cls) => `<span class="status ${cls}">${v}</span>`;

function renderModules() {
  el("moduleGrid").innerHTML = modules.map((m) => `<article class="m">${m}</article>`).join("");
}

function filteredDocs() {
  const q = (el("searchInput").value || "").toLowerCase();
  const c = el("categoryFilter").value;
  const v = el("visibilityFilter").value;
  const s = el("stageFilter").value;
  return docs.filter((d) => {
    const mQ = !q || [d.title, d.tags, d.category].join(" ").toLowerCase().includes(q);
    const mC = !c || d.category === c;
    const mV = !v || d.access === v;
    const mS = !s || d.stage === s;
    return mQ && mC && mV && mS;
  });
}

function renderFilters() {
  const categories = [...new Set(docs.map((d) => d.category))];
  el("categoryFilter").innerHTML = `<option value="">Category zote</option>${categories.map((c) => `<option>${c}</option>`).join("")}`;
}

function renderDocs() {
  const rows = filteredDocs();
  el("docBody").innerHTML = rows.length
    ? rows.map((d) => `<tr>
      <td>${d.title}</td><td>${d.category}</td><td>${d.type}</td><td>${d.tags}</td>
      <td>${badge(d.access, d.access.toLowerCase())}</td><td>${badge(d.stage, d.stage.toLowerCase())}</td>
      <td>${d.version}</td><td>${d.downloads}</td><td>${d.updated}</td>
      <td>
        <button class="btn tiny" data-action="preview" data-id="${d.id}">PDF Preview</button>
        <button class="btn tiny" data-action="download" data-id="${d.id}">Download</button>
        <button class="btn tiny" data-action="version" data-id="${d.id}">New Version</button>
      </td>
    </tr>`).join("")
    : `<tr><td colspan="10">Hakuna records kwa filter uliyochagua.</td></tr>`;
}

function renderGallery() {
  el("gallery").innerHTML = galleryData.map((g) => `<article class="g"><img src="${g.img}" alt="${g.title}" /><p>${g.title}</p></article>`).join("");
}

function updatePreview(id) {
  const row = docs.find((d) => d.id === id);
  if (!row) return;
  el("pdfPreview").innerHTML = `
    <h3>${row.title}</h3>
    <p><b>Version:</b> ${row.version}</p>
    <p><b>Access:</b> ${row.access}</p>
    <p><b>Summary:</b> ${row.preview}</p>
    <p><b>Generated:</b> ${new Date().toLocaleDateString("sw-TZ")}</p>
  `;
}

function bind() {
  ["searchInput", "categoryFilter", "visibilityFilter", "stageFilter"].forEach((id) => {
    el(id).addEventListener("input", renderDocs);
    el(id).addEventListener("change", renderDocs);
  });
  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;
    if (action === "preview") updatePreview(id);
    if (action === "download") {
      const row = docs.find((d) => d.id === id);
      if (row) row.downloads += 1;
      renderDocs();
      toast("Download counter updated.");
    }
    if (action === "version") {
      const row = docs.find((d) => d.id === id);
      if (row) {
        const parts = row.version.replace("v", "").split(".");
        const major = Number(parts[0] || "1");
        const minor = Number(parts[1] || "0") + 1;
        row.version = `v${major}.${minor}`;
      }
      renderDocs();
      toast("Version mpya imehifadhiwa.");
    }
    if (["addCategory","addType","addTag","addAccessLevel","exportPdf","exportExcel","print"].includes(action)) {
      if (action === "print") window.print();
      else toast(`${action} action imewezeshwa.`);
    }
  });
}

function init() {
  installGlobalCrashGuards("phase19_library");
  renderModules();
  renderFilters();
  renderDocs();
  renderGallery();
  bind();
}

init();
