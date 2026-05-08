export const miniModules = [
  "Bible Study Classes",
  "Leadership Training",
  "Discipleship Courses",
  "Seminars",
  "Training Participants",
  "Trainers / Teachers",
  "Training Materials",
  "Certificates Placeholder",
  "Training Calendar",
  "Training Reports",
];

export const trainingCategories = ["Bible Study Classes", "Leadership Training", "Discipleship Courses", "Seminars", "School Management Support"];
export const trainingStatuses = ["Planning", "Active", "Completed", "Upcoming", "Cancelled"];

export const roleAccessTraining = {
  super_admin: { add: true, edit: true, delete: true, register: true, upload: true, export: true },
  admin: { add: true, edit: true, delete: true, register: true, upload: true, export: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, register: true, upload: true, export: true },
  mchungaji: { add: true, edit: true, delete: false, register: true, upload: true, export: true },
  kiongozi_tawi: { add: true, edit: true, delete: false, register: true, upload: true, export: false },
  member: { add: false, edit: false, delete: false, register: true, upload: false, export: false },
};

export const kpiDefs = [
  ["Mafunzo Active", "royal"],
  ["Washiriki", "teal"],
  ["Trainers", "amber"],
  ["Materials", "violet"],
  ["Completed Trainings", "emerald"],
  ["Certificates", "rose"],
  ["Upcoming Seminars", "indigo"],
  ["Reports", "slate"],
];

// Supabase-ready targets:
// trainings, training_participants, trainers, training_materials,
// certificates_placeholder, training_reports, activity_logs
