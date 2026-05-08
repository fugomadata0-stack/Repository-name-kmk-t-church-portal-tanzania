/**
 * KMT Dashboard SaaS — public preview + authenticated live data
 */
import { loadLiveSystemSummary } from "../../phase-system-summary-services.js";
import { verifySupabaseConnectivity } from "../../phase3-supabase.js";

const DEMO_KPIS = {
  members: 12486,
  branches: 342,
  leaders: 891,
  attendanceWeek: 4682,
  monthlyOffering: 28500000,
  events: 28,
};

const STORAGE_CAT = "kmt_dashboard_categories_v1";
const STORAGE_NOTIF = "kmt_dashboard_notifications_v1";

const NAV_MODULES = [
  { id: "overview", label: "Muhtasari", href: "#kmt-top", icon: "⌂", always: true },
  { id: "members", label: "Waumini", href: "members-management.html", icon: "👥" },
  { id: "branches", label: "Matawi", href: "church-structure.html", icon: "🌿" },
  { id: "leaders", label: "Viongozi", href: "leadership-management.html", icon: "✝" },
  { id: "attendance", label: "Mahudhurio", href: "attendance-management.html", icon: "📋" },
  { id: "finance", label: "Fedha", href: "finance-management.html", icon: "💰" },
  { id: "events", label: "Matukio", href: "events-camps-management.html", icon: "📅" },
  { id: "reports", label: "Ripoti", href: "reports-analytics.html", icon: "📊" },
  { id: "categories", label: "Makundi", href: "#panel-categories", icon: "🏷" },
];

let chartInstances = [];
let summaryCache = null;

const dashCtx = { isPublic: true, saasRole: null };
const catFormCtx = { mode: "add", id: null };
let deletePendingId = null;
let categoryModalsWired = false;

function toast(msg, isError) {
  const w = document.getElementById("kmtToastWrap");
  if (!w) return;
  const t = document.createElement("div");
  t.className = "kmt-toast" + (isError ? " kmt-toast--err" : " kmt-toast--ok");
  t.setAttribute("role", "status");
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(() => {
    t.classList.add("kmt-toast--out");
    setTimeout(() => t.remove(), 280);
  }, 4200);
}

function showLoading(show) {
  const el = document.getElementById("kmtLoading");
  if (!el) return;
  el.hidden = !show;
  el.setAttribute("aria-busy", show ? "true" : "false");
  document.body?.classList.toggle("kmt-body--loading", !!show);
}

function destroyCharts() {
  chartInstances.forEach((c) => {
    try {
      c.destroy();
    } catch (e) {}
  });
  chartInstances = [];
}

function countUp(el, target, opts = {}) {
  const dur = opts.duration || 1200;
  const decimals = opts.decimals ?? 0;
  const prefix = opts.prefix || "";
  const suffix = opts.suffix || "";
  const money = !!opts.money;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = from + (target - from) * eased;
    const shown = money
      ? Math.round(val).toLocaleString("sw-TZ")
      : decimals
        ? val.toFixed(decimals)
        : Math.round(val).toLocaleString("sw-TZ");
    el.textContent = prefix + shown + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function seedCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_CAT);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const seed = [
    { id: "c1", name: "Wazee", moduleKey: "members", active: true, fields: "Makazi, Idara" },
    { id: "c2", name: "Vijana", moduleKey: "members", active: true, fields: "Shule, Jimbo" },
    { id: "c3", name: "Wanawake", moduleKey: "members", active: true, fields: "-" },
    { id: "c4", name: "Watoto", moduleKey: "members", active: true, fields: "Umri" },
    { id: "c5", name: "Kwaya", moduleKey: "events", active: true, fields: "Siku" },
  ];
  localStorage.setItem(STORAGE_CAT, JSON.stringify(seed));
  return seed;
}

function seedNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const n = [
    { id: "n1", title: "Karibu kwenye mfumo", type: "system", priority: "normal", role: "all", date: new Date().toISOString(), read: false },
  ];
  localStorage.setItem(STORAGE_NOTIF, JSON.stringify(n));
  return n;
}

function getUnreadNotificationCount() {
  const list = seedNotifications();
  if (!Array.isArray(list)) return 0;
  return list.filter((n) => !n.read).length;
}

function readAuditLogs() {
  try {
    const raw = localStorage.getItem("kmt_audit_logs");
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function applyChartTheme() {
  if (typeof Chart === "undefined") return;
  Chart.defaults.color = "#F8F5E9";
  Chart.defaults.borderColor = "rgba(250,204,21,0.15)";
  Chart.defaults.font.family = "'Inter',system-ui,sans-serif";
}

function monthlySynthetic(seedTotal, months = 12) {
  const base = Math.max(10, seedTotal / months);
  return Array.from({ length: months }, (_, i) => Math.round(base * (0.82 + 0.025 * i + Math.sin(i / 2) * 0.05)));
}

function buildCharts(summary, isPublic) {
  destroyCharts();
  applyChartTheme();

  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
  const membersTotal = isPublic ? DEMO_KPIS.members : summary.totalMembers || DEMO_KPIS.members;
  const attBase = isPublic ? DEMO_KPIS.attendanceWeek * 4 : Math.round((summary.totalMembers || 1000) * 0.04);
  const income = isPublic ? 42000000 : Number(summary.totalIncome || summary.closingBalance || 18000000);
  const expense = isPublic ? 31500000 : Number(summary.totalExpenses || 14200000);

  const lineEl = document.getElementById("chartAttendanceTrend");
  const barEl = document.getElementById("chartFinanceBar");
  const pieEl = document.getElementById("chartDemographics");
  const areaEl = document.getElementById("chartGrowthArea");

  if (lineEl) {
    const data = monthlySynthetic(attBase, 12);
    chartInstances.push(
      new Chart(lineEl, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "Mahudhurio",
              data,
              fill: true,
              tension: 0.35,
              borderColor: "#34d399",
              backgroundColor: "rgba(52,211,153,0.12)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: "easeOutQuart" },
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(11,31,58,0.94)", padding: 12, cornerRadius: 12 } },
          scales: {
            y: { grid: { color: "rgba(255,255,255,0.06)" } },
            x: { grid: { display: false } },
          },
        },
      })
    );
  }

  if (barEl) {
    chartInstances.push(
      new Chart(barEl, {
        type: "bar",
        data: {
          labels: months.slice(0, 6),
          datasets: [
            {
              label: "Mapato",
              data: monthlySynthetic(income / 12, 6),
              backgroundColor: "rgba(250,204,21,0.55)",
            },
            {
              label: "Matumizi",
              data: monthlySynthetic(expense / 12, 6),
              backgroundColor: "rgba(96,165,250,0.45)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: "easeOutQuart" },
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } },
            tooltip: { backgroundColor: "rgba(11,31,58,0.94)", padding: 12, cornerRadius: 12 },
          },
          scales: {
            y: { grid: { color: "rgba(255,255,255,0.06)" } },
            x: { grid: { display: false } },
          },
        },
      })
    );
  }

  if (pieEl) {
    chartInstances.push(
      new Chart(pieEl, {
        type: "pie",
        data: {
          labels: ["Wazee", "Vijana", "Wanawake", "Wanaume", "Watoto"],
          datasets: [
            {
              data: isPublic ? [22, 28, 24, 14, 12] : [24, 26, 22, 15, 13],
              backgroundColor: ["#38bdf8", "#a78bfa", "#f472b6", "#facc15", "#34d399"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1100, easing: "easeOutQuart" },
          plugins: {
            legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } },
            tooltip: { backgroundColor: "rgba(11,31,58,0.94)", padding: 12, cornerRadius: 12 },
          },
        },
      })
    );
  }

  if (areaEl) {
    const cum = monthlySynthetic(membersTotal / 10, 12).map((v, i, a) => a.slice(0, i + 1).reduce((s, x) => s + x, 0));
    chartInstances.push(
      new Chart(areaEl, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "Ukuaji (mfano)",
              data: cum,
              fill: true,
              tension: 0.4,
              borderColor: "#facc15",
              backgroundColor: "rgba(250,204,21,0.15)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: "easeOutQuart" },
          interaction: { mode: "index", intersect: false },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(11,31,58,0.94)", padding: 12, cornerRadius: 12 } },
          scales: {
            y: { grid: { color: "rgba(255,255,255,0.06)" } },
            x: { grid: { display: false } },
          },
        },
      })
    );
  }
}

function renderNav(isPublic, saasRole) {
  const nav = document.getElementById("kmtSidebarNav");
  if (!nav) return;

  const groups = [
    {
      title: "MFUMO",
      ids: ["overview", "reports", "categories"],
    },
    {
      title: "HUDUMA",
      ids: ["members", "branches", "leaders", "attendance", "events"],
    },
    {
      title: "KIUCHUMI",
      ids: ["finance"],
    },
  ];

  nav.innerHTML = groups
    .map((g) => {
      const links = g.ids
        .map((id) => NAV_MODULES.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => {
          const locked =
            m.id === "overview"
              ? false
              : isPublic || (!!saasRole && !window.KMTAuth.canAccessModule(saasRole, m.id));
          const cls = "kmt-nav-link" + (locked ? " is-locked" : "");
          const lockHtml = locked ? '<span class="kmt-lock" aria-hidden="true">🔒</span>' : "";
          const href = locked ? "#" : m.href;
          const dataLock = locked ? ' data-locked="1"' : "";
          return `<a class="${cls}" href="${href}" data-module="${m.id}"${dataLock}><span>${m.icon}</span><span>${m.label}</span>${lockHtml}</a>`;
        })
        .join("");
      return `<details class="kmt-nav-group" open><summary>${g.title}</summary><div class="kmt-nav-links">${links}</div></details>`;
    })
    .join("");

  nav.querySelectorAll("[data-locked]").forEach((a) => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      toast(isPublic ? "Ingia ili kufungua moduli hii." : "Huna ruhusa ya moduli hii.", true);
    });
  });
}

function renderKpis(isPublic, summary) {
  const grid = document.getElementById("kmtKpiGrid");
  if (!grid) return;

  const m = isPublic ? DEMO_KPIS.members : summary.totalMembers || DEMO_KPIS.members;
  const b = isPublic ? DEMO_KPIS.branches : summary.totalMatawi || DEMO_KPIS.branches;
  const l = isPublic ? DEMO_KPIS.leaders : summary.totalLeaders || DEMO_KPIS.leaders;
  const a = isPublic ? DEMO_KPIS.attendanceWeek : Math.round((summary.totalMembers || m) * 0.035);
  const totalInc = isPublic ? DEMO_KPIS.monthlyOffering : Number(summary.totalIncome || summary.closingBalance || DEMO_KPIS.monthlyOffering);
  const totalExp = isPublic ? 31500000 : Number(summary.totalExpenses || 14200000);
  const ev = isPublic ? DEMO_KPIS.events : summary.totalEvents || DEMO_KPIS.events;
  const sadaka = isPublic ? Math.round(DEMO_KPIS.monthlyOffering / 4.3) : Math.round(totalInc / 4.3);
  const cr = Number(summary.completionRate);
  const reportPct = isPublic ? 94 : Math.min(100, Math.max(0, Number.isFinite(cr) ? Math.round(cr) : 0));
  const unread = getUnreadNotificationCount();

  const cards = [
    {
      key: "members",
      palette: "members",
      icon: "👥",
      title: "Waumini",
      desc: "Usajili na familia zote za kanisa.",
      value: m,
      trend: "+5.2%",
      up: true,
    },
    {
      key: "branches",
      palette: "branches",
      icon: "🌿",
      title: "Matawi",
      desc: "Matawi yaliyosajiliwa kimila.",
      value: b,
      trend: "+1.1%",
      up: true,
    },
    {
      key: "leaders",
      palette: "leaders",
      icon: "✝",
      title: "Viongozi",
      desc: "Viongozi hai wa kidini na idara.",
      value: l,
      trend: "+0.4%",
      up: true,
    },
    {
      key: "attendance",
      palette: "attendance",
      icon: "📋",
      title: "Mahudhurio",
      desc: "Waliuhudhuria ibada wiki hii.",
      value: a,
      trend: "+2.3%",
      up: true,
    },
    {
      key: "sadaka",
      palette: "sadaka",
      icon: "🎁",
      title: "Sadaka",
      desc: "Makusanyo ya wiki (makadirio).",
      value: sadaka,
      trend: "+4.0%",
      up: true,
      money: true,
    },
    {
      key: "events",
      palette: "events",
      icon: "📅",
      title: "Matukio",
      desc: "Matukio yanayoendelea na yajayo.",
      value: ev,
      trend: "+8%",
      up: true,
    },
    {
      key: "finance",
      palette: "mapato",
      icon: "💎",
      title: "Mapato",
      desc: "Mapato ya mwezi (michango & miruko).",
      value: totalInc,
      trend: "+3.8%",
      up: true,
      money: true,
    },
    {
      key: "expenses",
      palette: "matumizi",
      icon: "📉",
      title: "Matumizi",
      desc: "Matumizo ya operesheni ya mwezi.",
      value: totalExp,
      trend: "-1.2%",
      up: false,
      money: true,
    },
    {
      key: "reports",
      palette: "reports",
      icon: "📊",
      title: "Ripoti",
      desc: "Ukamilishaji wa rekodi na ripoti.",
      value: reportPct,
      trend: "+2%",
      up: true,
      decimals: 0,
      suffix: "%",
    },
    {
      key: "notifications",
      palette: "notifications",
      icon: "🔔",
      title: "Arifa",
      desc: "Arifa zisizosomwa kwenye mfumo.",
      value: unread,
      trend: unread > 0 ? "hai" : "safi",
      up: true,
      neutralTrend: true,
    },
  ];

  grid.innerHTML = cards
    .map((c) => {
      let trendCls = " kmt-kpi-card__trend--up";
      let trendLabel = "—";
      if (c.neutralTrend) {
        trendCls = unread > 0 ? " kmt-kpi-card__trend--pulse" : " kmt-kpi-card__trend--neutral";
        trendLabel = unread > 0 ? `${unread} mpya` : "Hakuna mpya";
      } else if (c.trend === "-") {
        trendCls = " kmt-kpi-card__trend--neutral";
        trendLabel = "—";
      } else if (/^-/.test(String(c.trend))) {
        trendCls = " kmt-kpi-card__trend--down";
        trendLabel = `${c.trend} ↓`;
      } else {
        trendLabel = `${c.trend} ↑`;
      }
      const money = c.money ? "1" : "";
      const decimals = c.decimals ?? 0;
      const suffix = c.suffix != null ? String(c.suffix) : "";
      const suffixAttr = suffix.replace(/"/g, "&quot;");
      return `
      <article class="kmt-card kmt-kpi-card kmt-kpi-card--${c.palette}" data-kpi="${c.key}" data-href="${keyToHref(c.key)}" data-public-preview="${isPublic ? "1" : "0"}" role="button" tabindex="0">
        <div class="kmt-kpi-card__pattern" aria-hidden="true"></div>
        <div class="kmt-kpi-card__glass" aria-hidden="true"></div>
        <div class="kmt-kpi-card__inner">
          <header class="kmt-kpi-card__top">
            <div class="kmt-kpi-card__icon-wrap">
              <span class="kmt-kpi-card__icon" aria-hidden="true">${c.icon}</span>
            </div>
            <span class="kmt-kpi-card__trend${trendCls}">${trendLabel}</span>
          </header>
          <h3 class="kmt-kpi-card__title">${escapeHtml(c.title)}</h3>
          <div class="kmt-kpi-card__value kmt-value" data-target="${c.value}" data-money="${money}" data-decimals="${decimals}" data-suffix="${suffixAttr}">0</div>
          <p class="kmt-kpi-card__desc">${escapeHtml(c.desc)}</p>
        </div>
      </article>`;
    })
    .join("");

  grid.querySelectorAll(".kmt-card").forEach((card, i) => {
    card.style.setProperty("--kmt-stagger", `${i * 0.05}s`);
    card.classList.add("kmt-card--enter");
    const valEl = card.querySelector(".kmt-value");
    if (!valEl) return;
    const tgt = Number(valEl.dataset.target);
    const money = valEl.dataset.money === "1";
    const decimals = Number(valEl.dataset.decimals ?? 0);
    const suffix = valEl.dataset.suffix || "";
    countUp(valEl, tgt, { prefix: money ? "TZS " : "", money, decimals, suffix });

    const href = card.dataset.href;
    const go = () => {
      if (isPublic) {
        toast("Ingia ili kuona taarifa kamili na viashiria halisi.", false);
        return;
      }
      if (href && href !== "#") window.location.href = href;
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go();
    });
  });
}

function keyToHref(key) {
  const map = {
    members: "members-management.html",
    branches: "church-structure.html",
    leaders: "leadership-management.html",
    attendance: "attendance-management.html",
    sadaka: "finance-management.html",
    finance: "finance-management.html",
    expenses: "finance-management.html",
    events: "events-camps-management.html",
    reports: "reports-analytics.html",
    notifications: "communications-notifications.html",
  };
  return map[key] || "#";
}

function ensureModuleInSelect(selectEl, value) {
  if (!selectEl) return;
  const v = String(value || "members").trim();
  const exists = [...selectEl.options].some((o) => o.value === v);
  if (!exists) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  }
  selectEl.value = v;
}

function setCatModalOpen(open) {
  const m = document.getElementById("kmtCatModal");
  if (m) m.hidden = !open;
  if (open) document.getElementById("kmtCatName")?.focus();
}

function setDelModalOpen(open) {
  const m = document.getElementById("kmtCatDeleteModal");
  if (m) m.hidden = !open;
  if (!open) deletePendingId = null;
}

function openCatFormModal(mode, row) {
  catFormCtx.mode = mode;
  catFormCtx.id = row?.id || null;
  const title = document.getElementById("kmtCatModalTitle");
  const nameIn = document.getElementById("kmtCatName");
  const mod = document.getElementById("kmtCatModule");
  const fields = document.getElementById("kmtCatFields");
  const active = document.getElementById("kmtCatActive");
  const activeWrap = document.getElementById("kmtCatActiveWrap");
  if (title) title.textContent = mode === "add" ? "Ongeza kundi" : "Hariri kundi";
  if (nameIn) nameIn.value = row?.name || "";
  if (mod) ensureModuleInSelect(mod, row?.moduleKey || "members");
  if (fields) fields.value = row?.fields || "";
  if (active) active.checked = row?.active !== false;
  if (activeWrap) activeWrap.style.display = mode === "add" ? "none" : "flex";
  setCatModalOpen(true);
}

function openDeleteCatModal(row) {
  if (!row?.id) return;
  deletePendingId = row.id;
  const msg = document.getElementById("kmtCatDelMsg");
  if (msg) msg.textContent = `Unauhakika unataka kufuta "${String(row.name || "").trim()}"?`;
  const m = document.getElementById("kmtCatDeleteModal");
  if (m) m.hidden = false;
}

function wireCategoryModals() {
  const modal = document.getElementById("kmtCatModal");
  const form = document.getElementById("kmtCatForm");
  const cancel = document.getElementById("kmtCatCancel");
  const delModal = document.getElementById("kmtCatDeleteModal");
  const delCancel = document.getElementById("kmtCatDelCancel");
  const delConfirm = document.getElementById("kmtCatDelConfirm");

  modal?.querySelector("[data-kmt-close-cat-modal]")?.addEventListener("click", () => setCatModalOpen(false));
  cancel?.addEventListener("click", () => setCatModalOpen(false));

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = String(document.getElementById("kmtCatName")?.value || "").trim();
    if (!name) return;
    const moduleKey = String(document.getElementById("kmtCatModule")?.value || "members").trim();
    const fieldsVal = String(document.getElementById("kmtCatFields")?.value || "").trim();
    const active = document.getElementById("kmtCatActive")?.checked !== false;
    let rows = seedCategories();
    if (catFormCtx.mode === "add") {
      rows.push({
        id: "c_" + Date.now(),
        name,
        moduleKey,
        active: true,
        fields: fieldsVal,
      });
      toast("Kundi limeongezwa.");
    } else {
      const row = rows.find((x) => x.id === catFormCtx.id);
      if (row) {
        row.name = name;
        row.moduleKey = moduleKey;
        row.fields = fieldsVal;
        row.active = active;
      }
      toast("Kundi limehaririwa.");
    }
    localStorage.setItem(STORAGE_CAT, JSON.stringify(rows));
    setCatModalOpen(false);
    renderCategories(dashCtx.isPublic, dashCtx.saasRole);
  });

  delCancel?.addEventListener("click", () => setDelModalOpen(false));
  delModal?.querySelector("[data-kmt-close-del-modal]")?.addEventListener("click", () => setDelModalOpen(false));
  delConfirm?.addEventListener("click", () => {
    if (!deletePendingId) return;
    const rows = seedCategories().filter((x) => x.id !== deletePendingId);
    localStorage.setItem(STORAGE_CAT, JSON.stringify(rows));
    setDelModalOpen(false);
    toast("Kundi limefutwa.");
    renderCategories(dashCtx.isPublic, dashCtx.saasRole);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (modal && !modal.hidden) setCatModalOpen(false);
    if (delModal && !delModal.hidden) setDelModalOpen(false);
  });
}

function renderCategories(isPublic, saasRole) {
  const canEdit = !isPublic && saasRole && window.KMTAuth.canAccessModule(saasRole, "categories");
  const tbody = document.getElementById("kmtCatBody");
  const toolbar = document.getElementById("kmtCatToolbar");
  if (toolbar) toolbar.style.display = canEdit ? "flex" : "none";

  let rows = seedCategories();
  const q = (document.getElementById("kmtCatSearch")?.value || "").toLowerCase();

  if (tbody) {
    const filtered = rows.filter((r) => !q || String(r.name).toLowerCase().includes(q) || String(r.moduleKey).includes(q));
    tbody.innerHTML =
      filtered.length === 0
        ? `<tr><td colspan="5" class="kmt-empty">Hakuna makundi yanayolingana na utafutaji.</td></tr>`
        : filtered
            .map(
              (r) => `
      <tr data-id="${r.id}">
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.moduleKey)}</td>
        <td>${r.active ? "Hai" : "Imezimwa"}</td>
        <td>${escapeHtml(r.fields || "-")}</td>
        <td>
          ${
            canEdit
              ? `<button type="button" class="kmt-btn kmt-btn--ghost kmt-btn--sm kmt-cat-edit">Hariri</button>
             <button type="button" class="kmt-btn kmt-btn--ghost kmt-btn--sm kmt-cat-del">Futa</button>`
              : "—"
          }
        </td>
      </tr>`
            )
            .join("");
  }

  if (!canEdit || !tbody) return;

  tbody.querySelectorAll(".kmt-cat-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      const row = rows.find((x) => x.id === id);
      if (!row) return;
      openCatFormModal("edit", row);
    });
  });
  tbody.querySelectorAll(".kmt-cat-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      const row = rows.find((x) => x.id === id);
      if (!row) return;
      openDeleteCatModal(row);
    });
  });
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderActivity(isPublic) {
  const tbody = document.getElementById("kmtActivityBody");
  if (!tbody) return;
  const logs = readAuditLogs().slice(0, 25);
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="kmt-empty">Hakuna shughuli bado. Shughuli zitaonekana hapa unapoingia na kutumia mfumo.</td></tr>`;
    return;
  }
  tbody.innerHTML = logs
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml((r.date || "").slice(0, 19).replace("T", " "))}</td>
      <td>${escapeHtml(r.actor || "-")}</td>
      <td>${escapeHtml(r.module || "-")}</td>
      <td>${escapeHtml(r.action || "-")}</td>
      <td>${escapeHtml(r.description || "")}</td>
    </tr>`
    )
    .join("");
}

function renderNotifications(isPublic) {
  const tbody = document.getElementById("kmtNotifBody");
  if (!tbody) return;
  const list = seedNotifications();
  tbody.innerHTML =
    list.length === 0
      ? `<tr><td colspan="4" class="kmt-empty">Hakuna taarifa.</td></tr>`
      : list
          .map(
            (n) => `
    <tr>
      <td>${escapeHtml(n.title)}</td>
      <td>${escapeHtml(n.type)}</td>
      <td>${escapeHtml(n.priority)}</td>
      <td>${escapeHtml((n.date || "").slice(0, 10))}</td>
    </tr>`
          )
          .join("");
}

function wireToolbar(isPublic, saasRole) {
  document.getElementById("kmtBtnLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.KMTAuth.logout();
  });
  document.getElementById("kmtBtnExportActivity")?.addEventListener("click", () => {
    const logs = readAuditLogs();
    const header = "Date,Actor,Module,Action,Description";
    const lines = logs.map((r) =>
      [r.date, r.actor, r.module, r.action, String(r.description || "").replace(/"/g, '""')].map((x) => `"${x}"`).join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kmt-activity-log.csv";
    a.click();
    toast("Faili limepakuliwa.");
  });
  document.getElementById("kmtBtnPrint")?.addEventListener("click", () => window.print());
  document.getElementById("kmtFilterDate")?.addEventListener("change", () => {
    toast("Kichujio cha tarehe: data ya kuonyesha inategemea histolia ya ndani (demo).");
  });

  document.getElementById("kmtCatAdd")?.addEventListener("click", () => {
    if (isPublic || !window.KMTAuth.canAccessModule(saasRole, "categories")) return;
    openCatFormModal("add", null);
  });

  document.getElementById("kmtCatSearch")?.addEventListener("input", () => renderCategories(isPublic, saasRole));
}

function updateChrome(isPublic) {
  const badge = document.getElementById("kmtModeBadge");
  const roleEl = document.getElementById("kmtRoleDisplay");
  const banner = document.getElementById("kmtPublicBanner");
  const userEl = document.getElementById("kmtUserName");

  if (badge) {
    badge.textContent = isPublic ? "Hali: Umma (hakuna huu)" : "Hali: Umeingia";
    badge.className = "kmt-badge " + (isPublic ? "kmt-badge--public" : "kmt-badge--live");
  }
  if (banner) banner.hidden = !isPublic;
  if (userEl) userEl.textContent = isPublic ? "Mgeni" : window.KMTAuth.getUserName();
  if (roleEl) roleEl.textContent = isPublic ? "—" : window.KMTAuth.getDisplayRole();

  document.getElementById("kmtBtnLogin")?.style && (document.getElementById("kmtBtnLogin").style.display = isPublic ? "inline-flex" : "none");
  document.getElementById("kmtBtnLogout")?.style && (document.getElementById("kmtBtnLogout").style.display = isPublic ? "none" : "inline-flex");
}

async function boot() {
  if (typeof Chart === "undefined") {
    toast("Chart.js haijalodiwa.", true);
    return;
  }

  const isPublic = !window.KMTAuth.isAuthenticated();
  const saasRole = window.KMTAuth.getSaaSRole();
  dashCtx.isPublic = isPublic;
  dashCtx.saasRole = saasRole;
  if (!categoryModalsWired) {
    wireCategoryModals();
    categoryModalsWired = true;
  }

  updateChrome(isPublic);
  renderNav(isPublic, saasRole);

  showLoading(true);
  let summary = null;
  try {
    if (!isPublic) {
      summary = await loadLiveSystemSummary();
      summaryCache = summary;
    }
  } catch (e) {
    toast("Hitilafu ya kusoma taarifa: " + (e.message || "isiyojulikana"), true);
    summary = {};
  } finally {
    showLoading(false);
  }

  renderKpis(isPublic, summary || {});
  buildCharts(summary || {}, isPublic);
  renderCategories(isPublic, saasRole);
  renderActivity(isPublic);
  renderNotifications(isPublic);
  wireToolbar(isPublic, saasRole);

  const sbLink = document.getElementById("kmtSupabaseLink");
  if (sbLink) {
    try {
      const v = await verifySupabaseConnectivity();
      sbLink.hidden = false;
      sbLink.dataset.connected = v.ok ? "1" : "0";
      sbLink.textContent = v.ok ? "Supabase ✓" : "Supabase ⚠";
      sbLink.title = v.detail || (v.ok ? "Imeunganishwa na mradi" : "Bonyeza kwa ukaguzi wa afya");
      sbLink.classList.remove("kmt-badge--live", "kmt-badge--public");
      sbLink.classList.add(v.ok ? "kmt-badge--live" : "kmt-badge--public");
    } catch (err) {
      sbLink.hidden = false;
      sbLink.textContent = "Supabase ?";
      sbLink.title = err?.message || "Hitilafu ya ukaguzi";
      sbLink.classList.add("kmt-badge--public");
    }
  }

  document.getElementById("kmtDashboardSearch")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("#kmtKpiGrid .kmt-card").forEach((card) => {
      const t = card.innerText.toLowerCase();
      card.style.display = !q || t.includes(q) ? "" : "none";
    });
  });
}

document.addEventListener("DOMContentLoaded", boot);
