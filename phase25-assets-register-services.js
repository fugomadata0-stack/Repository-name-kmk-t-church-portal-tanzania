import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const useSupabase = () => !!getSafeSupabase();

const tables = {
  assets: "assets",
  assetCategories: "asset_categories",
  assetDocuments: "asset_documents",
  assetMaintenance: "asset_maintenance",
  assetValuations: "asset_valuations",
  assetReports: "asset_reports",
  activityLogs: "activity_logs",
};

const state = {
  assets: [
    {
      id: 1,
      asset_id: "AST-001",
      asset_name: "Jengo la Ibada Kuu",
      category: "Buildings",
      description: "Main sanctuary building",
      serial_number: "",
      dayosisi: "Dayosisi ya Dar es Salaam",
      jimbo: "Jimbo la Kati",
      tawi: "Tawi la Mikocheni",
      location: "Mikocheni Campus",
      acquisition_date: "2019-06-10",
      estimated_value: 850000000,
      condition: "Good",
      responsible_person: "Mch. Daniel Mrema",
      notes: "Ukaguzi wa paa unahitajika kila robo mwaka.",
      status: "Active",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 2,
      asset_id: "AST-002",
      asset_name: "Toyota Coaster - Church Bus",
      category: "Vehicles",
      description: "Usafiri wa waumini na choir team",
      serial_number: "TZ-CBUS-8821",
      dayosisi: "Dayosisi ya Arusha",
      jimbo: "Jimbo la Kaskazini",
      tawi: "Tawi la Njiro",
      location: "Church Garage",
      acquisition_date: "2021-03-14",
      estimated_value: 145000000,
      condition: "Fair",
      responsible_person: "Ester Sanga",
      notes: "Inahitaji service ndani ya wiki mbili.",
      status: "Under Maintenance",
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 3,
      asset_id: "AST-003",
      asset_name: "Camera Set ya Media",
      category: "Media Equipment",
      description: "Cameras 3 + lenses",
      serial_number: "MD-CAM-1229",
      dayosisi: "Dayosisi ya Mbeya",
      jimbo: "Jimbo la Ruanda",
      tawi: "Tawi la Iyunga",
      location: "Media Room",
      acquisition_date: "2022-08-20",
      estimated_value: 32000000,
      condition: "Excellent",
      responsible_person: "Daniel Peter",
      notes: "Imebaki katika hali nzuri.",
      status: "Active",
      created_at: now(),
      updated_at: now(),
    },
  ],
  assetCategories: [],
  assetDocuments: [],
  assetMaintenance: [],
  assetValuations: [],
  assetReports: [],
};

function baseAssetPayload(payload = {}) {
  return {
    asset_id: payload.asset_id || `AST-${String(Date.now()).slice(-5)}`,
    asset_name: payload.asset_name || "Asset mpya",
    category: payload.category || "Other",
    description: payload.description || "",
    serial_number: payload.serial_number || "",
    dayosisi: payload.dayosisi || "Dayosisi ya Taifa",
    jimbo: payload.jimbo || "Jimbo Kuu",
    tawi: payload.tawi || "Tawi Kuu",
    location: payload.location || "",
    acquisition_date: payload.acquisition_date || today(),
    estimated_value: Number(payload.estimated_value || 0),
    condition: payload.condition || "Good",
    responsible_person: payload.responsible_person || "",
    notes: payload.notes || "",
    status: payload.status || "Active",
    created_at: now(),
    updated_at: now(),
  };
}

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase25_load_assets",
    async () =>
      Promise.all([
        s.from(tables.assets).select("*").order("id", { ascending: false }),
        s.from(tables.assetCategories).select("*").order("id", { ascending: false }),
        s.from(tables.assetDocuments).select("*").order("id", { ascending: false }),
        s.from(tables.assetMaintenance).select("*").order("id", { ascending: false }),
        s.from(tables.assetValuations).select("*").order("id", { ascending: false }),
        s.from(tables.assetReports).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [assets, categories, documents, maintenance, valuations, reports] = result;
  if (!assets.error) state.assets = asArray(assets.data);
  if (!categories.error) state.assetCategories = asArray(categories.data);
  if (!documents.error) state.assetDocuments = asArray(documents.data);
  if (!maintenance.error) state.assetMaintenance = asArray(maintenance.data);
  if (!valuations.error) state.assetValuations = asArray(valuations.data);
  if (!reports.error) state.assetReports = asArray(reports.data);
}

async function logActivity(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync(
    "phase25_activity_log",
    async () => s.from(tables.activityLogs).insert({ module: "assets_register", action, payload, created_at: now() }),
    null
  );
}

export async function loadAssetsRegisterData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getAssets = () => [...state.assets];

export function getKpis() {
  const assets = state.assets;
  const totalValue = assets.reduce((sum, a) => sum + Number(a.estimated_value || 0), 0);
  const maintenanceDue = assets.filter((a) => a.status === "Under Maintenance" || a.condition === "Needs Repair").length;
  const missingDamaged = assets.filter((a) => ["Missing", "Damaged"].includes(a.status) || a.condition === "Damaged").length;
  return {
    totalAssets: assets.length,
    buildings: assets.filter((a) => a.category === "Buildings").length,
    vehicles: assets.filter((a) => a.category === "Vehicles").length,
    equipment: assets.filter((a) => ["Media Equipment", "Furniture", "School Assets"].includes(a.category)).length,
    active: assets.filter((a) => a.status === "Active").length,
    maintenanceDue,
    assetValue: totalValue,
    missingDamaged,
  };
}

export async function addAsset(payload = {}) {
  const row = { id: Date.now(), ...baseAssetPayload(payload) };
  state.assets.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase25_add_asset", async () => s.from(tables.assets).insert(row), null);
    await safeAsync(
      "phase25_add_valuation",
      async () =>
        s.from(tables.assetValuations).insert({
          asset_id: row.id,
          estimated_value: row.estimated_value,
          valuation_date: row.acquisition_date || today(),
          notes: row.notes || "Initial valuation",
        }),
      null
    );
  } else {
    state.assetValuations.unshift({
      id: Date.now() + 1,
      asset_id: row.id,
      estimated_value: row.estimated_value,
      valuation_date: row.acquisition_date || today(),
      notes: row.notes || "Initial valuation",
    });
  }
  await logActivity("add_asset", { id: row.id, category: row.category, value: row.estimated_value });
}

export async function updateAsset(id, payload = {}) {
  const row = state.assets.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  Object.assign(row, payload, { updated_at: now() });
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase25_update_asset", async () => s.from(tables.assets).update(payload).eq("id", id), null);
  }
  await logActivity("update_asset", { id, payload });
}

export async function deleteAsset(id) {
  state.assets = state.assets.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase25_delete_asset", async () => s.from(tables.assets).delete().eq("id", id), null);
  }
  await logActivity("delete_asset", { id });
}

export async function clearAssets() {
  state.assets = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase25_clear_assets", async () => s.from(tables.assets).delete().neq("id", -1), null);
  }
  await logActivity("clear_assets", {});
}

export async function uploadAssetDocument(id) {
  const row = state.assets.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase25_upload_doc",
      async () =>
        s.from(tables.assetDocuments).insert({
          asset_id: id,
          document_name: `${row.asset_name} Document`,
          document_type: "placeholder",
          uploaded_at: now(),
        }),
      null
    );
  } else {
    state.assetDocuments.unshift({
      id: Date.now(),
      asset_id: id,
      document_name: `${row.asset_name} Document`,
      document_type: "placeholder",
      uploaded_at: now(),
    });
  }
  await logActivity("upload_asset_document", { id, asset_name: row.asset_name });
}

export async function markMaintenance(id) {
  const row = state.assets.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = "Under Maintenance";
  row.condition = row.condition === "Damaged" ? "Damaged" : "Needs Repair";
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase25_mark_maintenance",
      async () => s.from(tables.assets).update({ status: row.status, condition: row.condition }).eq("id", id),
      null
    );
    await safeAsync(
      "phase25_add_maintenance",
      async () =>
        s.from(tables.assetMaintenance).insert({
          asset_id: id,
          maintenance_date: today(),
          status: "Pending",
          notes: `Maintenance scheduled for ${row.asset_name}`,
        }),
      null
    );
  } else {
    state.assetMaintenance.unshift({
      id: Date.now(),
      asset_id: id,
      maintenance_date: today(),
      status: "Pending",
      notes: `Maintenance scheduled for ${row.asset_name}`,
    });
  }
  await logActivity("mark_maintenance", { id, asset_name: row.asset_name });
}
