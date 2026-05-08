import { getSafeSupabase, installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { exportCsv } from "./phase3-services.js";
import { guardRoute } from "./services/auth-service.js";
import { assetCategories, assetStatuses, conditionOptions, kpiDefs, miniModules, roleAccessAssets } from "./phase25-assets-register-hooks.js";
import {
  addAsset,
  clearAssets,
  deleteAsset,
  getAssets,
  getKpis,
  loadAssetsRegisterData,
  markMaintenance,
  updateAsset,
  uploadAssetDocument,
} from "./phase25-assets-register-services.js";

const el = (id) => document.getElementById(id);
const appRole = localStorage.getItem("kmt_user_role") || "admin";
let realtimeChannel = null;
let livePollInterval = null;
let lastLiveToastAt = 0;

const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2600);
};

const badge = (text) => `<span class="status ${resolveFinalStatusColor(text)}">${text}</span>`;

function formatCurrency(value) {
  const num = Number(value || 0);
  return `TZS ${num.toLocaleString()}`;
}

function renderMiniModules() {
  el("miniModules").innerHTML = miniModules.map((m) => `<span class="badge">${m}</span>`).join("");
}

function renderFormSelects() {
  el("category").innerHTML = assetCategories.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("condition").innerHTML = conditionOptions.map((v) => `<option value="${v}">${v}</option>`).join("");
  el("status").innerHTML = assetStatuses.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function renderKpis() {
  const k = getKpis();
  const values = [k.totalAssets, k.buildings, k.vehicles, k.equipment, k.active, k.maintenanceDue, formatCurrency(k.assetValue), k.missingDamaged];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderTable() {
  const rows = getAssets();
  el("assetsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.asset_id || `AST-${r.id}`}</td>
      <td>${r.asset_name || "-"}</td>
      <td>${r.category || "-"}</td>
      <td>${r.dayosisi || "-"}</td>
      <td>${r.jimbo || "-"}</td>
      <td>${r.tawi || "-"}</td>
      <td>${r.location || "-"}</td>
      <td>${badge(r.condition || "-")}</td>
      <td>${formatCurrency(r.estimated_value)}</td>
      <td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewAsset" data-id="${r.id}">View Details</button>
        <button class="btn tiny" data-action="editAsset" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="deleteAsset" data-id="${r.id}">Delete</button>
        <button class="btn tiny" data-action="uploadDocument" data-id="${r.id}">Upload Document</button>
        <button class="btn tiny" data-action="markMaintenance" data-id="${r.id}">Mark Maintenance</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna mali za kanisa kwa sasa.</div></td></tr>`;
}

function refreshAll() {
  renderKpis();
  renderTable();
}

function clearForm() {
  el("assetForm").reset();
  el("acquisitionDate").value = new Date().toISOString().slice(0, 10);
}

function collectFormData() {
  return {
    asset_name: el("assetName").value.trim(),
    category: el("category").value,
    description: el("description").value.trim(),
    serial_number: el("serialNumber").value.trim(),
    dayosisi: el("dayosisi").value.trim() || "Dayosisi ya Taifa",
    jimbo: el("jimbo").value.trim() || "Jimbo Kuu",
    tawi: el("tawi").value.trim() || "Tawi Kuu",
    location: el("location").value.trim(),
    acquisition_date: el("acquisitionDate").value,
    estimated_value: Number(el("estimatedValue").value || 0),
    condition: el("condition").value,
    responsible_person: el("responsiblePerson").value.trim(),
    notes: el("notes").value.trim(),
    status: el("status").value,
  };
}

async function reloadFromLive() {
  await loadAssetsRegisterData();
  refreshAll();
}

function exportAssetsCsv() {
  const header = "Asset ID,Jina la Mali,Category,Dayosisi,Jimbo,Tawi,Location,Condition,Estimated Value,Status";
  const rows = getAssets().map((r) => {
    const values = [
      r.asset_id || `AST-${r.id}`,
      r.asset_name || "",
      r.category || "",
      r.dayosisi || "",
      r.jimbo || "",
      r.tawi || "",
      r.location || "",
      r.condition || "",
      Number(r.estimated_value || 0),
      r.status || "",
    ];
    return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  exportCsv("kmt-assets-register.csv", [header, ...rows]);
}

function setLiveBadge(text) {
  const badgeEl = el("liveBadge");
  if (badgeEl) badgeEl.textContent = text;
}

function setupRealtime() {
  const s = getSafeSupabase();
  if (livePollInterval) clearInterval(livePollInterval);
  livePollInterval = setInterval(() => {
    reloadFromLive().catch(() => {});
  }, 45000);

  if (!s || typeof s.channel !== "function") {
    setLiveBadge("Realtime: Mock");
    return;
  }
  setLiveBadge("Realtime: Live + Sync");
  if (realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  realtimeChannel = s.channel("phase25-assets-register-live");
  ["assets", "asset_categories", "asset_documents", "asset_maintenance", "asset_valuations", "asset_reports"].forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
      reloadFromLive().catch(() => {});
      if (Date.now() - lastLiveToastAt > 5000) {
        toast("Live update imepokelewa kutoka Supabase.");
        lastLiveToastAt = Date.now();
      }
    });
  });
  realtimeChannel.subscribe((status) => {
    if (status === "SUBSCRIBED") setLiveBadge("Realtime: Live");
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLiveBadge("Realtime: Live (reconnecting...)");
  });
}

function bind() {
  el("assetForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(roleAccessAssets[appRole]?.add ?? false)) {
      toast("Huna ruhusa ya Add Asset.");
      return;
    }
    await addAsset(collectFormData());
    refreshAll();
    clearForm();
    toast("Asset mpya imeongezwa.");
  });

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = Number(target.dataset.id);
    if (!action) return;

    if (action === "addAsset") {
      el("assetName").focus();
      toast("Jaza form kuongeza asset mpya.");
      return;
    }
    if (action === "clearAssets") {
      if (!(roleAccessAssets[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Clear Assets.");
        return;
      }
      await clearAssets();
      refreshAll();
      toast("Assets zote zime-clear.");
      return;
    }
    if (action === "export") {
      if (!(roleAccessAssets[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Export.");
        return;
      }
      exportAssetsCsv();
      toast("CSV ya mali za kanisa imeshatolewa.");
      return;
    }
    if (action === "print") {
      if (!(roleAccessAssets[appRole]?.export ?? false)) {
        toast("Role yako haina ruhusa ya Print.");
        return;
      }
      window.print();
      return;
    }
    if (!id) return;

    if (action === "viewAsset") toast(`Asset #${id} details panel iko tayari.`);
    if (action === "editAsset") {
      await updateAsset(id, { status: "Active" });
      refreshAll();
      toast("Asset imesasishwa.");
    }
    if (action === "deleteAsset") {
      if (!(roleAccessAssets[appRole]?.delete ?? false)) {
        toast("Role yako haina ruhusa ya Delete Asset.");
        return;
      }
      await deleteAsset(id);
      refreshAll();
      toast("Asset imefutwa.");
    }
    if (action === "uploadDocument") {
      if (!(roleAccessAssets[appRole]?.upload ?? false)) {
        toast("Role yako haina ruhusa ya Upload Document.");
        return;
      }
      await uploadAssetDocument(id);
      toast("Document placeholder imeongezwa.");
    }
    if (action === "markMaintenance") {
      if (!(roleAccessAssets[appRole]?.maintenance ?? false)) {
        toast("Role yako haina ruhusa ya Maintenance.");
        return;
      }
      await markMaintenance(id);
      refreshAll();
      toast("Asset imewekwa kwenye maintenance.");
    }
  });
}

async function init() {
  if (!guardRoute(["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "finance_officer"])) return;
  installGlobalCrashGuards("phase25_assets_register");
  renderMiniModules();
  renderFormSelects();
  clearForm();
  try {
    await loadAssetsRegisterData();
  } catch (_) {
    toast("Supabase sync imekwama, inaendelea na mock data.");
  }
  setupRealtime();
  bind();
  refreshAll();
  window.addEventListener("beforeunload", () => {
    const s = getSafeSupabase();
    if (livePollInterval) clearInterval(livePollInterval);
    if (s && realtimeChannel && typeof s.removeChannel === "function") s.removeChannel(realtimeChannel);
  });
}

init();
