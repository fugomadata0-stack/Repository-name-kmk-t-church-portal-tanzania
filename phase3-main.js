import { modules, kpis, quickActions, verses, activitySeed, notificationsSeed } from "./phase3-data.js";
import { guardDashboard, exportCsv, logAudit } from "./phase3-services.js";
import { showToast, askConfirm } from "./phase3-ui.js";
import { SupabaseFutureContracts } from "./phase3-contracts.js";
import { ApiAdapter } from "./phase3-adapter.js";
import { getState, moduleSchemas, setSelectedModule, setSelectedRow, subscribe } from "./phase3-store.js";
import { validateEntity } from "./phase3-validation.js";
import { getSupabaseClient } from "./phase3-supabase.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { loadLiveSystemSummary } from "./phase-system-summary-services.js";
import { subscribeRealtimeEnterprise } from "./hooks/use-realtime-enterprise.js";

let activities = [...activitySeed];
let notifications = [...notificationsSeed];
let liveSummaryInterval = null;
let liveSummaryChannel = null;
let stopEnterpriseRealtime = null;

function renderModules() {
  const nav = document.getElementById("mainModules");
  const moduleMap = {
    "Muundo wa Kanisa / Church Structure": "church_structure_page",
    "Usimamizi wa Dayosisi": "dayosisi",
    "Usimamizi wa Majimbo": "majimbo",
    "Usimamizi wa Matawi": "matawi",
    Waumini: "members_page",
    "Idara & Huduma": "people_ministry_center",
    "Huduma ya Kichungaji": "pastoral_care_page",
    "Wageni & Follow-up": "visitor_followup_page",
    "Ratiba za Huduma & Volunteers": "volunteer_scheduling_page",
    "Mali za Kanisa / Assets Register": "assets_register_page",
    "Miradi & Maendeleo": "projects_development_page",
    "Elimu & Mafunzo": "education_training_page",
    "National Calendar / Kalenda Kuu": "national_calendar_page",
    "AI Smart Assistant / Msaidizi Mwerevu": "ai_smart_page",
    "PHASE 30 Unified Platform": "phase30_unified_page",
    "Matukio & Makambi": "events_camps_page",
    "Payments & Donation Gateway": "payments_page",
    "Mahubiri & Media": "digital_library_center",
    Mawasiliano: "comms_page",
    "Viongozi wa Kanisa": "leadership_page",
    Mahudhurio: "attendance_page",
    Ripoti: "reports_page",
    Mipangilio: "settings_page",
    "Fedha & Michango": "finance_page",
    "Vyanzo vya Mapato": "vyanzo_mapato",
    Usalama: "access_control_page",
    "Omba Ruhusa ya Juu": "elevated_access_request_page",
    "Usajili wa Mialiko na Upandishaji (Admin)": "phase32_invite_promote_page",
    "Maombi ya Usajili (Approval)": "phase33_registration_requests_page",
    "Nyaraka Rasmi": "documents_approval_workflow",
    "Usimamizi wa Watumiaji wa Mfumo": "phase12_user_management_page",
    "Afya ya Mfumo": "system_health_page",
    Logs: "super_admin_control_center",
  };
  const groups = [
    ["DASHIBODI KUU", ["Dashibodi Kuu", "Ripoti", "Fedha & Michango", "Vyanzo vya Mapato", "Afya ya Mfumo"]],
    ["MUUNDO WA KANISA", ["Muundo wa Kanisa / Church Structure", "Usimamizi wa Dayosisi", "Usimamizi wa Majimbo", "Usimamizi wa Matawi"]],
    ["UONGOZI", ["Viongozi wa Kanisa"]],
    ["WAUMINI NA HUDUMA", ["Waumini", "Idara & Huduma", "Huduma ya Kichungaji", "Wageni & Follow-up", "Ratiba za Huduma & Volunteers", "Mali za Kanisa / Assets Register", "Miradi & Maendeleo", "Elimu & Mafunzo", "National Calendar / Kalenda Kuu", "AI Smart Assistant / Msaidizi Mwerevu", "PHASE 30 Unified Platform"]],
    ["HABARI NA MACHAPISHO", ["Mahubiri & Media", "Nyaraka Rasmi"]],
    ["MATUKIO NA RATIBA", ["Matukio & Makambi", "Mahudhurio"]],
    [
      "WATUMIAJI NA RUHUSA",
      ["Usalama", "Omba Ruhusa ya Juu", "Usajili wa Mialiko na Upandishaji (Admin)", "Maombi ya Usajili (Approval)", "Usimamizi wa Watumiaji wa Mfumo", "Logs"],
    ],
    ["MFUMO", ["Mipangilio", "Mawasiliano", "Payments & Donation Gateway"]],
  ];

  const mkLink = (label, i) => {
      const key = moduleMap[label];
      const href =
        key === "church_structure_page"
          ? "church-structure.html"
          : key === "leadership_page"
          ? "leadership-management.html"
          : key === "members_page"
          ? "members-management.html"
          : key === "ministries_page"
          ? "ministries-management.html"
          : key === "events_camps_page"
          ? "events-camps-management.html"
          : key === "payments_page"
          ? "payments-gateway.html"
          : key === "media_page"
          ? "sermons-media.html"
          : key === "comms_page"
          ? "communications-notifications.html"
          : key === "attendance_page"
          ? "attendance-management.html"
          : key === "reports_page"
          ? "reports-analytics.html"
          : key === "settings_page"
          ? "system-settings.html"
          : key === "finance_page"
          ? "finance-management.html"
          : key === "access_control_page"
          ? "access-control-workflow.html"
          : key === "elevated_access_request_page"
          ? "request-elevated-access.html"
          : key === "phase32_invite_promote_page"
          ? "admin-invite-promote.html"
          : key === "phase33_registration_requests_page"
          ? "registration-requests-admin.html"
          : key === "digital_library_center"
          ? "digital-library-center.html"
          : key === "people_ministry_center"
          ? "people-ministry-center.html"
          : key === "pastoral_care_page"
          ? "pastoral-care-module.html"
          : key === "visitor_followup_page"
          ? "visitor-management-module.html"
          : key === "volunteer_scheduling_page"
          ? "volunteer-scheduling-module.html"
          : key === "assets_register_page"
          ? "assets-register-module.html"
          : key === "projects_development_page"
          ? "projects-development-module.html"
          : key === "education_training_page"
          ? "education-training-center.html"
          : key === "national_calendar_page"
          ? "national-calendar-master.html"
          : key === "ai_smart_page"
          ? "ai-smart-assistant.html"
          : key === "phase30_unified_page"
          ? "phase30-unified-platform.html"
          : key === "super_admin_control_center"
          ? "super-admin-control-center.html"
          : key === "documents_approval_workflow"
          ? "documents-approval-workflow.html"
          : key === "phase12_user_management_page"
          ? "phase12-user-management-center.html"
          : key === "system_health_page"
          ? "system-health.html"
          : key
          ? `#module=${key}`
          : "#";
      return `<a class="side-link" href="${href}" data-module-label="${label.toLowerCase()}"><b>${i + 1}.</b> <span>${label}</span></a>`;
    };

  nav.innerHTML = groups
    .map(([groupName, items]) => {
      const links = items.filter((x) => modules.includes(x)).map((label, idx) => mkLink(label, idx)).join("");
      return `<details class="side-group" open><summary>${groupName}</summary><div class="side-group-links">${links}</div></details>`;
    })
    .join("");

  nav.innerHTML += `
    <details class="side-group" open>
      <summary>VIONGOZI WA KANISA</summary>
      <div class="side-group-links">
        <a class="side-link" href="leadership-management.html"><b>1.</b> <span>Dashibodi ya Viongozi wa Kanisa</span></a>
        <a class="side-link" href="viongozi-ngazi-kuu.html"><b>2.</b> <span>Viongozi wa Ngazi Kuu</span></a>
        <a class="side-link" href="viongozi-dayosisi.html"><b>3.</b> <span>Viongozi wa Dayosisi</span></a>
        <a class="side-link" href="maaskofu.html"><b>4.</b> <span>Maaskofu</span></a>
        <a class="side-link" href="wachungaji.html"><b>5.</b> <span>Wachungaji</span></a>
        <a class="side-link" href="wainjilisti.html"><b>6.</b> <span>Wainjilisti</span></a>
        <a class="side-link" href="wazee-wa-kanisa.html"><b>7.</b> <span>Wazee wa Kanisa</span></a>
        <a class="side-link" href="mashemasi.html"><b>8.</b> <span>Mashemasi</span></a>
        <a class="side-link" href="waongozi-matawi.html"><b>9.</b> <span>Waongozi wa Matawi / Wasimamizi</span></a>
        <a class="side-link" href="nafasi-zilizo-wazi.html"><b>10.</b> <span>Nafasi Zilizo Wazi</span></a>
        <a class="side-link" href="historia-ya-viongozi.html"><b>11.</b> <span>Historia ya Viongozi</span></a>
        <a class="side-link" href="uhamisho-assignments.html"><b>12.</b> <span>Uhamisho / Assignments</span></a>
        <a class="side-link" href="ripoti-za-viongozi.html"><b>13.</b> <span>Ripoti za Viongozi</span></a>
      </div>
    </details>
  `;

  nav.innerHTML += `
    <details class="side-group" open>
      <summary>WAUMINI & FAMILIA</summary>
      <div class="side-group-links">
        <a class="side-link" href="members-management.html"><b>1.</b> <span>Orodha ya Waumini</span></a>
        <a class="side-link" href="members-management.html#profiles"><b>2.</b> <span>Member Profiles</span></a>
        <a class="side-link" href="members-management.html#families"><b>3.</b> <span>Familia / Households</span></a>
        <a class="side-link" href="members-management.html#baptism"><b>4.</b> <span>Taarifa za Ubatizo</span></a>
        <a class="side-link" href="members-management.html#catechism"><b>5.</b> <span>Katekisimu / Mafunzo ya Imani</span></a>
        <a class="side-link" href="members-management.html#membership-status"><b>6.</b> <span>Membership Status</span></a>
        <a class="side-link" href="members-management.html#talents"><b>7.</b> <span>Talents & Gifts</span></a>
        <a class="side-link" href="members-management.html#attendance"><b>8.</b> <span>Mahudhurio ya Waumini</span></a>
        <a class="side-link" href="members-management.html#contributions"><b>9.</b> <span>Michango ya Waumini</span></a>
        <a class="side-link" href="members-management.html#documents"><b>10.</b> <span>Member Documents</span></a>
        <a class="side-link" href="members-management.html#transfers"><b>11.</b> <span>Member Transfers</span></a>
        <a class="side-link" href="members-management.html#reports"><b>12.</b> <span>Member Reports</span></a>
      </div>
    </details>
  `;
}

async function renderKpis() {
  const wrap = document.getElementById("kpiGrid");
  const live = await loadLiveSystemSummary();
  const incomeSources = await ApiAdapter.list("vyanzo_mapato").catch(() => []);
  const map = {
    "Jumla ya Dayosisi": live.totalDayosisi,
    "Jumla ya Majimbo": live.totalMajimbo,
    "Jumla ya Matawi": live.totalMatawi,
    "Jumla ya Waumini": live.totalMembers.toLocaleString(),
    "Jumla ya Viongozi": live.totalLeaders.toLocaleString(),
    "Watumiaji Hai": live.activeUsers.toLocaleString(),
    "Jumla Vyanzo vya Mapato": incomeSources.length.toLocaleString(),
  };
  const kpiRouteMap = {
    "Jumla ya Dayosisi": "church-structure.html#module=dayosisi",
    "Jumla ya Majimbo": "church-structure.html#module=majimbo",
    "Jumla ya Matawi": "church-structure.html#module=matawi",
    "Jumla ya Waumini": "members-management.html",
    "Jumla ya Viongozi": "leadership-management.html",
    "Jumla Vyanzo vya Mapato": "#module=vyanzo_mapato",
    "Makambi Hai": "events-camps-management.html",
    "Michango ya Mwezi": "finance-management.html",
    "Mahudhurio Leo": "attendance-management.html",
    "Media Files": "digital-library-center.html",
    "Watumiaji Hai": "access-control-workflow.html",
  };
  wrap.innerHTML = kpis
    .map(
      ([label, value]) =>
        `<article class="kpi-card" data-kpi-route="${kpiRouteMap[label] || ""}"><p>${label}</p><h4>${map[label] ?? value}</h4></article>`
    )
    .join("");
}

function startLiveSummarySync() {
  if (liveSummaryInterval) clearInterval(liveSummaryInterval);
  liveSummaryInterval = setInterval(() => {
    renderKpis().catch(() => {});
  }, 30000);

  const s = getSupabaseClient();
  if (!s || typeof s.channel !== "function") return;
  if (liveSummaryChannel && typeof s.removeChannel === "function") s.removeChannel(liveSummaryChannel);
  liveSummaryChannel = s.channel("dashboard-kpi-live");
  ["dayosisi", "majimbo", "matawi", "members", "leaders", "data_submissions", "auth_user_profiles"].forEach((table) => {
    liveSummaryChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      renderKpis().catch(() => {});
    });
  });
  liveSummaryChannel.subscribe(() => {});

  if (stopEnterpriseRealtime) stopEnterpriseRealtime();
  stopEnterpriseRealtime = subscribeRealtimeEnterprise((event) => {
    if (!event || !event.module) return;
    if (event.module === "finance" || event.module === "workflow" || event.module === "compliance") {
      renderKpis().catch(() => {});
      logAudit({
        module: "Realtime",
        action: "Sync",
        description: `${event.module} ${event.action || "update"} event received`,
        status: "ok",
      });
      if (activities.length > 120) activities = activities.slice(0, 120);
      renderActivity();
    }
  });
}

function renderQuickActions() {
  const wrap = document.getElementById("quickActions");
  wrap.innerHTML = quickActions.map((a) => `<button class="action-btn" data-action="${a}">${a}</button>`).join("");
}

function renderActivity() {
  const tbody = document.getElementById("activityBody");
  tbody.innerHTML = activities
    .map(
      (r) => `<tr>
      <td>${r.tarehe}</td><td>${r.mtumiaji}</td><td>${r.module}</td><td>${r.action}</td><td>${r.desc}</td>
      <td><span class="status ${r.status}">${r.status === "ok" ? "Success" : r.status === "warn" ? "Pending" : "Error"}</span></td>
    </tr>`
    )
    .join("");
}

function renderNotifications() {
  const tbody = document.getElementById("notificationsBody");
  tbody.innerHTML = notifications
    .map(
      (n, index) => `<tr>
      <td>${n.title}</td><td>${n.type}</td><td>${n.priority}</td><td>${n.target}</td><td>${n.date}</td>
      <td><span class="status ${n.status === "Read" ? "ok" : "warn"}">${n.status}</span></td>
      <td>
        <button class="btn secondary" data-n-action="view" data-index="${index}">View</button>
        <button class="btn secondary" data-n-action="read" data-index="${index}">Mark as Read</button>
        <button class="btn danger" data-n-action="delete" data-index="${index}">Delete</button>
      </td>
    </tr>`
    )
    .join("");
}

function initCharts() {
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#dce8ff" } } },
    scales: {
      x: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,0.08)" } },
      y: { ticks: { color: "#c9d8ff" }, grid: { color: "rgba(255,255,255,0.08)" } },
    },
  };
  const gold = "#d4a739";
  const blue = "#2e83ff";
  const navy = "#0d2f75";

  new Chart(document.getElementById("chartMembers"), {
    type: "line",
    data: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], datasets: [{ label: "Waumini", data: [78100, 80200, 83500, 87100, 92400, 98450], borderColor: gold, backgroundColor: "#d4a73933", fill: true }] },
    options: commonOptions,
  });
  new Chart(document.getElementById("chartAttendance"), {
    type: "bar",
    data: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], datasets: [{ label: "Mahudhurio", data: [9800, 10100, 10800, 11300, 11800, 12904], backgroundColor: blue }] },
    options: commonOptions,
  });
  new Chart(document.getElementById("chartFinance"), {
    type: "bar",
    data: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], datasets: [{ label: "Michango", data: [120, 134, 142, 158, 170, 184], backgroundColor: gold }, { label: "Matumizi", data: [92, 108, 121, 131, 145, 149], backgroundColor: navy }] },
    options: commonOptions,
  });
  new Chart(document.getElementById("chartCamp"), {
    type: "doughnut",
    data: { labels: ["Vijana", "Wanawake", "Wanaume", "Kwaya"], datasets: [{ data: [40, 22, 18, 20], backgroundColor: [blue, gold, "#3fbf7f", "#4f67ff"] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#dce8ff" } } } },
  });
  new Chart(document.getElementById("chartBranches"), {
    type: "radar",
    data: { labels: ["Dar", "Mwanza", "Arusha", "Dodoma", "Mbeya"], datasets: [{ label: "Matawi", data: [120, 96, 74, 65, 58], borderColor: gold, backgroundColor: "#d4a73933" }] },
    options: commonOptions,
  });
}

function initVerseRotation() {
  const el = document.getElementById("dayVerse");
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % verses.length;
    el.textContent = verses[idx];
  }, 5000);
}

function initTopbar(session) {
  document.getElementById("roleBadge").textContent = `Role: ${session.role}`;
  document.getElementById("collapseBtn").addEventListener("click", () => document.getElementById("dashboardShell").classList.toggle("collapsed"));
  document.getElementById("profileBtn").addEventListener("click", () => document.getElementById("profileDropdown").classList.toggle("show"));
  document.getElementById("themeToggle").addEventListener("click", () => document.body.classList.toggle("light"));
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("kmt_session");
    logAudit({ module: "Usalama", action: "Logout", description: "Mtumiaji ametoka kwenye mfumo", actor: session.name || session.email });
    window.location.href = "auth-login.html";
  });
}

function initActions(session) {
  const sidebarSearch = document.getElementById("sidebarSearch");
  if (sidebarSearch) {
    sidebarSearch.addEventListener("input", (e) => {
      const q = String(e.target.value || "").toLowerCase().trim();
      document.querySelectorAll("#mainModules .side-link").forEach((a) => {
        const txt = String(a.dataset.moduleLabel || "");
        a.style.display = !q || txt.includes(q) ? "" : "none";
      });
    });
  }

  document.getElementById("kpiGrid").addEventListener("click", (event) => {
    const card = event.target.closest(".kpi-card");
    if (!card) return;
    const route = card.getAttribute("data-kpi-route");
    if (route) window.location.href = route;
  });

  document.getElementById("quickActions").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-action");
    if (!action) return;
    const quickRoute = {
      "Ongeza Dayosisi": "#module=dayosisi",
      "Ongeza Jimbo": "#module=majimbo",
      "Ongeza Tawi": "#module=matawi",
      "Ongeza Muumini": "members-management.html",
      "Ongeza Kiongozi": "leadership-management.html",
      "Ongeza Chanzo cha Mapato": "#module=vyanzo_mapato",
      "Unda Kambi": "events-camps-management.html",
      "Rekodi Mchango": "finance-management.html",
      "Rekodi Mahudhurio": "attendance-management.html",
      "Pakia Media": "sermons-media.html",
      "Tuma Taarifa": "reports-analytics.html",
      "Add Category": "access-control-workflow.html",
      "Add Type": "access-control-workflow.html",
      "Add Custom Field": "access-control-workflow.html",
      "Add Custom Section": "access-control-workflow.html",
    };
    const route = quickRoute[action];
    if (route && route.endsWith(".html")) {
      window.location.href = route;
      return;
    }
    if (route && route.startsWith("#module=")) {
      window.location.hash = route;
      return;
    }
    if (["Add Category", "Add Type", "Add Custom Field", "Add Custom Section"].includes(action)) {
      showToast(`${action} inatumika kwa modules zote zinazohitaji custom setup.`, "success");
    } else {
      showToast(`Action imeandaliwa: ${action}`, "success");
    }
    logAudit({ module: "QuickActions", action, description: `Mtumiaji amechagua ${action}`, actor: session.name || session.email });
  });

  document.getElementById("activityViewBtn").addEventListener("click", () => showToast("Activity preview imefunguliwa.", "success"));
  document.getElementById("activityClearBtn").addEventListener("click", () => {
    askConfirm({
      title: "Futa Activity Logs",
      message: "Una uhakika unataka kufuta shughuli zote za hivi karibuni?",
      onConfirm: () => {
        activities = [];
        renderActivity();
        showToast("Logs zimefutwa kikamilifu.", "warn");
        logAudit({ module: "Logs", action: "Clear", description: "Activity logs zote zimefutwa", status: "warn", actor: session.name || session.email });
      },
    });
  });
  document.getElementById("activityExportBtn").addEventListener("click", () => {
    const header = "Tarehe,Mtumiaji,Module,Action,Description,Status";
    const rows = activities.map((a) => `${a.tarehe},${a.mtumiaji},${a.module},${a.action},${a.desc},${a.status}`);
    exportCsv("kmt-activity.csv", [header, ...rows]);
    showToast("CSV ya shughuli imeshushwa.", "success");
  });

  document.getElementById("notificationViewBtn").addEventListener("click", () => showToast("Notifications preview imefunguliwa.", "success"));
  document.getElementById("markReadBtn").addEventListener("click", () => {
    notifications = notifications.map((n) => ({ ...n, status: "Read" }));
    renderNotifications();
    showToast("Taarifa zote zimewekwa Read.", "success");
  });
  document.getElementById("clearNotificationsBtn").addEventListener("click", () => {
    askConfirm({
      title: "Clear Notifications",
      message: "Unataka kufuta taarifa zote?",
      onConfirm: () => {
        notifications = [];
        renderNotifications();
        showToast("Notifications zote zimefutwa.", "warn");
      },
    });
  });

  document.getElementById("notificationsBody").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-n-action");
    const index = Number(target.getAttribute("data-index"));
    if (!action || Number.isNaN(index) || !notifications[index]) return;

    if (action === "view") showToast(`Unaangalia: ${notifications[index].title}`, "success");
    if (action === "read") {
      notifications[index].status = "Read";
      showToast("Notification imewekwa Read.", "success");
    }
    if (action === "delete") {
      askConfirm({
        title: "Delete Notification",
        message: `Futa taarifa: ${notifications[index].title}?`,
        onConfirm: () => {
          notifications = notifications.filter((_, i) => i !== index);
          renderNotifications();
          showToast("Notification imefutwa.", "warn");
        },
      });
      return;
    }
    renderNotifications();
  });
}

function parseRoute() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#module=")) return "dayosisi";
  const key = hash.replace("#module=", "");
  return moduleSchemas[key] ? key : "dayosisi";
}

function labelForModule(moduleKey) {
  return moduleSchemas[moduleKey]?.label || "Module Workspace";
}

function renderWorkspace(rows) {
  const state = getState();
  const schema = moduleSchemas[state.selectedModule];
  const wrap = document.getElementById("moduleWorkspace");
  const title = document.getElementById("moduleWorkspaceTitle");
  title.textContent = `${labelForModule(state.selectedModule)} Workspace`;

  if (!rows.length) {
    wrap.innerHTML = `<div class="workspace-empty">Hakuna data kwa module hii. Tumia Add kuanza.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="module-workspace-inner">
      <p class="module-meta">Module: ${state.selectedModule} | Records: ${rows.length}</p>
      <div class="workspace-toolbar">
        <input id="workspaceSearch" placeholder="Search kwa jina..." />
        <select id="workspaceStatus">
          <option value="">Status zote</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th>${schema.fields.map((f) => `<th>${f.label}</th>`).join("")}<th>Select</th></tr></thead>
          <tbody id="workspaceBody">
            ${rows
              .map(
                (row, index) =>
                  `<tr>
                    <td>${index + 1}</td>
                    ${schema.fields
                      .map((field) => {
                        if (field.key === "status") {
                          return `<td><span class="status ${row.status === "active" ? "ok" : "warn"}">${row.status || "-"}</span></td>`;
                        }
                        return `<td>${row[field.key] || "-"}</td>`;
                      })
                      .join("")}
                    <td><button class="btn secondary" data-pick="${row.id}">Select</button></td>
                  </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const searchEl = document.getElementById("workspaceSearch");
  const statusEl = document.getElementById("workspaceStatus");
  const bodyEl = document.getElementById("workspaceBody");
  function doFilter() {
    const q = (searchEl.value || "").toLowerCase();
    const s = statusEl.value;
    bodyEl.querySelectorAll("tr").forEach((tr) => {
      const text = tr.textContent.toLowerCase();
      const statusIndex = schema.fields.findIndex((field) => field.key === "status");
      const statusText = statusIndex >= 0 ? tr.children[statusIndex + 1].textContent.trim() : "";
      const hit = (!q || text.includes(q)) && (!s || statusText === s);
      tr.style.display = hit ? "" : "none";
    });
  }
  searchEl.addEventListener("input", doFilter);
  statusEl.addEventListener("change", doFilter);
  bodyEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const pickId = Number(target.getAttribute("data-pick"));
    if (pickId) {
      setSelectedRow(pickId);
      showToast(`Row selected: ${pickId}`, "success");
    }
  });
}

async function refreshWorkspace() {
  const state = getState();
  try {
    const rows = await ApiAdapter.list(state.selectedModule);
    renderWorkspace(rows);
  } catch (error) {
    showToast(`Imeshindikana kupakia data: ${error.message || error}`, "error");
  }
}

function promptEntity(schema, existing) {
  const payload = {};
  for (const field of schema.fields) {
    const example = field.options ? ` (${field.options.join("/")})` : "";
    const value = window.prompt(`Andika ${field.label}${example}:`, existing?.[field.key] || "");
    if (value === null) return null;
    payload[field.key] = value;
  }
  return payload;
}

function initWorkspaceActions(session) {
  document.getElementById("moduleAddBtn").addEventListener("click", async () => {
    const schema = moduleSchemas[getState().selectedModule];
    const payload = promptEntity(schema);
    if (!payload) return;
    const check = validateEntity(payload, schema);
    if (!check.valid) return showToast(check.errors[0], "error");
    try {
      await ApiAdapter.create(getState().selectedModule, payload);
      showToast("Record imeongezwa.", "success");
      logAudit({ module: getState().selectedModule, action: "Add", description: payload.name, actor: session.name || session.email });
      refreshWorkspace();
    } catch (error) {
      showToast(`Create failed: ${error.message || error}`, "error");
    }
  });

  document.getElementById("moduleEditBtn").addEventListener("click", async () => {
    const state = getState();
    const schema = moduleSchemas[state.selectedModule];
    if (!state.selectedRowId) return showToast("Chagua record kwanza.", "warn");
    try {
      const rows = await ApiAdapter.list(state.selectedModule);
      const found = rows.find((r) => r.id === state.selectedRowId);
      if (!found) return showToast("Record haipo.", "error");
      const payload = promptEntity(schema, found);
      if (!payload) return;
      const check = validateEntity(payload, schema);
      if (!check.valid) return showToast(check.errors[0], "error");
      await ApiAdapter.update(state.selectedModule, state.selectedRowId, payload);
      showToast("Record imesasishwa.", "success");
      logAudit({ module: state.selectedModule, action: "Edit", description: payload.name, actor: session.name || session.email });
      refreshWorkspace();
    } catch (error) {
      showToast(`Edit failed: ${error.message || error}`, "error");
    }
  });

  document.getElementById("moduleDeleteBtn").addEventListener("click", async () => {
    const state = getState();
    if (!state.selectedRowId) return showToast("Chagua record kwanza.", "warn");
    askConfirm({
      title: "Delete Record",
      message: "Una uhakika unataka kufuta record iliyochaguliwa?",
      onConfirm: async () => {
        try {
          await ApiAdapter.remove(state.selectedModule, state.selectedRowId);
          setSelectedRow(null);
          showToast("Record imefutwa.", "warn");
          logAudit({ module: state.selectedModule, action: "Delete", description: `ID ${state.selectedRowId}`, status: "warn", actor: session.name || session.email });
          refreshWorkspace();
        } catch (error) {
          showToast(`Delete failed: ${error.message || error}`, "error");
        }
      },
    });
  });

  document.getElementById("moduleClearBtn").addEventListener("click", () => {
    const state = getState();
    askConfirm({
      title: "Clear Module Data",
      message: `Una uhakika kufuta records zote za ${state.selectedModule}?`,
      onConfirm: async () => {
        try {
          await ApiAdapter.clear(state.selectedModule);
          showToast("Records zote zimefutwa.", "warn");
          logAudit({ module: state.selectedModule, action: "Clear", description: "All records cleared", status: "warn", actor: session.name || session.email });
          refreshWorkspace();
        } catch (error) {
          showToast(`Clear failed: ${error.message || error}`, "error");
        }
      },
    });
  });
}

function init() {
  installGlobalCrashGuards("phase3_dashboard");
  const session = guardDashboard();
  if (!session) return;
  // Keep contracts available globally for future Supabase integration checks.
  window.KMT_SUPABASE_CONTRACTS = SupabaseFutureContracts;
  document.getElementById("dataModeBadge").textContent = getSupabaseClient() ? "Data: Supabase" : "Data: Mock";
  renderModules();
  renderKpis();
  startLiveSummarySync();
  renderQuickActions();
  renderActivity();
  renderNotifications();
  initCharts();
  initTopbar(session);
  initActions(session);
  initVerseRotation();
  const firstModule = parseRoute();
  setSelectedModule(firstModule);
  refreshWorkspace();
  initWorkspaceActions(session);
  window.addEventListener("hashchange", () => {
    setSelectedModule(parseRoute());
    refreshWorkspace();
  });
  subscribe(() => {
    refreshWorkspace();
  });
}

init();
