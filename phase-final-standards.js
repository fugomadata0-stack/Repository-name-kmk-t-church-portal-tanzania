export const FINAL_SUBMISSION_STATUSES = [
  { sw: "Haijawasilishwa", en: "Not Submitted", key: "not_submitted", color: "slate" },
  { sw: "Rasimu", en: "Draft", key: "draft", color: "gray" },
  { sw: "Imewasilishwa", en: "Submitted", key: "submitted", color: "blue" },
  { sw: "Inasubiri", en: "Pending", key: "pending", color: "yellow" },
  { sw: "Inakaguliwa", en: "Under Review", key: "under_review", color: "yellow" },
  { sw: "Imeidhinishwa", en: "Approved", key: "approved", color: "green" },
  { sw: "Imekataliwa", en: "Rejected", key: "rejected", color: "red" },
  { sw: "Imekamilika", en: "Completed", key: "completed", color: "emerald" },
  { sw: "Haijakamilika", en: "Not Completed", key: "not_completed", color: "orange" },
  { sw: "Inahitaji Marekebisho", en: "Needs Correction", key: "needs_correction", color: "purple" },
  { sw: "Imewasilishwa Tena", en: "Resubmitted", key: "resubmitted", color: "blue" },
  { sw: "Imehifadhiwa", en: "Archived", key: "archived", color: "slate" },
];

const EXTRA_STATUS_COLORS = {
  Active: "green",
  Disabled: "red",
  "Pending Approval": "yellow",
  Resigned: "orange",
  Removed: "slate",
  Success: "green",
  Error: "red",
  read: "slate",
  new: "blue",
  Partial: "yellow",
  Reset: "orange",
};

export function resolveFinalStatusColor(text) {
  if (!text) return "slate";
  if (EXTRA_STATUS_COLORS[text]) return EXTRA_STATUS_COLORS[text];
  const hit = FINAL_SUBMISSION_STATUSES.find((s) => s.sw === text || s.en === text || s.key === text);
  return hit?.color || "slate";
}

export const GLOBAL_MODULE_ACTIONS = [
  "Add",
  "Edit",
  "Delete/Archive",
  "View",
  "Search",
  "Filter",
  "Print",
  "Export PDF",
  "Export Excel",
  "Add Category",
  "Add Type",
  "Add Custom Field",
  "Add Custom Section",
];
