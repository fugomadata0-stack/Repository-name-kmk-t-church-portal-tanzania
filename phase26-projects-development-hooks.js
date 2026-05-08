export const miniModules = [
  "Church Projects",
  "Construction Projects",
  "School Projects",
  "Outreach Projects",
  "Fundraising Targets",
  "Project Contributions",
  "Project Expenses",
  "Progress Updates",
  "Project Gallery",
  "Project Reports",
];

export const projectCategories = ["Church Projects", "Construction Projects", "School Projects", "Outreach Projects", "Development Plans"];
export const projectStatuses = ["Planning", "Active", "Completed", "Delayed", "On Hold"];

export const roleAccessProjects = {
  super_admin: { add: true, edit: true, delete: true, contribute: true, update: true, export: true },
  admin: { add: true, edit: true, delete: true, contribute: true, update: true, export: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, contribute: true, update: true, export: true },
  mchungaji: { add: true, edit: true, delete: false, contribute: true, update: true, export: true },
  kiongozi_tawi: { add: true, edit: true, delete: false, contribute: true, update: true, export: false },
  member: { add: false, edit: false, delete: false, contribute: true, update: false, export: false },
};

export const kpiDefs = [
  ["Miradi Yote", "royal"],
  ["Miradi Hai", "teal"],
  ["Completed Projects", "emerald"],
  ["Target Amount", "amber"],
  ["Amount Collected", "violet"],
  ["Remaining Balance", "rose"],
  ["Progress Average", "indigo"],
  ["Delayed Projects", "slate"],
];

// Supabase-ready targets:
// projects, project_contributions, project_expenses,
// project_updates, project_gallery, project_reports, activity_logs
