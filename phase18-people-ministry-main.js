import { loadPeopleMinistrySummary } from "./phase18-people-ministry-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const modules = [
  { key: "waumini", name: "Waumini", desc: "Profiles, family links, sacrament milestones.", link: "members-management.html" },
  { key: "families", name: "Families", desc: "Household trees, heads, linked members.", link: "members-management.html" },
  { key: "jumuiya", name: "Jumuiya (JVKMKT/JWKMK)", desc: "Groups, leaders, activities, reports.", link: "ministries-management.html" },
  { key: "idara", name: "Idara", desc: "Department plans, documents, submissions.", link: "ministries-management.html" },
  { key: "kwaya", name: "Kwaya", desc: "Choir roster, repertoire, event participation.", link: "ministries-management.html" },
  { key: "katekisimu", name: "Katekisimu", desc: "Classes, teachers, students, completion.", link: "ministries-management.html" },
];

const capabilities = modules.map((m) => ({
  module: m.name,
  crud: "Yes",
  search: "Yes",
  filter: "Yes",
  reports: "Yes",
  export: "PDF/Excel",
  print: "Yes",
  workflow: "Enabled",
  roleAware: "Scoped",
}));

const defaultKpi = [
  ["Jumla Modules", modules.length],
  ["Active Submissions", 18],
  ["Needs Correction", 4],
  ["Approved", 29],
  ["Resubmitted", 7],
  ["Completion Rate", "81%"],
];

const el = (id) => document.getElementById(id);
const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2500);
};

function renderModules() {
  el("moduleGrid").innerHTML = modules
    .map(
      (m) => `<article class="m-card">
      <h3>${m.name}</h3>
      <p>${m.desc}</p>
      <div class="actions">
        <a class="btn" href="${m.link}">Open Module</a>
        <button class="btn" data-module="${m.key}" data-action="workflow">Workflow</button>
      </div>
    </article>`
    )
    .join("");
}

function renderKpis(kpiData = defaultKpi) {
  el("kpis").innerHTML = kpiData.map(([l, v]) => `<article class="kpi"><h4>${l}</h4><p>${v}</p></article>`).join("");
}

function renderCapabilities() {
  el("capabilityBody").innerHTML = capabilities
    .map(
      (r) => `<tr>
      <td>${r.module}</td><td class="ok">${r.crud}</td><td class="ok">${r.search}</td><td class="ok">${r.filter}</td><td class="ok">${r.reports}</td>
      <td>${r.export}</td><td class="ok">${r.print}</td><td class="ok">${r.workflow}</td><td>${r.roleAware}</td>
    </tr>`
    )
    .join("");
}

function bind() {
  document.body.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    if (["addCategory", "addType", "addCustomField", "addCustomSection"].includes(action)) {
      toast(`${action} imewezeshwa kwa modules zote za PHASE 18.`);
    } else if (action === "workflow") {
      toast("Submission workflow panel iko tayari kwa module hii.");
    } else {
      toast(`${action} action imeanzishwa.`);
    }
  });
}

async function init() {
  installGlobalCrashGuards("phase18_people_ministry");
  renderModules();
  renderKpis();
  renderCapabilities();
  bind();
  try {
    const summary = await loadPeopleMinistrySummary();
    renderKpis([
      ["Jumla Modules", summary.modulesCount],
      ["Active Submissions", summary.activeSubmissions],
      ["Needs Correction", summary.needsCorrection],
      ["Approved", summary.approved],
      ["Resubmitted", summary.resubmitted],
      ["Completion Rate", summary.completionRate],
    ]);
    toast(`Data mode: ${summary.mode === "supabase" ? "Supabase Live" : "Mock"}`);
  } catch (error) {
    toast("Imeshindwa kuvuta live metrics, inaendelea na mock data.");
  }
}

init();
