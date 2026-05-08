export const financeRoleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, approve: true, reject: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, approve: true, reject: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, print: true, approve: true, reject: true },
  mchungaji: { add: true, edit: true, delete: false, clear: false, export: true, print: true, approve: false, reject: false },
  finance_officer: { add: true, edit: true, delete: false, clear: false, export: true, print: true, approve: false, reject: false },
  member: { add: false, edit: false, delete: false, clear: false, export: false, print: false, approve: false, reject: false },
};

export const incomeFields = [
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "aina_mapato", label: "Aina ya Mapato", options: ["Sadaka", "Zaka", "Donation", "Project", "Other"], required: true },
  { key: "chanzo", label: "Chanzo", required: true },
  { key: "dayosisi", label: "Dayosisi", required: true },
  { key: "jimbo", label: "Jimbo", required: true },
  { key: "tawi", label: "Tawi", required: true },
  { key: "kiasi", label: "Kiasi", type: "number", required: true },
  { key: "payment_method", label: "Payment Method", required: true },
  { key: "reference_no", label: "Reference Number", required: false },
  { key: "description", label: "Description", textarea: true },
  { key: "attachment", label: "Attachment placeholder", required: false },
  { key: "status", label: "Status", options: ["pending", "approved", "rejected"], required: true },
  { key: "notes", label: "Notes", textarea: true },
];

export const expenseFields = [
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "aina_matumizi", label: "Aina ya Matumizi", required: true },
  { key: "kategoria", label: "Kategoria", required: true },
  { key: "dayosisi", label: "Dayosisi", required: true },
  { key: "jimbo", label: "Jimbo", required: true },
  { key: "tawi", label: "Tawi", required: true },
  { key: "kiasi", label: "Kiasi", type: "number", required: true },
  { key: "approved_by", label: "Approved By", required: false },
  { key: "status", label: "Status", options: ["pending", "approved", "rejected"], required: true },
  { key: "notes", label: "Notes", textarea: true },
];
