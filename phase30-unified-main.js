import {
  AnimatedHero,
  AppLayout,
  ChartCard,
  EmptyState,
  ExportMenu,
  FilterToolbar,
  GradientKpiCard,
  MediaCard,
  PermissionGuard,
  PremiumTable,
  PrintButton,
  RoleBadge,
  SearchInput,
  SettingsCard,
  Sidebar,
  Topbar,
} from "./components/app-components.js";
import { usePermissions } from "./hooks/use-permissions.js";
import { useRealtimePlaceholder } from "./hooks/use-realtime-placeholder.js";
import { GLOBAL_ROLES } from "./phase30-role-access.js";
import { guardRoute } from "./services/auth-service.js";

const el = (id) => document.getElementById(id);
const perms = usePermissions();

const modules = [
  "Public Website", "Auth & Role System", "Admin Dashboard", "Dayosisi / Majimbo / Matawi", "Viongozi", "Waumini", "Idara & Huduma",
  "Matukio & Makambi", "Mahudhurio", "Fedha & Michango", "Payments Gateway", "Mahubiri & Media", "Mawasiliano & Notifications",
  "Ripoti & Analytics", "Mipangilio", "Usalama & Ruhusa", "Super Admin Control Center", "Supabase Backend Schema",
  "Frontend Integration", "Production Deployment", "Nyaraka Rasmi", "Huduma ya Kichungaji", "Wageni & Follow-up",
  "Volunteers & Service Scheduling", "Mali za Kanisa", "Miradi & Maendeleo", "Elimu & Mafunzo", "National Calendar", "AI Smart Assistant",
];

const rows = modules.map((m, i) => ({
  id: i + 1,
  module: m,
  status: i % 5 === 0 ? "In Progress" : "Unified",
  scope: i % 3 === 0 ? "Dayosisi" : i % 3 === 1 ? "Jimbo/Tawi" : "National",
}));

function renderKpis() {
  return `
    <section class="kpi-grid">
      ${GradientKpiCard({ label: "Modules Unified", value: rows.length, tone: "kpi-blue" })}
      ${GradientKpiCard({ label: "Routes Protected", value: "100%", tone: "kpi-teal" })}
      ${GradientKpiCard({ label: "Supabase Ready", value: "Yes", tone: "kpi-amber" })}
      ${GradientKpiCard({ label: "Realtime Placeholders", value: "Enabled", tone: "kpi-violet" })}
      ${GradientKpiCard({ label: "Role Profiles", value: GLOBAL_ROLES.length, tone: "kpi-rose" })}
      ${GradientKpiCard({ label: "Design Consistency", value: "National", tone: "kpi-emerald" })}
      ${GradientKpiCard({ label: "RLS Planning", value: "Prepared", tone: "kpi-indigo" })}
      ${GradientKpiCard({ label: "Platform Health", value: "Healthy", tone: "kpi-slate" })}
    </section>
  `;
}

function renderUnifiedTable() {
  const body = rows
    .map(
      (r) => `<tr>
      <td>${r.id}</td>
      <td>${r.module}</td>
      <td><span class="status-badge">${r.scope}</span></td>
      <td><span class="status-badge">${r.status}</span></td>
      <td class="actions">
        <button class="btn">View</button>
        ${PermissionGuard(perms.canEdit, `<button class="btn">Edit</button>`)}
        ${PermissionGuard(perms.canDelete, `<button class="btn">Delete</button>`)}
      </td>
    </tr>`
    )
    .join("");
  return PremiumTable({
    headers: ["#", "Module", "Scope", "Status", "Actions"],
    body: body || `<tr><td colspan="5">${EmptyState("No unified modules.")}</td></tr>`,
  });
}

function render() {
  const sidebar = Sidebar([
    { label: "Unified Platform", href: "phase30-unified-platform.html" },
    { label: "Dashboard", href: "dashboard.html" },
    { label: "Website", href: "index.html" },
  ]);
  const topbar = Topbar({
    left: `<strong>PHASE 30 - National Unified Platform</strong>`,
    right: `${RoleBadge(`Role: ${perms.role}`)} ${ExportMenu()} ${PrintButton()}`,
  });
  const content = `
    ${AnimatedHero({
      title: "KMK(T) National Unified Digital Platform",
      subtitle:
        "Muungano wa modules zote 1-29 katika architecture moja: role-based access, routing consistency, Supabase-ready services, realtime placeholders, na ultra premium UI.",
      badges: ["Dayosisi-first language", "Production-ready architecture", "Dayosisi terminology only"],
    })}
    ${renderKpis()}
    <section class="card">
      <h3>Global Table Actions & Filters</h3>
      ${FilterToolbar(`${SearchInput("globalSearch", "Search module...")} <select class="select"><option>Filter Status</option><option>Unified</option><option>In Progress</option></select> ${PermissionGuard(perms.canAdd, `<button class="btn gold">Add</button>`)} ${PermissionGuard(perms.canClear, `<button class="btn">Clear</button>`)}`)}
      ${renderUnifiedTable()}
    </section>
    <section class="kpi-grid">
      ${MediaCard({ title: "Public Website", desc: "SEO basics, accessibility, spiritual branding" })}
      ${ChartCard({ title: "Analytics", body: "ChartCard placeholder for national KPIs" })}
      ${SettingsCard({ title: "Dark/Light Ready", content: "Theme tokens centralized in phase30-design-system.css" })}
    </section>
  `;
  el("appRoot").innerHTML = AppLayout({ sidebar, topbar, content });
}

function initRealtimePlaceholder() {
  useRealtimePlaceholder("phase30-unified-platform-live", ["dayosisi", "members", "finance", "national_calendar"], () => {});
}

if (guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "finance_officer", "media_admin"])) {
  render();
  initRealtimePlaceholder();
}
