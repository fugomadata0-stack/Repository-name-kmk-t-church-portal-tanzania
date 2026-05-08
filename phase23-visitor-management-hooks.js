export const miniModules = [
  "Wageni Wapya",
  "Guest Registration",
  "Follow-up Calls",
  "First-Time Visitors",
  "Repeat Visitors",
  "Conversion to Member",
  "Visitor Notes",
  "Visitor Reports",
  "SMS Welcome",
  "Outreach Follow-up",
];

export const visitorSources = ["Friend", "Online", "Event", "Outreach", "Other"];
export const visitorStatuses = ["New", "Follow-up Pending", "Welcomed", "Converted", "Inactive"];
export const followupStatuses = ["Pending", "In Progress", "Completed", "Rescheduled"];

export const roleAccessVisitor = {
  super_admin: { add: true, edit: true, delete: true, convert: true, sms: true, export: true },
  admin: { add: true, edit: true, delete: true, convert: true, sms: true, export: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, convert: true, sms: true, export: true },
  mchungaji: { add: true, edit: true, delete: false, convert: true, sms: true, export: true },
  kiongozi_tawi: { add: true, edit: true, delete: false, convert: false, sms: true, export: false },
  member: { add: false, edit: false, delete: false, convert: false, sms: false, export: false },
};

export const kpiDefs = [
  ["Wageni Leo", "royal"],
  ["Wageni Wiki Hii", "teal"],
  ["First-Time Visitors", "amber"],
  ["Repeat Visitors", "violet"],
  ["Follow-ups Pending", "rose"],
  ["Converted to Members", "emerald"],
  ["SMS Welcome Sent", "indigo"],
  ["Visitor Growth", "slate"],
];

// Supabase-ready targets:
// visitors, visitor_followups, visitor_notes,
// visitor_sms_logs, visitor_conversion_logs, activity_logs
