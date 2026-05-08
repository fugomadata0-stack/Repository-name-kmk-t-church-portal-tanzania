import { settingsRoleAccess, settingsTabs, sectionFields } from "./phase15-settings-hooks.js";
import { loadSettingsData, getMode, getSections, saveSection, resetSection, restoreDefaultsAll } from "./phase15-settings-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
let role = localStorage.getItem("mock_role") || "admin";
let activeTab = "General";
const can = (k) => !!(settingsRoleAccess[role] || settingsRoleAccess.member)[k];
const toast = (m) => { const d = document.createElement("div"); d.className = "toast"; d.textContent = m; el("toastWrap").appendChild(d); setTimeout(() => d.remove(), 2500); };

function renderKpis() {
  const data = [
    ["k1", "Active Settings Profiles", "14"], ["k2", "Branding Status", "Ready"], ["k3", "Notification Rules", "12"],
    ["k4", "Finance Defaults", "Configured"], ["k5", "Attendance Defaults", "Configured"], ["k6", "Security Preferences", "High"],
    ["k7", "Backup Preferences", "Daily"], ["k8", "Environment Health", "Good"],
  ];
  el("kpiGrid").innerHTML = data.map(([k, l, v]) => `<article class="kpi ${k}"><p>${l}</p><h3>${v}</h3></article>`).join("");
}

function renderTabs() {
  el("tabsBar").innerHTML = settingsTabs.map((t) => `<button class="tab-btn ${t === activeTab ? "active" : ""}" data-tab="${t}">${t}</button>`).join("");
}

function renderSection() {
  const sections = getSections();
  const fields = sectionFields[activeTab] || [
    { key: "default_a", label: `${activeTab} Setting A` },
    { key: "default_b", label: `${activeTab} Setting B` },
    { key: "default_c", label: `${activeTab} Setting C` },
  ];
  const data = sections[activeTab] || {};
  el("tabContent").innerHTML = `<form id="sectionForm" class="form-grid">${fields.map((f) => {
    const v = data[f.key] ?? "";
    if (f.textarea) return `<label class="full">${f.label}<textarea name="${f.key}">${v}</textarea></label>`;
    return `<label>${f.label}<input type="${f.type || "text"}" name="${f.key}" value="${v}" /></label>`;
  }).join("")}</form>`;
}

async function onSave() {
  if (!can("edit")) return toast("Huna ruhusa ya kuhariri.");
  const payload = Object.fromEntries(new FormData(el("sectionForm")).entries());
  await saveSection(activeTab, payload);
  toast(`${activeTab} saved.`);
}
function onReset() {
  if (!can("reset")) return toast("Huna ruhusa ya reset.");
  resetSection(activeTab);
  renderSection();
  toast(`${activeTab} reset.`);
}
function onRestoreAll() {
  if (!can("restore")) return toast("Huna ruhusa ya restore.");
  restoreDefaultsAll();
  renderSection();
  toast("Defaults restored.");
}

function bind() {
  el("tabsBar").addEventListener("click", (e) => {
    const t = e.target.dataset.tab;
    if (!t) return;
    activeTab = t;
    renderTabs();
    renderSection();
  });
  el("saveSectionBtn").addEventListener("click", onSave);
  el("resetSectionBtn").addEventListener("click", onReset);
  el("restoreDefaultsBtn").addEventListener("click", onRestoreAll);
}

async function init() {
  installGlobalCrashGuards("phase15_settings");
  try {
    await loadSettingsData();
  } catch (_) {
    toast("Supabase load imekwama, inaendelea na local settings.");
  }
  el("modeBadge").textContent = `Data: ${getMode() === "supabase" ? "Supabase" : "Mock"} • Role: ${role}`;
  renderKpis();
  renderTabs();
  renderSection();
  bind();
}
init();
