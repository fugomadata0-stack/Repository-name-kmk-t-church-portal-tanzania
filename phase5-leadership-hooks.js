export const leaderModuleTabs = [
  "Dashibodi ya Viongozi wa Kanisa",
  "Viongozi wa Ngazi Kuu",
  "Viongozi wa Dayosisi",
  "Maaskofu",
  "Wachungaji",
  "Wainjilisti",
  "Wazee wa Kanisa",
  "Mashemasi",
  "Waongozi wa Matawi / Wasimamizi",
  "Nafasi Zilizo Wazi",
  "Historia ya Viongozi",
  "Uhamisho / Assignments",
  "Ripoti za Viongozi",
];

export const leaderColumns = [
  "id", "full_name", "role_name", "leader_type", "leadership_level", "dayosisi", "jimbo", "branch", "phone", "email", "service_start_date", "years_of_service", "status", "approval_status", "visibility", "actions",
];

export const nationalDefaultRoles = [
  "Askofu Mkuu",
  "Makamu wa Askofu Mkuu",
  "Katibu Mkuu",
  "Naibu Katibu Mkuu",
  "Muhasibu wa Kanisa",
  "Mweka Hazina",
  "Mkaguzi wa Hesabu",
  "Mkurugenzi wa Utawala na Mipango",
  "Mkurugenzi wa Elimu na Mafunzo",
  "Mkurugenzi wa Uinjilisti na Mission",
  "Mkurugenzi wa Vijana na Makundi ya Huduma",
  "Mkurugenzi wa Wanawake na Familia",
  "Mkurugenzi wa Miradi na Maendeleo",
  "Mkurugenzi wa Mawasiliano na Teknolojia",
];

export const leaderStatusOptions = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_correction",
  "locked",
  "active",
  "acting_kaimu",
  "assistant_msaidizi",
  "interim",
  "vacant",
  "pending_verification",
  "archived",
];

export const approvalStatusOptions = [
  "pending",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_correction",
  "locked",
];

export const leaderTypeOptions = [
  "NGAZI_KUU",
  "DAYOSISI",
  "ASKOFU",
  "MCHUNGAJI",
  "MWINJILISTI",
  "MZEE",
  "SHEMASI",
  "KIONGOZI_TAWI",
];

export const leaderFieldConfig = [
  { key: "first_name", label: "First Name", required: true },
  { key: "middle_name", label: "Middle Name", required: false },
  { key: "last_name", label: "Last Name", required: true },
  { key: "full_name", label: "Full Name (auto)", required: false, readOnly: true },
  { key: "gender", label: "Gender / Jinsia", required: true, options: ["Mwanaume", "Mwanamke"] },
  { key: "dob", label: "DOB", required: true, type: "date" },
  { key: "age", label: "Age (auto)", required: false, readOnly: true },
  { key: "marital_status", label: "Marital Status", required: false, options: ["Single", "Married", "Divorced", "Widowed"] },
  { key: "phone", label: "Phone", required: true },
  { key: "whatsapp", label: "WhatsApp", required: false },
  { key: "email", label: "Email", required: true },
  { key: "home_address", label: "Home Address", required: false },
  { key: "current_address", label: "Current Address", required: false },
  { key: "education_level", label: "Education Level", required: false },
  { key: "theology_training", label: "Theology Training", required: false },
  { key: "leadership_level", label: "Leadership Level", required: true, options: ["Ngazi Kuu", "Dayosisi", "Jimbo", "Tawi / Kituo"] },
  { key: "leader_type", label: "Aina ya Kiongozi", required: true, options: leaderTypeOptions },
  { key: "role_name", label: "Role / Position", required: true },
  { key: "category", label: "Category", required: false },
  { key: "type", label: "Type", required: false },
  { key: "dayosisi", label: "Dayosisi", required: false },
  { key: "jimbo", label: "Jimbo", required: false },
  { key: "branch", label: "Branch", required: false },
  { key: "service_start_date", label: "Service Start Date", required: true, type: "date" },
  { key: "years_of_service", label: "Years of Service (auto)", required: false, readOnly: true },
  { key: "appointment_date", label: "Appointment Date", required: false, type: "date" },
  { key: "term_duration", label: "Term Duration", required: false },
  { key: "end_of_term", label: "End of Term", required: false, type: "date" },
  { key: "profile_photo", label: "Profile Photo", required: false },
  { key: "signature", label: "Signature", required: false },
  { key: "short_bio", label: "Short Bio", required: false, textarea: true },
  { key: "vision_statement", label: "Vision Statement", required: false, textarea: true },
  { key: "emergency_contact", label: "Emergency Contact", required: false },
  { key: "nida", label: "NIDA (Restricted)", required: false },
  { key: "confidential_notes", label: "Confidential Notes", required: false, textarea: true },
  { key: "visibility", label: "Visibility", required: true, options: ["Public", "Internal Office", "Confidential Executive"] },
  { key: "status", label: "Status", required: true, options: leaderStatusOptions },
  { key: "approval_status", label: "Approval Status", required: true, options: approvalStatusOptions },
];

export const roleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, upload: true, approve: true, reject: true, submit: true, archive: true, restore: true, view: true },
  chief_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, upload: true, approve: true, reject: true, submit: true, archive: true, restore: true, view: true },
  national_admin: { add: true, edit: true, delete: false, clear: false, export: true, print: true, upload: true, approve: true, reject: true, submit: true, archive: true, restore: true, view: true },
  dayosisi_admin: { add: true, edit: true, delete: false, clear: false, export: true, print: true, upload: true, approve: false, reject: false, submit: true, archive: true, restore: true, view: true },
  jimbo_admin: { add: true, edit: true, delete: false, clear: false, export: true, print: true, upload: false, approve: false, reject: false, submit: true, archive: true, restore: true, view: true },
  tawi_admin: { add: true, edit: true, delete: false, clear: false, export: true, print: true, upload: false, approve: false, reject: false, submit: true, archive: false, restore: false, view: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, upload: true, approve: true, reject: true, submit: true, archive: true, restore: true, view: true },
  askofu_mkuu: { add: false, edit: true, delete: false, clear: false, export: true, print: true, upload: true, approve: true, reject: true, submit: true, archive: false, restore: false, view: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, print: true, upload: true, approve: false, reject: false, submit: true, archive: false, restore: false, view: true },
  viewer: { add: false, edit: false, delete: false, clear: false, export: false, print: true, upload: false, approve: false, reject: false, submit: false, archive: false, restore: false, view: true },
  mchungaji: { add: false, edit: false, delete: false, clear: false, export: false, print: true, upload: false, approve: false, reject: false, submit: false, archive: false, restore: false, view: true },
  member: { add: false, edit: false, delete: false, clear: false, export: false, print: false, upload: false, view: true },
};

// Future Supabase hooks/services naming:
// useLeadersService, useLeaderAssignmentsService, useLeaderDocumentsService, useLeadershipHistoryService, useActivityLogsService
