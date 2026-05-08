export const AppLayout = ({ sidebar, topbar, content }) => `
  <div class="app-layout">
    <aside class="sidebar">${sidebar || ""}</aside>
    <section class="main-content">
      ${topbar || ""}
      ${content || ""}
    </section>
  </div>
`;

export const PublicLayout = (content = "") => `<main class="main-content">${content}</main>`;
export const AuthLayout = (content = "") => `<main class="main-content"><section class="card">${content}</section></main>`;
export const Sidebar = (items = []) => `<nav>${items.map((i) => `<a class="btn" href="${i.href || "#"}">${i.label}</a>`).join("")}</nav>`;
export const Topbar = ({ left = "", right = "" }) => `<header class="topbar"><div>${left}</div><div>${right}</div></header>`;
export const AnimatedHero = ({ title, subtitle, badges = [] }) => `
  <section class="hero">
    <div style="position:relative;z-index:1">
      <h1>${title || ""}</h1>
      <p>${subtitle || ""}</p>
      <div class="toolbar">${badges.map((b) => `<span class="status-badge">${b}</span>`).join("")}</div>
    </div>
    ${SpiritualHeroVisual()}
  </section>
`;
export const SpiritualHeroVisual = () => `
  <div class="spiritual-visual">
    <article class="visual-pill visual-jesus">Jesus</article>
    <article class="visual-pill visual-bible">Bible</article>
    <article class="visual-pill visual-church">Church</article>
  </div>
`;
export const GradientKpiCard = ({ label, value, tone }) => `<article class="kpi-card ${tone || "kpi-blue"}"><h4>${label}</h4><p>${value}</p></article>`;
export const PremiumTable = ({ headers = [], body = "" }) => `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
export const FilterToolbar = (content = "") => `<div class="toolbar">${content}</div>`;
export const SearchInput = (id = "searchInput", placeholder = "Search...") => `<input id="${id}" class="input" type="search" placeholder="${placeholder}" />`;
export const StatusBadge = (text = "") => `<span class="status-badge">${text}</span>`;
export const RoleBadge = (text = "") => `<span class="role-badge">${text}</span>`;
export const ConfirmDeleteModal = () => `<div id="confirmDeleteModal" class="modal"><div class="modal-card"><h3>Confirm Delete</h3><p>Una uhakika?</p></div></div>`;
export const DrawerForm = (content = "") => `<div class="drawer show"><div class="drawer-card">${content}</div></div>`;
export const ViewDetailsDrawer = (content = "") => `<div class="drawer show"><div class="drawer-card"><h3>Details</h3>${content}</div></div>`;
export const ExportMenu = () => `<button class="btn">Export</button>`;
export const PrintButton = () => `<button class="btn" onclick="window.print()">Print</button>`;
export const LoadingState = () => `<div class="state">Loading...</div>`;
export const EmptyState = (message = "No data available.") => `<div class="state">${message}</div>`;
export const ErrorState = (message = "Something went wrong.") => `<div class="state">${message}</div>`;
export const PermissionGuard = (allowed, content = "") => (allowed ? content : `<div class="permission-guard-denied">Huna ruhusa kwa action hii.</div>`);
export const ProtectedRoute = (allowed, render) => (allowed ? render() : `<div class="state">Unauthorized route access.</div>`);
export const MediaCard = ({ title, desc }) => `<article class="card"><h4>${title}</h4><p>${desc || ""}</p></article>`;
export const ChartCard = ({ title, body = "Chart placeholder" }) => `<article class="card"><h4>${title}</h4><div class="state">${body}</div></article>`;
export const FileUploadBox = (label = "Upload file") => `<label class="btn">${label}<input type="file" hidden /></label>`;
export const SettingsCard = ({ title, content }) => `<article class="card"><h4>${title}</h4><p>${content || ""}</p></article>`;
