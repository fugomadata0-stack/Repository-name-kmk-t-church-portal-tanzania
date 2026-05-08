export const miniModules = [
  "Ushauri wa Kichungaji",
  "Prayer Requests",
  "Member Follow-up",
  "Welfare Cases",
  "Hospital Visits",
  "Home Visits",
  "Spiritual Notes",
  "Confidential Cases",
  "Follow-up Calendar",
  "Pastoral Reports",
];

export const hudumaTypes = [
  "Ushauri wa Kichungaji",
  "Prayer Requests",
  "Member Follow-up",
  "Welfare Cases",
  "Hospital Visits",
  "Home Visits",
  "Spiritual Notes",
  "Confidential Cases",
];

export const priorityOptions = ["Low", "Normal", "High", "Urgent"];
export const caseStatuses = ["Open", "In Progress", "Pending", "Completed", "Escalated"];

export const roleAccessPastoral = {
  super_admin: { add: true, edit: true, delete: true, assign: true, viewConfidential: true, reports: true },
  admin: { add: true, edit: true, delete: true, assign: true, viewConfidential: true, reports: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, assign: true, viewConfidential: true, reports: true },
  mchungaji: { add: true, edit: true, delete: false, assign: true, viewConfidential: true, reports: true },
  kiongozi_tawi: { add: true, edit: false, delete: false, assign: false, viewConfidential: false, reports: false },
  member: { add: false, edit: false, delete: false, assign: false, viewConfidential: false, reports: false },
};

export const kpiDefs = [
  ["Maombi Mapya", "royal"],
  ["Cases Zinazoendelea", "teal"],
  ["Follow-ups Leo", "amber"],
  ["Ziara za Nyumbani", "violet"],
  ["Ziara za Hospitali", "rose"],
  ["Cases Confidential", "slate"],
  ["Completed Cases", "emerald"],
  ["Pending Reports", "indigo"],
];

// Supabase-ready targets:
// pastoral_cases, prayer_requests, member_followups, pastoral_visits,
// confidential_notes, pastoral_reports, activity_logs
