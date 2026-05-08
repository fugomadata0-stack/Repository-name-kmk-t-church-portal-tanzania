import { getDayosisiOptions, getJimboOptions, getStructureRows, logStructureActivity, setStructureRows } from "./phase4-structure-services.js";
import { getDefaultModule, moduleMeta } from "./phase4-structure-hooks.js";

const modules = [
  { key: "dayosisi", label: "Usimamizi wa Dayosisi" },
  { key: "majimbo", label: "Usimamizi wa Majimbo" },
  { key: "matawi", label: "Usimamizi wa Matawi" },
  { key: "ofisi_kuu", label: "Ofisi Kuu" },
  { key: "idara", label: "Idara" },
  { key: "hierarchy", label: "Hierarchy View" },
  { key: "map", label: "Location Map Placeholder" },
];

let currentModule = getDefaultModule();
let selectedId = null;
let editId = null;
let page = 1;
const perPage = 6;
let loading = false;
let currentRole = "member";
let currentHierarchyView = "tree";

const localUnitLabels = ["Tawi", "Parokia", "Kituo cha Huduma", "Ushirika", "Mission Point", "Fellowship Center"];

const permissions = {
  chief_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true },
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true },
  askofu_mkuu: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true },
  mchungaji: { add: true, edit: true, delete: false, clear: false, export: false, print: true, view: true },
  member: { add: false, edit: false, delete: false, clear: false, export: false, print: false, view: true },
};

function can(action) {
  return !!(permissions[currentRole] || permissions.member)[action];
}

function toast(msg) {
  const wrap = document.getElementById("toastWrap");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function renderTabs() {
  const tabs = document.getElementById("moduleTabs");
  tabs.innerHTML = modules
    .map((m) => `<button class="tab-btn ${m.key === currentModule ? "active" : ""}" data-tab="${m.key}">${m.label}</button>`)
    .join("");
}

function getCurrentRows() {
  if (!moduleMeta[currentModule]) return [];
  return getStructureRows(currentModule);
}

function renderHeader() {
  const meta = moduleMeta[currentModule];
  document.getElementById("moduleTitle").textContent = meta ? meta.title : "Module";
  document.getElementById("moduleSubtitle").textContent = meta
    ? meta.subtitle
    : "Chagua module yenye data table. Taarifa hizi huingizwa na Super Admin na Katibu.";
  document.getElementById("tableTitle").textContent = meta ? meta.tableTitle : "Module Table";
}

function renderKpis() {
  const meta = moduleMeta[currentModule];
  const rows = getCurrentRows();
  const wrap = document.getElementById("moduleKpis");
  if (!meta) {
    wrap.innerHTML = `<article class="kpi"><p>Info</p><h4>0</h4></article>`;
    return;
  }
  const activeCount = rows.filter((r) => r.status === "active").length;
  const kpiValues = [rows.length, activeCount, rows.length, rows.reduce((n, r) => n + Number(r.matawi || 0), 0)];
  wrap.innerHTML = meta.kpis.map((k, i) => `<article class="kpi"><p>${k}</p><h4>${kpiValues[i] ?? rows.length}</h4></article>`).join("");
}

function renderFilters() {
  const meta = moduleMeta[currentModule];
  const bar = document.getElementById("filtersBar");
  if (!meta) return (bar.innerHTML = `<div class="empty">Module hii haina filters za table.</div>`);
  const rows = getCurrentRows();
  const filterControls = meta.filters
    .map((f) => {
      if (f === "search") return `<input id="f_search" placeholder="Search by name" />`;
      const values = [...new Set(rows.map((r) => r[f] || r[f === "status" ? "status" : "mkoa"]).filter(Boolean))];
      return `<select id="f_${f}"><option value="">Filter by ${f}</option>${values.map((v) => `<option>${v}</option>`).join("")}</select>`;
    })
    .join("");
  bar.innerHTML = `${filterControls}<button class="btn gold" id="filterApplyBtn">Apply</button>`;
}

function filteredRows() {
  const meta = moduleMeta[currentModule];
  if (!meta) return [];
  let rows = getCurrentRows();
  const search = (document.getElementById("f_search")?.value || "").toLowerCase();
  if (search) rows = rows.filter((r) => String(r.jina || "").toLowerCase().includes(search));
  meta.filters.forEach((f) => {
    if (f === "search") return;
    const val = document.getElementById(`f_${f}`)?.value || "";
    if (!val) return;
    rows = rows.filter((r) => String(r[f] || r.mkoa || r.status) === val);
  });
  return rows;
}

function renderTable() {
  const meta = moduleMeta[currentModule];
  const head = document.getElementById("tableHeadRow");
  const body = document.getElementById("tableBody");
  if (!meta) {
    head.innerHTML = "";
    body.innerHTML = `<tr><td class="empty">Module hii ni preview panel, si data table.</td></tr>`;
    return;
  }

  const rows = filteredRows();
  head.innerHTML = meta.columns.map((c) => `<th>${meta.labels[c] || c}</th>`).join("") + "<th>Actions</th>";
  if (loading) {
    body.innerHTML = `<tr><td colspan="${meta.columns.length + 1}" class="loading">Loading data...</td></tr>`;
    return;
  }
  if (!rows.length) {
    if (currentModule === "majimbo") {
      body.innerHTML = `<tr><td colspan="${meta.columns.length + 1}" class="empty">Majimbo bado hayajaongezwa<br/><button class="btn gold" id="addMajimboNowBtn">Ongeza Majimbo Sasa</button></td></tr>`;
      return;
    }
    body.innerHTML = `<tr><td colspan="${meta.columns.length + 1}" class="empty">Hakuna data. Bonyeza Add kuanza.</td></tr>`;
    return;
  }
  const start = (page - 1) * perPage;
  const list = rows.slice(start, start + perPage);
  body.innerHTML = list
    .map(
      (row) => `<tr>
      ${meta.columns.map((c) => (c === "status" ? `<td><span class="status ${row[c]}">${row[c]}</span></td>` : `<td>${row[c] ?? "-"}</td>`).join("")}
      <td>
        <button class="btn" data-action="view" data-id="${row.id}">View</button>
        <button class="btn" data-action="edit" data-id="${row.id}">Edit</button>
        <button class="btn danger" data-action="delete" data-id="${row.id}">Delete</button>
      </td>
    </tr>`
    )
    .join("");
  document.getElementById("pageInfo").textContent = `Page ${page}/${Math.max(1, Math.ceil(rows.length / perPage))}`;
}

function renderForm() {
  const meta = moduleMeta[currentModule];
  if (!meta) {
    document.getElementById("formGuide").innerHTML = `<div class="empty">Module hii haina form ya data.</div>`;
    return;
  }
  document.getElementById("formGuide").innerHTML = `
    <p><strong>Module:</strong> ${meta.title}</p>
    <p><strong>Fields:</strong> ${meta.formFields.length}</p>
    <p><strong>Validation:</strong> Required fields + email/simu format + dependent dropdowns.</p>
    <p><strong>Role:</strong> ${currentRole}</p>
  `;
}

function fieldLabel(meta, key) {
  return meta.labels[key] || key.replaceAll("_", " ");
}

function renderModalForm(mode, row = null) {
  const meta = moduleMeta[currentModule];
  const form = document.getElementById("entityForm");
  const title = document.getElementById("formModalTitle");
  const errorEl = document.getElementById("formError");
  errorEl.textContent = "";
  title.textContent = mode === "edit" ? `Edit ${meta.title}` : `Add ${meta.title}`;

  form.innerHTML = meta.formFields
    .map((f) => {
      const value = row?.[f] ?? "";
      const label = fieldLabel(meta, f);
      const full = ["maelezo", "notes"].includes(f) ? "full" : "";
      if (f === "status") {
        return `<div class="field-wrap ${full}"><label>${label}</label><select name="status"><option ${value === "active" ? "selected" : ""}>active</option><option ${value === "inactive" ? "selected" : ""}>inactive</option></select></div>`;
      }
      if (f === "unit_type") {
        return `<div class="field-wrap"><label>${label}</label><select name="unit_type">${localUnitLabels
          .map((item) => `<option ${item === value ? "selected" : ""}>${item}</option>`)
          .join("")}</select></div>`;
      }
      if (f === "dayosisi_id") {
        const selectedDayosisiId = row?.dayosisi_id || "";
        return `<div class="field-wrap"><label>Chagua Dayosisi</label><select name="dayosisi_id" id="formDayosisi"><option value="">Chagua Dayosisi</option>${getDayosisiOptions()
          .map((d) => `<option value="${d.id}" ${String(selectedDayosisiId) === String(d.id) ? "selected" : ""}>${d.jina}</option>`)
          .join("")}</select></div>`;
      }
      if (f === "dayosisi") {
        return `<input type="hidden" name="dayosisi" value="${value}" />`;
      }
      if (f === "jimbo_id") {
        const selectedDayosisi = row?.dayosisi || "";
        const selectedDayosisiId = row?.dayosisi_id || "";
        const options = getJimboOptions(selectedDayosisi, selectedDayosisiId);
        const selectedJimboId = row?.jimbo_id || "";
        return `<div class="field-wrap"><label>Chagua Jimbo</label><select name="jimbo_id" id="formJimbo"><option value="">Chagua Jimbo</option>${options
          .map((j) => `<option value="${j.id}" ${String(selectedJimboId) === String(j.id) ? "selected" : ""}>${j.jina}</option>`)
          .join("")}</select></div>`;
      }
      if (f === "jimbo") return `<input type="hidden" name="jimbo" value="${value}" />`;
      if (f === "maelezo" || f === "notes") {
        return `<div class="field-wrap full"><label>${label}</label><textarea name="${f}" placeholder="${label}">${value}</textarea></div>`;
      }
      return `<div class="field-wrap ${full}"><label>${label}</label><input name="${f}" value="${value}" placeholder="${label}" /></div>`;
    })
    .join("");

  const dayosisiSelect = document.getElementById("formDayosisi");
  const jimboSelect = document.getElementById("formJimbo");
  if (dayosisiSelect && jimboSelect) {
    if (mode === "add" && !dayosisiSelect.value && dayosisiSelect.options.length > 1) {
      dayosisiSelect.selectedIndex = 1;
      const options = getJimboOptions("", dayosisiSelect.value);
      jimboSelect.innerHTML = `<option value="">Chagua Jimbo</option>${options.map((j) => `<option value="${j.id}">${j.jina}</option>`).join("")}`;
      if (jimboSelect.options.length > 1) jimboSelect.selectedIndex = 1;
    }
    dayosisiSelect.addEventListener("change", () => {
      const options = getJimboOptions("", dayosisiSelect.value);
      jimboSelect.innerHTML = `<option value="">Chagua Jimbo</option>${options.map((j) => `<option value="${j.id}">${j.jina}</option>`).join("")}`;
      if (jimboSelect.options.length > 1) jimboSelect.selectedIndex = 1;
    });
  }
}

function validateForm(meta, payload) {
  const required = meta.requiredFields || ["jina", "code", "status"];
  for (const key of required) {
    if (!String(payload[key] || "").trim()) return `${fieldLabel(meta, key)} inahitajika.`;
  }
  if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) return "Email sio sahihi.";
  if (payload.simu && !/^[0-9+\-\s]{7,20}$/.test(payload.simu)) return "Namba ya simu sio sahihi.";
  return "";
}

function syncRelationalNames(payload) {
  if (payload.dayosisi_id) {
    const found = getDayosisiOptions().find((d) => String(d.id) === String(payload.dayosisi_id));
    payload.dayosisi = found?.jina || payload.dayosisi || "";
  }
  if (payload.jimbo_id) {
    const found = getJimboOptions(payload.dayosisi, payload.dayosisi_id).find((j) => String(j.id) === String(payload.jimbo_id));
    payload.jimbo = found?.jina || payload.jimbo || "";
  }
  return payload;
}

function normalizePayloadValues(payload) {
  const normalized = { ...payload };
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) {
      normalized[key] = "";
      return;
    }
    if (key.toLowerCase().includes("email")) {
      normalized[key] = trimmed.toLowerCase();
      return;
    }
    normalized[key] = trimmed.toUpperCase();
  });
  return normalized;
}

function applyRolePermissions() {
  const map = {
    addBtn: "add",
    editBtn: "edit",
    deleteBtn: "delete",
    clearBtn: "clear",
    exportBtn: "export",
    printBtn: "print",
    viewBtn: "view",
  };
  Object.entries(map).forEach(([id, action]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const allowed = can(action);
    el.disabled = !allowed;
    el.style.opacity = allowed ? "1" : "0.45";
    el.title = allowed ? "" : "Huna ruhusa ya action hii";
  });
}

function hierarchyData() {
  const dayosisi = getStructureRows("dayosisi");
  const majimbo = getStructureRows("majimbo");
  const units = getStructureRows("matawi");
  const dayoNodes = dayosisi
    .map((d) => {
      const jimboNodes = majimbo
        .filter((j) => String(j.dayosisi_id) === String(d.id))
        .map((j) => {
          const unitNodes = units
            .filter((u) => String(u.jimbo_id) === String(j.id))
            .map((u) => `<li>${u.unit_type || "Tawi"}: ${u.jina}</li>`)
            .join("");
          return `<li><button class="btn" data-tree="toggle">${j.jina}</button><ul class="children">${unitNodes || "<li>Matawi bado hayajaongezwa</li>"}</ul></li>`;
        })
        .join("");
      return `<li><button class="btn" data-tree="toggle">${d.jina}</button><ul class="children">${jimboNodes || '<li>Majimbo bado hayajaongezwa <button class="btn gold" id="addMajimboNowBtn">Ongeza Majimbo Sasa</button></li>'}</ul></li>`;
    })
    .join("");
  return `
    <li><button class="btn" data-tree="toggle">KMK(T) National Headquarters</button>
      <ul class="children">
        ${dayoNodes}
        <li><button class="btn" data-tree="toggle">Custom Future Levels</button><ul class="children"><li>Bonyeza Add Hierarchy Level</li></ul></li>
      </ul>
    </li>
  `;
}

function renderHierarchyCards() {
  const dayosisi = getStructureRows("dayosisi");
  const cardWrap = document.getElementById("cardHierarchyView");
  if (!cardWrap) return;
  cardWrap.innerHTML = dayosisi
    .map((d) => `<article class="kpi"><p>Dayosisi</p><h4>${d.jina}</h4><small>Status: ${d.status}</small></article>`)
    .join("");
}

function renderHierarchyView() {
  const tree = document.getElementById("treeView");
  const org = document.getElementById("orgChartView");
  const cards = document.getElementById("cardHierarchyView");
  const tableWrap = document.querySelector(".table-wrap");
  const tableActions = {
    tree: [tree, tableWrap],
    org: [org],
    table: [tableWrap],
    card: [cards],
  };
  [tree, org, cards, tableWrap].forEach((el) => el?.classList.add("hidden"));
  (tableActions[currentHierarchyView] || [tree]).forEach((el) => el?.classList.remove("hidden"));
  renderHierarchyCards();
}

function bindEvents() {
  document.getElementById("moduleTabs").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const key = t.getAttribute("data-tab");
    if (!key) return;
    currentModule = key;
    page = 1;
    selectedId = null;
    renderAll();
  });

  document.getElementById("filtersBar").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === "filterApplyBtn") renderTable();
  });

  document.getElementById("tableBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const id = Number(t.getAttribute("data-id"));
    const action = t.getAttribute("data-action");
    if (!id || !action) return;
    selectedId = id;
    if (action === "view") toast(`Viewing details for ID ${id}`);
    if (action === "edit") {
      const row = getCurrentRows().find((r) => r.id === id);
      if (!row) return toast("Record haipo.");
      editId = id;
      renderModalForm("edit", row);
      document.getElementById("formModal").classList.add("show");
    }
    if (action === "delete") document.getElementById("confirmModal").classList.add("show");
  });
  document.getElementById("tableBody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id !== "addMajimboNowBtn") return;
    currentModule = "majimbo";
    editId = null;
    renderModalForm("add");
    document.getElementById("formModal").classList.add("show");
  });

  document.getElementById("confirmDeleteBtn").addEventListener("click", () => {
    if (!can("delete")) return toast("Huna ruhusa ya kufuta.");
    const rows = getCurrentRows().filter((r) => r.id !== selectedId);
    setStructureRows(currentModule, rows);
    logStructureActivity("delete", currentModule, `Deleted ID ${selectedId}`);
    document.getElementById("confirmModal").classList.remove("show");
    toast("Record imefutwa.");
    renderAll();
  });
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => document.getElementById("confirmModal").classList.remove("show"));

  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!can("clear")) return toast("Huna ruhusa ya clear.");
    if (!moduleMeta[currentModule]) return toast("Module hii haina table ya clear.");
    setStructureRows(currentModule, []);
    logStructureActivity("clear", currentModule, "Cleared all rows");
    toast("Records zote zimefutwa.");
    renderAll();
  });
  document.getElementById("addBtn").addEventListener("click", () => {
    if (!can("add")) return toast("Huna ruhusa ya kuongeza data.");
    if (!moduleMeta[currentModule]) return toast("Module hii haina data form.");
    editId = null;
    renderModalForm("add");
    document.getElementById("formModal").classList.add("show");
  });
  document.getElementById("editBtn").addEventListener("click", () => {
    if (!can("edit")) return toast("Huna ruhusa ya kuhariri data.");
    if (!selectedId) return toast("Chagua row kwanza.");
    const row = getCurrentRows().find((r) => r.id === selectedId);
    if (!row) return toast("Record haipo.");
    editId = selectedId;
    renderModalForm("edit", row);
    document.getElementById("formModal").classList.add("show");
  });
  document.getElementById("deleteBtn").addEventListener("click", () => {
    if (!can("delete")) return toast("Huna ruhusa ya kufuta data.");
    if (!selectedId) return toast("Chagua row kwanza.");
    document.getElementById("confirmModal").classList.add("show");
  });
  document.getElementById("viewBtn").addEventListener("click", () => {
    if (!can("view")) return toast("Huna ruhusa ya view.");
    toast(selectedId ? `Viewing ID ${selectedId}` : "Chagua row kwanza.");
  });
  document.getElementById("exportBtn").addEventListener("click", () => {
    if (!can("export")) return toast("Huna ruhusa ya export.");
    logStructureActivity("export", currentModule, "Export requested");
    toast("Export feature prepared (CSV/Excel ready).");
  });
  document.getElementById("printBtn").addEventListener("click", () => {
    if (!can("print")) return toast("Huna ruhusa ya print.");
    logStructureActivity("print", currentModule, "Print requested");
    window.print();
  });

  document.getElementById("prevBtn").addEventListener("click", () => {
    page = Math.max(1, page - 1);
    renderTable();
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    page += 1;
    renderTable();
  });

  document.getElementById("cancelFormBtn").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("formModal").classList.remove("show");
  });
  document.getElementById("saveFormBtn").addEventListener("click", (e) => {
    e.preventDefault();
    const meta = moduleMeta[currentModule];
    if (!meta) return;
    const fd = new FormData(document.getElementById("entityForm"));
    const payload = normalizePayloadValues(Object.fromEntries(fd.entries()));
    syncRelationalNames(payload);
    const error = validateForm(meta, payload);
    if (error) {
      document.getElementById("formError").textContent = error;
      return;
    }
    const rows = getCurrentRows();
    const next = editId
      ? rows.map((r) => (r.id === editId ? { ...r, ...payload } : r))
      : [{ id: Date.now(), ...payload }, ...rows];
    setStructureRows(currentModule, next);
    logStructureActivity(editId ? "edit" : "add", currentModule, `${payload.jina || "record"} saved`);
    document.getElementById("formModal").classList.remove("show");
    toast(editId ? "Record imehaririwa." : "Record imeongezwa.");
    renderAll();
  });

  const tree = document.getElementById("treeView");
  tree.innerHTML = hierarchyData();
  tree.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.getAttribute("data-tree") !== "toggle") return;
    const next = t.nextElementSibling;
    if (next) next.classList.toggle("hidden");
  });
  document.getElementById("expandTreeBtn").addEventListener("click", () => {
    tree.querySelectorAll(".children").forEach((el) => el.classList.remove("hidden"));
  });
  document.getElementById("collapseTreeBtn").addEventListener("click", () => {
    tree.querySelectorAll(".children").forEach((el) => el.classList.add("hidden"));
  });
  document.getElementById("hierarchySearch").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    tree.querySelectorAll("li").forEach((li) => {
      li.style.display = !q || li.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  });
  document.getElementById("treeViewBtn").addEventListener("click", () => {
    currentHierarchyView = "tree";
    renderHierarchyView();
  });
  document.getElementById("orgViewBtn").addEventListener("click", () => {
    currentHierarchyView = "org";
    renderHierarchyView();
  });
  document.getElementById("tableViewBtn").addEventListener("click", () => {
    currentHierarchyView = "table";
    renderHierarchyView();
  });
  document.getElementById("cardViewBtn").addEventListener("click", () => {
    currentHierarchyView = "card";
    renderHierarchyView();
  });
  const hierarchyActions = {
    addLevelBtn: "Add Hierarchy Level",
    addCategoryBtn: "Add Category",
    addTypeBtn: "Add Type",
    addFieldBtn: "Add Custom Field",
    addSectionBtn: "Add Custom Section",
    archiveNodeBtn: "Archive",
    reorderNodeBtn: "Reorder",
    toggleNodeBtn: "Enable/Disable",
  };
  Object.entries(hierarchyActions).forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => {
      logStructureActivity("hierarchy_action", "hierarchy", label);
      toast(`${label} imeandaliwa kwenye hierarchy section.`);
    });
  });
}

function renderAll() {
  applyRolePermissions();
  renderTabs();
  renderHeader();
  renderKpis();
  renderFilters();
  renderTable();
  renderForm();
  const tree = document.getElementById("treeView");
  if (tree) tree.innerHTML = hierarchyData();
  renderHierarchyView();
}

const sessionRaw = localStorage.getItem("kmt_session");
if (sessionRaw) {
  try {
    currentRole = JSON.parse(sessionRaw).role || "member";
  } catch (error) {
    currentRole = "member";
  }
}

renderAll();
bindEvents();
