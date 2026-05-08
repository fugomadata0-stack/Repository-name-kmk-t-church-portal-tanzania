export const miniModules = [
  "National Events",
  "Dayosisi Events",
  "Jimbo Events",
  "Tawi Events",
  "Camps Calendar",
  "Trainings Calendar",
  "Finance Deadlines",
  "Meeting Schedule",
  "Conflict Detection",
  "Calendar Sync Placeholder",
];

export const eventTypes = ["National Event", "Dayosisi Event", "Jimbo Event", "Tawi Event", "Camp", "Training", "Meeting", "Finance Deadline", "Service"];
export const eventScopes = ["National", "Dayosisi", "Jimbo", "Tawi"];
export const eventStatuses = ["Scheduled", "In Progress", "Completed", "Pending", "Cancelled"];
export const calendarViews = ["Month View", "Week View", "Day View", "List View"];

export const roleAccessCalendar = {
  super_admin: { add: true, edit: true, delete: true, detectConflict: true, export: true, sync: true },
  admin: { add: true, edit: true, delete: true, detectConflict: true, export: true, sync: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, detectConflict: true, export: true, sync: true },
  mchungaji: { add: true, edit: true, delete: false, detectConflict: true, export: true, sync: false },
  kiongozi_tawi: { add: true, edit: true, delete: false, detectConflict: false, export: false, sync: false },
  member: { add: false, edit: false, delete: false, detectConflict: false, export: false, sync: false },
};

export const kpiDefs = [
  ["Events This Month", "royal"],
  ["Camps Upcoming", "teal"],
  ["Meetings Scheduled", "amber"],
  ["Conflicts Detected", "rose"],
  ["Trainings Upcoming", "violet"],
  ["Deadlines Pending", "indigo"],
  ["Synced Dayosisi", "emerald"],
  ["Calendar Health", "slate"],
];

// Supabase-ready targets:
// national_calendar, calendar_events, calendar_conflicts,
// calendar_sync_logs, calendar_reminders, activity_logs
