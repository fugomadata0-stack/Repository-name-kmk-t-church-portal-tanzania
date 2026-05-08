export const MAX_SUPER_ADMIN_SLOTS = 4;
export const DEFAULT_UNIT_SLOTS = 3;

export const submissionStatuses = [
  { key: "not_submitted", sw: "Haijawasilishwa", en: "Not Submitted", color: "slate" },
  { key: "draft", sw: "Rasimu", en: "Draft", color: "gray" },
  { key: "submitted", sw: "Imewasilishwa", en: "Submitted", color: "blue" },
  { key: "pending", sw: "Inasubiri", en: "Pending", color: "yellow" },
  { key: "under_review", sw: "Inakaguliwa", en: "Under Review", color: "yellow" },
  { key: "approved", sw: "Imeidhinishwa", en: "Approved", color: "green" },
  { key: "rejected", sw: "Imekataliwa", en: "Rejected", color: "red" },
  { key: "completed", sw: "Imekamilika", en: "Completed", color: "emerald" },
  { key: "not_completed", sw: "Haijakamilika", en: "Not Completed", color: "orange" },
  { key: "needs_correction", sw: "Inahitaji Marekebisho", en: "Needs Correction", color: "purple" },
  { key: "resubmitted", sw: "Imewasilishwa Tena", en: "Resubmitted", color: "blue" },
  { key: "archived", sw: "Imehifadhiwa", en: "Archived", color: "slate" },
];

export const levelOptions = [
  "National / KMT",
  "Dayosisi",
  "Jimbo",
  "Tawi / Parokia / Kituo",
  "Idara",
  "Jumuiya",
  "Kwaya",
  "Taasisi",
  "Events / Makambi",
  "Publications / Documents",
];

export const roleOptions = [
  "Data Officer / Mjaza Taarifa",
  "Viewer / Mtazamaji",
  "Editor / Mhariri",
  "Approver / Mthibitishaji",
  "Reporter / Mtoa Ripoti",
  "Local Admin / Admin wa Eneo",
];

export const permissionMatrixColumns = [
  "View",
  "Add",
  "Edit",
  "Delete",
  "Submit",
  "Approve",
  "Reject",
  "Export",
  "Print",
  "Manage Users",
  "Manage Settings",
  "Access Confidential Data",
];

export const permissionRoles = [
  "Chief Admin",
  "Super Admin",
  "National Admin",
  "Dayosisi Data Officer",
  "Jimbo Data Officer",
  "Branch Data Officer",
  "Department Officer",
  "Jumuiya Officer",
  "Choir Officer",
  "Institution Officer",
  "Viewer",
];

export const superAdminActions = ["View", "Edit", "Disable", "Remove", "Replace", "Audit Log"];
