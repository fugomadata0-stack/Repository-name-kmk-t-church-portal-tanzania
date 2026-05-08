export const miniModules = [
  "Volunteer Directory",
  "Service Teams",
  "Duty Rosters",
  "Sunday Service Schedule",
  "Event Volunteers",
  "Camp Volunteers",
  "Choir Schedule",
  "Media Team Schedule",
  "Prayer Team Schedule",
  "Volunteer Reports",
];

export const teamOptions = ["Ushers", "Choir", "Media Team", "Prayer Team", "Event Helpers", "Camp Volunteers"];
export const availabilityOptions = ["Morning", "Afternoon", "Evening", "Weekend", "Flexible"];
export const volunteerStatuses = ["Active", "Pending", "Assigned", "Inactive"];
export const scheduleStatuses = ["Planned", "Assigned", "Done", "Missed", "Cancelled"];
export const hudumaTypes = ["Sunday Service", "Event Service", "Camp Service", "Choir Practice", "Prayer Meeting", "Media Coverage"];

export const roleAccessVolunteer = {
  super_admin: { add: true, edit: true, delete: true, assign: true, export: true, markDone: true },
  admin: { add: true, edit: true, delete: true, assign: true, export: true, markDone: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, assign: true, export: true, markDone: true },
  mchungaji: { add: true, edit: true, delete: false, assign: true, export: true, markDone: true },
  kiongozi_tawi: { add: true, edit: true, delete: false, assign: true, export: false, markDone: true },
  member: { add: false, edit: false, delete: false, assign: false, export: false, markDone: false },
};

export const kpiDefs = [
  ["Volunteers Active", "royal"],
  ["Teams", "teal"],
  ["Duties This Week", "amber"],
  ["Pending Assignments", "violet"],
  ["Completed Duties", "rose"],
  ["Service Teams", "emerald"],
  ["Schedule Conflicts", "indigo"],
  ["Reports Ready", "slate"],
];

// Supabase-ready targets:
// volunteers, service_teams, duty_rosters, service_schedules,
// volunteer_reports, schedule_conflicts, activity_logs
