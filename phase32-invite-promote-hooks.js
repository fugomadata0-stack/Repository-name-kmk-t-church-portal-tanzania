/** Phase 32 — constants (Kiswahili labels in UI, English in enums where helpful) */

export const MAX_SUPER_ADMIN_SLOTS = 4;

export const workflowStatuses = [
  { key: "draft", sw: "Rasimu", en: "Draft", color: "gray" },
  { key: "sent", sw: "Imetumwa", en: "Sent", color: "blue" },
  { key: "opened", sw: "Imepokelewa", en: "Opened", color: "purple" },
  { key: "accepted", sw: "Imekubaliwa", en: "Accepted", color: "green" },
  { key: "pending", sw: "Inasubiri", en: "Pending", color: "yellow" },
  { key: "under_review", sw: "Inakaguliwa", en: "Under Review", color: "purple" },
  { key: "approved", sw: "Imeidhinishwa", en: "Approved", color: "green" },
  { key: "rejected", sw: "Imekataliwa", en: "Rejected", color: "red" },
  { key: "completed", sw: "Imekamilika", en: "Completed", color: "emerald" },
  { key: "archived", sw: "Imehifadhiwa", en: "Archived", color: "slate" },
  { key: "expired", sw: "Imeisha Muda", en: "Expired", color: "orange" },
  { key: "cancelled", sw: "Imeghairiwa", en: "Cancelled", color: "slate" },
];

export const inviteTypes = [
  "Standard Invite",
  "Elevated Role Invite",
  "Super Admin Invite",
  "Temporary Invite",
  "Replacement Invite",
  "Emergency Access Invite",
];

export const assignableRoles = [
  "National Admin",
  "Office Admin",
  "Diocese Admin",
  "Jimbo Admin",
  "Branch Admin",
  "Diocese Data Officer",
  "Jimbo Data Officer",
  "Branch Data Officer",
  "Finance Officer",
  "Media Admin",
  "Viewer",
];

export const assignLevels = ["National / KMT", "Dayosisi", "Jimbo", "Tawi / Branch", "Module"];

export const permissionLayersList = [
  "Approver",
  "Reviewer",
  "Finance Access",
  "Reports Export Access",
  "Confidential Data Access",
  "Events Approval Access",
  "Publications Approval Access",
  "Document Approval Access",
  "Audit Viewer",
  "Temporary Emergency Access",
];

export const tableActions = ["View", "Edit", "Approve", "Reject", "Cancel", "Expire", "Archive", "Export", "Print"];
