const modules = [
  "Dashibodi Kuu",
  "Usimamizi wa Dayosisi",
  "Usimamizi wa Majimbo",
  "Usimamizi wa Matawi",
  "Viongozi wa Kanisa",
  "Waumini",
  "Idara & Huduma",
  "Matukio & Makambi",
  "Mahudhurio",
  "Fedha & Michango",
  "Mahubiri & Media",
  "Mawasiliano",
  "Ripoti",
  "Mipangilio",
  "Usalama",
  "Logs",
];

const kpis = [
  ["Jumla ya Dayosisi", "26"],
  ["Jumla ya Majimbo", "128"],
  ["Jumla ya Matawi", "642"],
  ["Jumla ya Waumini", "98,450"],
  ["Jumla ya Viongozi", "1,845"],
  ["Makambi Hai", "14"],
  ["Michango ya Mwezi", "TZS 184M"],
  ["Mahudhurio Leo", "12,904"],
  ["Media Files", "3,221"],
  ["Watumiaji Hai", "846"],
];

const chartTitles = [
  "Ukuaji wa Waumini",
  "Mahudhurio kwa Mwezi",
  "Michango vs Matumizi",
  "Makambi Participation",
  "Matawi kwa Mkoa",
];

const quickActions = [
  "Ongeza Dayosisi",
  "Ongeza Jimbo",
  "Ongeza Tawi",
  "Ongeza Muumini",
  "Ongeza Kiongozi",
  "Unda Kambi",
  "Rekodi Mchango",
  "Rekodi Mahudhurio",
  "Pakia Media",
  "Tuma Taarifa",
];

let activities = [
  { tarehe: "26 Apr 2026", mtumiaji: "Admin Mkuu", module: "Dayosisi", action: "Add", desc: "Ameongeza Dayosisi ya Kigoma", status: "ok" },
  { tarehe: "26 Apr 2026", mtumiaji: "Finance Officer", module: "Michango", action: "Edit", desc: "Amesasisha rekodi ya mchango", status: "warn" },
  { tarehe: "25 Apr 2026", mtumiaji: "Media Admin", module: "Mahubiri & Media", action: "Upload", desc: "Video mpya imepakiwa", status: "ok" },
  { tarehe: "25 Apr 2026", mtumiaji: "Mchungaji", module: "Mahudhurio", action: "Record", desc: "Mahudhurio ya ibada ya Jumapili", status: "ok" },
];

let notifications = [
  { title: "Kambi ya Vijana Taifa", type: "Event", priority: "High", target: "admin", date: "26 Apr 2026", status: "Unread" },
  { title: "Report ya Michango", type: "Finance", priority: "Medium", target: "finance_officer", date: "26 Apr 2026", status: "Unread" },
  { title: "Uthibitisho wa Viongozi", type: "Leadership", priority: "Low", target: "askofu_dayosisi", date: "25 Apr 2026", status: "Read" },
];

const verses = [
  "“The Lord is my shepherd; I shall not want.” — Psalm 23:1",
  "“I can do all things through Christ.” — Philippians 4:13",
  "“Be strong and courageous.” — Joshua 1:9",
];

function getSession() {
  try {
    const raw = localStorage.getItem("kmt_session");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function guardDashboard() {
  const session = getSession();
  if (!session) {
    window.location.href = "session-expired.html";
    return null;
  }
  return session;
}

function renderModules() {
  const nav = document.getElementById("mainModules");
  nav.innerHTML = modules
    .map((label, i) => `<a class="side-link" href="#"><b>${i + 1}.</b> <span>${label}</span></a>`)
    .join("");
}

function renderKpis() {
  const wrap = document.getElementById("kpiGrid");
  wrap.innerHTML = kpis.map(([label, value]) => `<article class="kpi-card"><p>${label}</p><h4>${value}</h4></article>`).join("");
}

function randBars() {
  return [42, 70, 58, 88, 62, 75].map((v) => `<div class="bar" style="height:${v}%"></div>`).join("");
}

function renderCharts() {
  const wrap = document.getElementById("chartGrid");
  wrap.innerHTML = chartTitles.map((t) => `<article class="chart-card"><strong>${t}</strong><div class="bars">${randBars()}</div></article>`).join("");
}

function renderQuickActions() {
  const wrap = document.getElementById("quickActions");
  wrap.innerHTML = quickActions.map((a) => `<button class="action-btn">${a}</button>`).join("");
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

function exportCsv(filename, rows) {
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function initTopbar(session) {
  document.getElementById("roleBadge").textContent = `Role: ${session.role}`;
  document.getElementById("collapseBtn").addEventListener("click", () => {
    document.getElementById("dashboardShell").classList.toggle("collapsed");
  });
  document.getElementById("profileBtn").addEventListener("click", () => {
    document.getElementById("profileDropdown").classList.toggle("show");
  });
  document.getElementById("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("light");
  });
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("kmt_session");
    window.location.href = "auth-login.html";
  });
}

function initTablesActions() {
  document.getElementById("activityViewBtn").addEventListener("click", () => alert("Activity preview opened."));
  document.getElementById("activityClearBtn").addEventListener("click", () => {
    activities = [];
    renderActivity();
  });
  document.getElementById("activityExportBtn").addEventListener("click", () => {
    const header = "Tarehe,Mtumiaji,Module,Action,Description,Status";
    const rows = activities.map((a) => `${a.tarehe},${a.mtumiaji},${a.module},${a.action},${a.desc},${a.status}`);
    exportCsv("kmt-activity.csv", [header, ...rows]);
  });

  document.getElementById("notificationViewBtn").addEventListener("click", () => alert("Notifications preview opened."));
  document.getElementById("markReadBtn").addEventListener("click", () => {
    notifications = notifications.map((n) => ({ ...n, status: "Read" }));
    renderNotifications();
  });
  document.getElementById("clearNotificationsBtn").addEventListener("click", () => {
    notifications = [];
    renderNotifications();
  });

  document.getElementById("notificationsBody").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute("data-n-action");
    const index = Number(target.getAttribute("data-index"));
    if (!action || Number.isNaN(index)) return;
    if (action === "view") alert(`Viewing: ${notifications[index]?.title || "N/A"}`);
    if (action === "read" && notifications[index]) notifications[index].status = "Read";
    if (action === "delete") notifications = notifications.filter((_, i) => i !== index);
    renderNotifications();
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

function init() {
  const session = guardDashboard();
  if (!session) return;
  renderModules();
  renderKpis();
  renderCharts();
  renderQuickActions();
  renderActivity();
  renderNotifications();
  initTopbar(session);
  initTablesActions();
  initVerseRotation();
}

init();
