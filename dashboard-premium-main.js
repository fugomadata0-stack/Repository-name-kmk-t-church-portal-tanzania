/**
 * Dashibodi ya Premium — muunganisho wa Supabase kwa ufanisi
 * (loadLiveSystemSummary, hesabu za meza, admin_actions, online_users, website_visitors)
 */
import { loadLiveSystemSummary } from "./phase-system-summary-services.js";
import { getSafeSupabase, installGlobalCrashGuards, recordIntegrationError, safeAsync } from "./phase-integration-core.js";
import { fetchBrandingRow, getDashboardVisualUrls, applyLogoToDashboardSidebar } from "./assets/js/site-branding-service.js";

const byId = (id) => document.getElementById(id);

/** Takwimu za ziada ikiwa init inashindwa kabla ya kupata live summary. */
const EMPTY_SUMMARY = {
  totalDayosisi: 0,
  totalMajimbo: 0,
  totalMatawi: 0,
  totalLeaders: 0,
  totalMembers: 0,
  totalFamilies: 0,
  totalChoirs: 0,
  totalDepartments: 0,
  totalFellowships: 0,
  totalInstitutions: 0,
  totalIncome: 0,
  totalExpenses: 0,
  pendingSubmissions: 0,
  approvedSubmissions: 0,
  notCompletedRecords: 0,
  activeUsers: 0,
  mode: "mock",
};

let refreshInFlight = false;

/** Safu ya branding_settings — inadumu kwenye dashibodi na hero mandhari. */
let siteBranding = null;

async function refreshSiteBranding() {
  siteBranding = await fetchBrandingRow();
}

const modules = [
  { icon: "🏠", name: "Dashibodi Kuu", subs: ["Overview", "KPI Cards", "Alerts", "Recent Activity", "Pending Approvals"] },
  { icon: "🏛", name: "Muundo wa Kanisa", subs: ["Ngazi Kuu", "Dayosisi", "Majimbo", "Matawi / Vituo", "Hierarchy View", "Ownership by Level"] },
  { icon: "👔", name: "Viongozi wa Kanisa", subs: ["Viongozi wa Ngazi Kuu", "Viongozi wa Dayosisi", "Maaskofu", "Wachungaji", "Wainjilisti", "Wazee", "Mashemasi", "Waongozi wa Matawi", "Nafasi Zilizo Wazi"] },
  { icon: "👥", name: "Waumini & Familia", subs: ["Orodha ya Waumini", "Member Profiles", "Familia / Households", "Ubatizo", "Katekisimu", "Talents & Gifts", "Member Reports"] },
  { icon: "🎼", name: "Jumuiya & Idara", subs: ["Jumuiya za Kanisa", "JVKMKT", "JWKMK", "Idara za Kanisa", "Kwaya", "Makundi ya Huduma", "Shughuli & Ratiba"] },
  { icon: "💰", name: "Fedha, Michango & Matumizi", subs: ["Overview ya Fedha", "Sadaka", "Zaka", "Vyanzo vya Mapato Yote", "Mapato / Income", "Matumizi / Expenses", "Bajeti", "Receipts", "Vouchers", "Audit Trail"] },
  { icon: "📅", name: "Matukio, Makambi & Kalenda", subs: ["Makambi", "Mikutano", "Seminars", "Conferences", "National Calendar", "Participants", "Speakers", "Reports"] },
  { icon: "🏫", name: "Taasisi za Kanisa", subs: ["Chuo cha Biblia", "Shule", "Day Care", "Malezi ya Watoto", "Hospital / Health", "Training Centers"] },
  { icon: "📺", name: "Machapisho & Media", subs: ["Katiba", "Katekisimu", "Tenzi", "Vitabu", "Mahubiri", "Gallery", "Downloads", "Media Library"] },
  { icon: "📂", name: "Nyaraka Rasmi", subs: ["Minutes", "Circulars", "Policies", "Official Letters", "Strategic Plans", "Archive Center", "Approval Workflow"] },
  { icon: "📊", name: "Ripoti & Analytics", subs: ["Leadership Reports", "Membership Reports", "Finance Reports", "Events Reports", "Export Center", "PDF Center"] },
  { icon: "📣", name: "Mawasiliano", subs: ["Notifications", "Bulk SMS", "Email Alerts", "Announcements", "Templates", "Delivery Logs"] },
  { icon: "🌐", name: "Public Website Manager", subs: ["Home Page Content", "About KMK(T)", "Hero Banners", "Public Announcements", "Public Gallery", "Contact Page", "SEO"] },
  { icon: "⚙️", name: "Mipangilio Mikuu", subs: ["Church Identity", "Logo & Branding", "Categories", "Custom Fields", "Global Options", "Uppercase Rules"] },
  { icon: "🔐", name: "Usalama & Ruhusa", subs: ["Users", "Roles", "Permissions", "Sessions", "Audit Logs", "Visibility Rules"] },
  { icon: "👁️", name: "Visitors & Online Tracking", subs: ["Website Visitors", "Portal Visitors", "Current Online Users", "Session Activity Logs", "Page Tracking"] },
  { icon: "🧾", name: "Workflow & Compliance", subs: ["Pending Submissions", "Submitted Records", "Approved Records", "Not Submitted", "Completion Tracking", "Deadlines"] },
  { icon: "🛠", name: "Super Admin", subs: ["System Health", "Backups", "Error Logs", "Storage", "Deployment", "Maintenance"] },
];

const moduleSubRoutes = {
  "Super Admin|System Health": "super-admin-control-center.html",
  "Super Admin|Error Logs": "super-admin-control-center.html",
  "Super Admin|Backups": "system-health.html",
  "Super Admin|Maintenance": "super-admin-control-center.html",
  "Waumini & Familia|Orodha ya Waumini": "members-management.html",
  "Viongozi wa Kanisa|Viongozi wa Ngazi Kuu": "leadership-management.html",
  "Fedha, Michango & Matumizi|Overview ya Fedha": "finance-management.html",
  "Matukio, Makambi & Kalenda|National Calendar": "national-calendar-master.html",
  "Nyaraka Rasmi|Approval Workflow": "documents-approval-workflow.html",
  "Ripoti & Analytics|Export Center": "reports-analytics.html",
  "Usalama & Ruhusa|Users": "phase12-user-management-center.html",
  "Usalama & Ruhusa|Audit Logs": "phase12-user-management-center.html",
  "Visitors & Online Tracking|Website Visitors": "website-analytics.html",
  "Mawasiliano|Notifications": "communications-notifications.html",
  "Public Website Manager|Hero Banners": "admin-site-branding.html",
};

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

let liveContext = {
  summary: null,
  websiteCount: null,
  onlineCount: null,
  recent: null,
};

let currentModule = "Dashibodi Kuu";
let currentSub = "Overview";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function nLocale(v) {
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "—";
  return Number(v).toLocaleString("en-GB");
}

function fmtMoneyTZS(n) {
  const v = toNum(n);
  if (v === 0) return "TSh 0";
  if (v >= 1_000_000_000) return "TSh " + (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000) return "TSh " + (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return "TSh " + Math.round(v / 1_000) + "K";
  return "TSh " + Math.round(v);
}

function escapeHtml(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

async function countTable(name) {
  const s = getSafeSupabase();
  if (!s) return null;
  const r = await safeAsync(`premium_count_${name}`, () => s.from(name).select("id", { count: "exact", head: true }), null);
  if (!r || r.error) {
    if (r?.error) recordIntegrationError(`premium_count_${name}`, r.error, { name });
    return null;
  }
  return toNum(r.count);
}

async function countOnlineUsersTable() {
  const s = getSafeSupabase();
  if (!s) return null;
  const r = await safeAsync(
    "premium_online_eq",
    () => s.from("online_users").select("id", { count: "exact", head: true }).eq("online_status", "online"),
    null
  );
  if (r && !r.error) return toNum(r.count);
  const r2 = await safeAsync("premium_online_any", () => s.from("online_users").select("id", { count: "exact", head: true }), null);
  if (r2?.error) {
    recordIntegrationError("premium_online_users", r2.error);
    return null;
  }
  return toNum(r2?.count);
}

async function fetchRecentAdminActions() {
  const s = getSafeSupabase();
  if (!s) return null;
  const r = await safeAsync(
    "premium_admin_actions",
    () =>
      s
        .from("admin_actions")
        .select("id,action_name,action_payload,actor_user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    null
  );
  if (r?.error) {
    recordIntegrationError("premium_admin_actions", r.error);
    return null;
  }
  return asArray(r?.data);
}

function asArray(d) {
  return Array.isArray(d) ? d : [];
}

async function fetchPremiumData() {
  const [summary, websiteCount, onlineCount, recent] = await Promise.all([
    loadLiveSystemSummary(),
    countTable("website_visitors"),
    countOnlineUsersTable(),
    fetchRecentAdminActions(),
  ]);
  return { summary, websiteCount, onlineCount, recent };
}

function buildKpiGridFromSummary(s, ctx) {
  const isLive = s.mode === "supabase";
  const sub = (txt) => (isLive ? txt : "Fallback / mfumo");
  const jumuiya = toNum(s.totalChoirs) + toNum(s.totalDepartments) + toNum(s.totalFellowships);
  const onlineVal = ctx.onlineCount != null ? ctx.onlineCount : s.activeUsers;
  const kpi = [
    ["Jumla ya Dayosisi", nLocale(s.totalDayosisi), sub("Hesabu: public.dayosisi"), "🏛", "g1"],
    ["Jumla ya Majimbo", nLocale(s.totalMajimbo), sub("Hesabu: public.majimbo"), "🗺", "g2"],
    ["Jumla ya Matawi / Vituo", nLocale(s.totalMatawi), sub("Hesabu: public.matawi"), "⛪", "g3"],
    ["Jumla ya Viongozi", nLocale(s.totalLeaders), sub("Hesabu: public.leaders"), "👔", "g4"],
    ["Jumla ya Waumini", nLocale(s.totalMembers), sub("Hesabu: public.members"), "👥", "g5"],
    ["Jumla ya Familia", nLocale(s.totalFamilies), sub("Hesabu: public.families"), "👨‍👩‍👧", "g6"],
    ["Jumuiya, Idara & Kamati", nLocale(jumuiya), sub("choirs + departments + fellowships"), "🎼", "g7"],
    ["Taasisi za Kanisa", nLocale(s.totalInstitutions), sub("Hesabu: public.institutions"), "🏫", "g8"],
    ["Jumla Mapato (aggregated)", fmtMoneyTZS(s.totalIncome), sub("finance tables"), "💰", "g9"],
    ["Jumla Matumizi (aggregated)", fmtMoneyTZS(s.totalExpenses), sub("finance tables"), "💸", "g10"],
    ["Pending (submissions)", nLocale(s.pendingSubmissions), sub("data_submissions status"), "⏳", "g11"],
    [
      "Online (sasa / sessions)",
      nLocale(onlineVal),
      ctx.onlineCount != null ? "Hesabu: public.online_users" : "auth_user_profiles (active) / fallback",
      "🟢",
      "g12",
    ],
  ];
  return kpi
    .map(
      (k) => `<div class="kpi ${k[4]}"><small>${k[3]} ${k[0]}</small><b>${k[1]}</b><span>${k[2]}</span></div>`
    )
    .join("");
}

function activityTbodyFromRows() {
  const recent = liveContext.recent;
  if (!recent || !recent.length) {
    return `<tr><td>—</td><td>mfumo</td><td>Rekebisha RLS au ingia ili kuona <code>admin_actions</code> live</td><td>—</td><td><span class="badge pend">DEMO</span></td>
    <td class="actions"><button type="button" class="view" disabled>VIEW</button></td></tr>
    <tr><td>—</td><td>mfumo</td><td>Super Admin Control Center inaweza kuongeza matukio hapa</td><td>—</td><td><span class="badge subm">HINT</span></td>
    <td class="actions"><a href="super-admin-control-center.html" class="view" style="display:inline-block;padding:6px 8px">Control Center</a></td></tr>`;
  }
  return recent
    .map((r) => {
      const d = r.created_at ? new Date(r.created_at) : new Date();
      const ds = d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const an = escapeHtml(r.action_name || "—");
      return `<tr><td>${ds}</td><td>admin_actions</td><td>${an}</td><td>${r.actor_user_id ? String(r.actor_user_id).slice(0, 8) + "…" : "—"}</td><td><span class="badge subm">LOG</span></td>
      <td class="actions"><button type="button" class="view">VIEW</button></td></tr>`;
    })
    .join("");
}

function liveWidgetsHTML() {
  const s = liveContext.summary;
  if (!s) return "";
  const w = liveContext.websiteCount;
  const pending = s.pendingSubmissions;
  const inc = fmtMoneyTZS(s.totalIncome);
  return `
    <div class="item"><i class="g12">🟢</i><div><b>Online: ${nLocale(liveContext.onlineCount != null ? liveContext.onlineCount : s.activeUsers)}</b><small>${liveContext.onlineCount != null ? "Hesabu kutoka <code>online_users</code> (online)" : "Kutoka <code>activeUsers</code> (profiles)"}.</small></div></div>
    <div class="item"><i class="g11">⏳</i><div><b>Pending: ${nLocale(pending)}</b><small><code>data_submissions</code> status — completion workflow.</small></div></div>
    <div class="item"><i class="g9">💰</i><div><b>Mapato: ${inc}</b><small>Transaction aggregate (kama kuna orodha ya fedha).</small></div></div>
    <div class="item"><i class="g10">👁️</i><div><b>Visitors (meza): ${w != null ? nLocale(w) : "—"}</b><small>${w != null ? "Hesabu: <code>website_visitors</code>." : "RLS/empty — angalia <a href='website-analytics.html'>analytics</a>."}</small></div></div>
  `;
}

function setDocumentTitleFromContext() {
  const m = liveContext.summary?.mode;
  document.title =
    m === "supabase"
      ? "● Live | Dashibodi | KMK(T) National Church Portal"
      : m === "error"
        ? "⚠ Hitilafu | Dashibodi | KMK(T) National Church Portal"
        : "○ Dashibodi | KMK(T) National Church Portal";
}

function updateChips() {
  const s = liveContext.summary;
  if (!s) return;
  const pending = s.pendingSubmissions;
  const online = liveContext.onlineCount != null ? liveContext.onlineCount : s.activeUsers;
  const alerts = s.notCompletedRecords || pending;
  const elP = byId("chipPending");
  const elO = byId("chipOnline");
  const elA = byId("chipAlerts");
  const mode = byId("dataModeChip");
  if (elP) elP.textContent = `⏳ Pending ${pending}`;
  if (elO) elO.textContent = `🟢 Online ${online}`;
  if (elA) elA.textContent = `🔔 Queue ${alerts}`;
  if (mode) {
    let label = "📁 Data: Fallback";
    if (s.mode === "error") label = "⚠️ Data: hitilafu (tumia Sasisha / angalia RLS)";
    else if (s.mode === "supabase") label = "✅ Data: Supabase (hesabu + aggregates)";
    else if (s.mode === "mock") label = "📁 Data: offline / default (bila mteja au RLS)";
    mode.textContent = label;
  }
}

function tablesHTML() {
  return `
 <div class="grid">
  <div class="panel">
   <div class="ph"><h4>Shughuli za Hivi Karibuni (admin_actions)</h4><p>${liveContext.recent?.length ? "Kutoka Supabase" : "Hakuna orodha — angalia ruhusa za RLS au Super Admin."}</p></div>
   <div class="pb"><div class="table-wrap"><table>
    <thead><tr><th>Tarehe</th><th>Module/Meza</th><th>Action</th><th>Actor</th><th>Status</th><th>—</th></tr></thead>
    <tbody>${activityTbodyFromRows()}</tbody>
   </table></div></div>
  </div>
  <div class="panel">
   <div class="ph"><h4>Live Widgets (hesabu + fedha + visitors)</h4><p>Data inapatikana kwa parallel fetch.</p></div>
   <div class="pb"><div class="list">${liveWidgetsHTML()}</div></div>
  </div>
 </div>`;
}

function dashboardHTML() {
  const s = liveContext.summary;
  if (!s) {
    return `<div class="content-error content-loading"><div class="content-loading-inner"><h3 style="color:var(--navy)">Hakuna data</h3><p>Jaribu <b>Sasisha</b> au rejesha ukurasa.</p></div></div>`;
  }
  if (s.mode === "error") {
    return `
    <div class="content-error content-loading">
      <div class="content-loading-inner">
        <h3 style="color:#b91c1c">Hitilafu ya muunganisho</h3>
        <p>Hakukuweza kupakia takwimu. Thibitisha <code>supabase-config.js</code>, nenda <a href="auth-login.html">kuhifadhi kipindi</a>, na angalia ruhusa za RLS.</p>
        <p style="margin-top:12px"><button type="button" class="btn gold" id="btnRetryInit">🔄 Jaribu tena</button></p>
      </div>
    </div>`;
  }
  const kpiBlock = buildKpiGridFromSummary(s, liveContext);
  const vis = getDashboardVisualUrls(siteBranding);
  const heroBgSafe = vis.heroBg ? String(vis.heroBg).replace(/'/g, "\\'") : "";
  const heroBgAttr = heroBgSafe
    ? ` style="background-image:linear-gradient(135deg,rgba(6,26,64,.94),rgba(11,61,145,.78)),url('${heroBgSafe}');background-size:cover;background-position:center"`
    : "";
  const escAttr = (u) => String(u).replace(/"/g, "&quot;");
  return `
 <section class="hero"${heroBgAttr}>
  <div class="hero-inner">
   <div>
    <h1>KANISA LA MENNONITE LA KIINJILI TANZANIA – KMK(T)</h1>
    <p>Dashibodi inasoma takwimu kwa <strong>${s.mode === "supabase" ? "Supabase (idadi halisi/aggregates)" : "hali ya fallback"}</strong> kupitia <code>loadLiveSystemSummary</code> na meza muhimu.</p>
    <span class="motto">IMANI • UMOJA • HUDUMA • UADILIFU</span>
   </div>
   <div class="visuals">
    <div class="visual"><img src="${escAttr(vis.imgJesus)}" alt="Yesu" /><span>Yesu</span></div>
    <div class="visual"><img src="${escAttr(vis.imgBible)}" alt="Biblia" /><span>Biblia</span></div>
    <div class="visual"><img src="${escAttr(vis.imgChurch)}" alt="Kanisa" /><span>Kanisa</span></div>
   </div>
  </div>
 </section>
 <div class="section-head">
   <div><h3>Frame / KPI (live)</h3><p>Chanzo: phase-system-summary + parallel counts.</p></div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
     <button type="button" class="btn gold" onclick="window.location.href='auth-login.html'">+ Ingia</button>
     <button type="button" class="btn blue" id="btnRefreshDataInner">🔄 Sasisha data</button>
   </div>
 </div>
 <div class="kpis">${kpiBlock}</div>
 <div class="section-head"><div><h3>Quick Actions</h3><p>Viungo moja kwa moja vya moduli</p></div></div>
 <div class="cards">
  ${["Ongeza Dayosisi", "Ongeza Kiongozi", "Ongeza Muumini", "Weka Mapato", "Weka Matumizi", "Approve Records"]
    .map(
      (x, i) =>
        `<div class="card" role="button" tabindex="0" onclick="window.location.href='${["church-structure.html", "leadership-management.html", "members-management.html", "finance-management.html", "finance-management.html", "documents-approval-workflow.html"][i]}'"><div class="ci g${i + 1}">${["🏛", "👔", "👥", "💰", "💸", "✅"][i]}</div><b>${x}</b><small>Bofya kufungua module</small></div>`
    )
    .join("")}
 </div>
 ${tablesHTML()}`;
}

function moduleHTML(module, sub) {
  const title = sub || module;
  const s = liveContext.summary;
  return `
 <div class="section-head"><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(module)} • Mfano wa module — uunganisho kamili uko kwenye ukurasa wa kina.</p></div>
 <div><button type="button" class="btn gold" onclick="window.location.href='auth-login.html'">+ Ongeza</button> <button type="button" class="btn blue" onclick="window.print()">Print</button></div></div>
 <div class="kpis">
  <div class="kpi g1"><small>Jumla (mfano)</small><b>${s ? nLocale(s.totalMembers) : "—"}</b><span>Rejea: waumini</span></div>
  <div class="kpi g3"><small>Pending (mfano)</small><b>${s ? nLocale(s.pendingSubmissions) : "—"}</b><span>Submissions</span></div>
  <div class="kpi g4"><small>Approved (mfano)</small><b>${s ? nLocale(s.approvedSubmissions) : "—"}</b><span>Idhini</span></div>
  <div class="kpi g11"><small>Not completed</small><b>${s ? nLocale(s.notCompletedRecords) : "—"}</b><span>Compliance</span></div>
 </div>
 <div class="panel" style="margin-top:18px">
  <div class="ph"><h4>Jedwali la ${escapeHtml(title)}</h4><p>Chagua kiungo kushoto au tumia orodha ya <a href="index.html#modules">Modules</a> kwenye mwanzo.</p></div>
  <div class="pb"><div class="table-wrap"><table>
   <thead><tr><th>ID</th><th>Sample</th><th>Ngazi</th><th>Dayosisi</th><th>Status</th><th>—</th></tr></thead>
   <tbody>
    <tr><td>01</td><td>${escapeHtml(String(title).toUpperCase())} A</td><td>NATIONAL</td><td>MARA</td><td><span class="badge ok">DEMO</span></td><td>—</td></tr>
   </tbody>
  </table></div></div>
 </div>`;
}

function renderPage(module = "Dashibodi Kuu", sub = "Overview") {
  currentModule = module;
  currentSub = sub;
  if (byId("pageTitle")) byId("pageTitle").textContent = sub === "Overview" ? module : sub;
  if (byId("pageSub")) byId("pageSub").textContent = `${module} / ${sub}`;
  const c = byId("content");
  if (!c) return;
  c.innerHTML = module === "Dashibodi Kuu" && sub === "Overview" ? dashboardHTML() : moduleHTML(module, sub);
}

function renderSidebar(filter = "") {
  const wrap = byId("modules");
  if (!wrap) return;
  const q = (filter || "").toLowerCase();
  wrap.innerHTML = "";
  modules
    .filter((m) => m.name.toLowerCase().includes(q) || m.subs.join(" ").toLowerCase().includes(q))
    .forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "module";
      const open = i === 0 && !filter;
      div.innerHTML = `
   <button type="button" class="module-btn ${open ? "active" : ""}" data-idx="${i}">
    <span class="module-left"><span class="ico">${m.icon}</span><span>${m.name}</span></span><span>⌄</span>
   </button>
   <div class="subs ${open ? "open" : ""}">
    ${m.subs.map((s) => `<a href="#" class="sub" data-module="${m.name}" data-sub="${s}">${s}</a>`).join("")}
   </div>`;
      wrap.appendChild(div);
    });
  document.querySelectorAll(".module-btn").forEach((btn) => {
    btn.onclick = () => {
      btn.classList.toggle("active");
      const n = btn.nextElementSibling;
      if (n) n.classList.toggle("open");
    };
  });
  document.querySelectorAll(".sub").forEach((a) => {
    a.onclick = (e) => {
      e.preventDefault();
      const key = a.dataset.module + "|" + a.dataset.sub;
      if (moduleSubRoutes[key]) {
        window.location.href = moduleSubRoutes[key];
        return;
      }
      document.querySelectorAll(".sub").forEach((x) => x.classList.remove("active"));
      a.classList.add("active");
      renderPage(a.dataset.module, a.dataset.sub);
      if (innerWidth < 1050) closeSide();
    };
  });
}

function openSide() {
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("show");
}
function closeSide() {
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

async function onRefresh() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  const b1 = byId("btnRefreshData");
  if (b1) b1.disabled = true;
  const prevInner = byId("btnRefreshDataInner");
  if (prevInner) prevInner.disabled = true;
  try {
    await refreshSiteBranding();
    liveContext = await fetchPremiumData();
    updateChips();
    applyLogoToDashboardSidebar(siteBranding);
    renderPage(currentModule, currentSub);
    setDocumentTitleFromContext();
  } catch (e) {
    recordIntegrationError("dashboard_premium_refresh", e, {});
    liveContext = { summary: { ...EMPTY_SUMMARY, mode: "error" }, websiteCount: null, onlineCount: null, recent: null };
    updateChips();
    applyLogoToDashboardSidebar(siteBranding);
    renderPage(currentModule, currentSub);
    setDocumentTitleFromContext();
  } finally {
    refreshInFlight = false;
    if (b1) b1.disabled = false;
    const b2 = byId("btnRefreshDataInner");
    if (b2) b2.disabled = false;
  }
}

function bindOneShotListeners() {
  if (window.__kmktDashboardPremiumBound) return;
  window.__kmktDashboardPremiumBound = true;
  byId("btnRefreshData")?.addEventListener("click", onRefresh);
  document.body.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.id === "btnRefreshDataInner") {
      e.preventDefault();
      onRefresh();
    }
    if (t && t.id === "btnRetryInit") {
      e.preventDefault();
      onRefresh();
    }
  });
}

async function initDashboardPremium() {
  if (window.__kmktDashboardPremiumInit) return;
  window.__kmktDashboardPremiumInit = true;
  installGlobalCrashGuards("dashboard_premium");
  const menuBtn = byId("menuBtn");
  if (menuBtn) menuBtn.onclick = openSide;
  if (overlay) overlay.onclick = closeSide;
  const sIn = byId("search");
  if (sIn) sIn.oninput = (e) => renderSidebar(e.target.value);
  bindOneShotListeners();
  try {
    await refreshSiteBranding();
    liveContext = await fetchPremiumData();
    if (!liveContext.summary) {
      liveContext.summary = { ...EMPTY_SUMMARY, mode: "error" };
    }
  } catch (e) {
    recordIntegrationError("dashboard_premium_init", e, {});
    liveContext = { summary: { ...EMPTY_SUMMARY, mode: "error" }, websiteCount: null, onlineCount: null, recent: null };
  }
  updateChips();
  applyLogoToDashboardSidebar(siteBranding);
  renderSidebar();
  renderPage();
  setDocumentTitleFromContext();
}

initDashboardPremium();
