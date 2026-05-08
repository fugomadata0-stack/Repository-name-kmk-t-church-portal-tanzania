export const elevatedStatuses = [
  { key: "draft", sw: "Rasimu", en: "Draft", color: "gray" },
  { key: "submitted", sw: "Imewasilishwa", en: "Submitted", color: "blue" },
  { key: "resubmitted", sw: "Imewasilishwa Tena", en: "Resubmitted", color: "blue" },
  { key: "pending", sw: "Inasubiri", en: "Pending", color: "yellow" },
  { key: "under_review", sw: "Inakaguliwa", en: "Under Review", color: "purple" },
  { key: "needs_correction", sw: "Inahitaji Marekebisho", en: "Needs Correction", color: "orange" },
  { key: "approved", sw: "Imeidhinishwa", en: "Approved", color: "green" },
  { key: "rejected", sw: "Imekataliwa", en: "Rejected", color: "red" },
  { key: "completed", sw: "Imekamilika", en: "Completed", color: "emerald" },
  { key: "archived", sw: "Imehifadhiwa", en: "Archived", color: "slate" },
];

export const requestCategories = {
  elevatedRoles: ["National Admin", "Office Admin", "Diocese Admin", "Jimbo Admin", "Branch Admin"],
  permissionLayers: [
    "Approver",
    "Reviewer",
    "Finance Access",
    "Reports Export Access",
    "Confidential Data Access",
    "Workflow Override",
    "Document Approval Access",
    "Publications Approval Access",
    "Events Approval Access",
  ],
  temporaryActing: ["Acting Admin", "Temporary Reviewer", "Temporary Approver", "Acting Office Access", "Emergency Access"],
};

export const requestedLevels = ["National / KMT", "Dayosisi", "Jimbo", "Tawi / Branch", "Module"];

export const statusActions = ["View", "Review", "Approve", "Reject", "Request Correction", "Mark Completed", "Archive", "Export", "Print"];

export const approvalRoutingDefaults = [
  { requestType: "National Admin", route: "Super Admin OR Chief Admin" },
  { requestType: "Office Admin", route: "Super Admin OR Chief Admin" },
  { requestType: "Approver", route: "Module Owner + Super Admin" },
  { requestType: "Reviewer", route: "Module Owner + Super Admin" },
  { requestType: "Finance Access", route: "Chief Admin preferred, Super Admin fallback" },
  { requestType: "Confidential Data Access", route: "Chief Admin OR Super Admin only" },
  { requestType: "Emergency Access", route: "Chief Admin OR Super Admin only" },
];
