export const commsRoleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, send: true, schedule: true, export: true },
  admin: { add: true, edit: true, delete: true, clear: true, send: true, schedule: true, export: true },
  media_admin: { add: true, edit: true, delete: false, clear: false, send: true, schedule: true, export: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, send: true, schedule: true, export: true },
  member: { add: false, edit: false, delete: false, clear: false, send: false, schedule: false, export: false },
};

export const notificationFields = [
  { key: "title", label: "Title", required: true },
  { key: "type", label: "Type", options: ["In-App", "SMS", "Email", "Announcement"], required: true },
  { key: "priority", label: "Priority", options: ["High", "Medium", "Low"], required: true },
  { key: "audience", label: "Audience", required: true },
  { key: "scheduled_date", label: "Scheduled Date", type: "date", required: true },
  { key: "status", label: "Status", options: ["draft", "scheduled", "sent", "failed"], required: true },
  { key: "sent_by", label: "Sent By", required: true },
];
