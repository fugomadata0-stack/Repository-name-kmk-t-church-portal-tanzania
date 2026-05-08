export const attendanceRoleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true, mark: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true, mark: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true, mark: true },
  mchungaji: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true, mark: true },
  kiongozi_idara: { add: true, edit: true, delete: false, clear: false, export: false, print: true, view: true, mark: true },
  member: { add: false, edit: false, delete: false, clear: false, export: false, print: false, view: true, mark: false },
};

export const serviceFields = [
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "aina_ibada", label: "Aina ya Ibada", required: true },
  { key: "dayosisi", label: "Chagua Dayosisi", required: true },
  { key: "jimbo", label: "Chagua Jimbo", required: true },
  { key: "tawi", label: "Chagua Tawi", required: true },
  { key: "msimamizi", label: "Msimamizi", required: true },
  { key: "washiriki", label: "Orodha ya Washiriki", textarea: true },
  { key: "notes", label: "Notes", textarea: true },
  { key: "status", label: "Status", options: ["recorded", "pending", "closed"], required: true },
];

export const genericAttendanceFields = [
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "aina", label: "Aina", required: true },
  { key: "item", label: "Kikao/Tukio/Kambi", required: true },
  { key: "eneo", label: "Eneo", required: true },
  { key: "participants", label: "Idadi ya Washiriki", type: "number", required: true },
  { key: "present", label: "Present", type: "number", required: true },
  { key: "absent", label: "Absent", type: "number", required: true },
  { key: "rate", label: "Rate", required: true },
  { key: "status", label: "Status", options: ["recorded", "pending", "closed"], required: true },
];
