export const miniModules = [
  "Church Properties",
  "Buildings",
  "Land Records",
  "Vehicles",
  "Furniture",
  "Media Equipment",
  "School Assets",
  "Asset Maintenance",
  "Asset Documents",
  "Asset Reports",
];

export const assetCategories = ["Church Properties", "Buildings", "Land Records", "Vehicles", "Furniture", "Media Equipment", "School Assets", "Other"];
export const conditionOptions = ["Excellent", "Good", "Fair", "Needs Repair", "Damaged"];
export const assetStatuses = ["Active", "Under Maintenance", "Inactive", "Missing", "Damaged"];

export const roleAccessAssets = {
  super_admin: { add: true, edit: true, delete: true, upload: true, maintenance: true, export: true },
  admin: { add: true, edit: true, delete: true, upload: true, maintenance: true, export: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, upload: true, maintenance: true, export: true },
  mchungaji: { add: true, edit: true, delete: false, upload: true, maintenance: true, export: true },
  kiongozi_tawi: { add: true, edit: true, delete: false, upload: true, maintenance: true, export: false },
  member: { add: false, edit: false, delete: false, upload: false, maintenance: false, export: false },
};

export const kpiDefs = [
  ["Jumla ya Mali", "royal"],
  ["Buildings", "teal"],
  ["Vehicles", "amber"],
  ["Equipment", "violet"],
  ["Assets Active", "emerald"],
  ["Maintenance Due", "rose"],
  ["Asset Value", "indigo"],
  ["Missing / Damaged", "slate"],
];

// Supabase-ready targets:
// assets, asset_categories, asset_documents, asset_maintenance,
// asset_valuations, asset_reports, activity_logs
