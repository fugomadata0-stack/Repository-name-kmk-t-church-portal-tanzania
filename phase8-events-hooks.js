export const eventCampRoleAccess = {
  super_admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true, reminder: true },
  admin: { add: true, edit: true, delete: true, clear: true, export: true, print: true, view: true, reminder: true },
  askofu_dayosisi: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true, reminder: true },
  mchungaji: { add: true, edit: true, delete: false, clear: false, export: true, print: true, view: true, reminder: true },
  kiongozi_idara: { add: true, edit: true, delete: false, clear: false, export: false, print: true, view: true, reminder: true },
  member: { add: false, edit: false, delete: false, clear: false, export: false, print: false, view: true, reminder: false },
};

export const eventColumns = ["id", "jina", "aina", "dayosisi", "jimbo", "tawi", "tarehe", "muda", "mahali", "msimamizi", "status", "actions"];
export const campColumns = ["id", "jina", "theme", "andiko", "dayosisi", "jimbo", "mahali", "kuanza", "mwisho", "mhubiri", "mfundishaji", "washiriki", "budget", "status", "actions"];

export const eventFormFields = [
  { key: "jina", label: "Jina la Tukio", required: true },
  { key: "aina", label: "Aina ya Tukio", required: true },
  { key: "dayosisi", label: "Chagua Dayosisi", required: true },
  { key: "jimbo", label: "Chagua Jimbo", required: true },
  { key: "tawi", label: "Chagua Tawi", required: true },
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "muda_kuanza", label: "Muda wa Kuanza", type: "time", required: true },
  { key: "muda_kumaliza", label: "Muda wa Kumaliza", type: "time", required: true },
  { key: "mahali", label: "Mahali", required: true },
  { key: "msimamizi", label: "Msimamizi", required: true },
  { key: "maelezo", label: "Maelezo", textarea: true },
  { key: "status", label: "Status", required: true, options: ["planned", "ongoing", "done", "cancelled"] },
  { key: "notes", label: "Notes", textarea: true },
];

export const campFormFields = [
  { key: "jina", label: "Jina la Kambi", required: true },
  { key: "theme", label: "Theme / Kauli Kuu", required: true },
  { key: "andiko", label: "Andiko / Scripture Header", required: true },
  { key: "kusudi", label: "Kusudi la Kambi", textarea: true },
  { key: "dayosisi", label: "Chagua Dayosisi", required: true },
  { key: "jimbo", label: "Chagua Jimbo", required: true },
  { key: "tawi", label: "Chagua Tawi optional", required: false },
  { key: "mahali", label: "Mahali", required: true },
  { key: "kuanza", label: "Tarehe ya Kuanza", type: "date", required: true },
  { key: "mwisho", label: "Tarehe ya Mwisho", type: "date", required: true },
  { key: "mhubiri", label: "Mhubiri Mkuu", required: true },
  { key: "mfundishaji", label: "Mfundishaji Mkuu", required: true },
  { key: "organizer", label: "Organizer", required: true },
  { key: "target", label: "Target Participants", required: false },
  { key: "budget", label: "Budget", type: "number", required: false },
  { key: "maelezo", label: "Maelezo", textarea: true },
  { key: "status", label: "Status", required: true, options: ["planned", "active", "closed", "cancelled"] },
  { key: "notes", label: "Notes", textarea: true },
];
