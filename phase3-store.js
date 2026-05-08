const listeners = new Set();

export const moduleSchemas = {
  dayosisi: {
    label: "Usimamizi wa Dayosisi",
    table: "dayosisi",
    fields: [
      { key: "name", label: "Jina la Dayosisi", required: true },
      { key: "region", label: "Mkoa", required: true },
      { key: "leader", label: "Askofu wa Dayosisi", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  majimbo: {
    label: "Usimamizi wa Majimbo",
    table: "majimbo",
    fields: [
      { key: "name", label: "Jina la Jimbo", required: true },
      { key: "region", label: "Mkoa", required: true },
      { key: "dayosisi", label: "Dayosisi", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  matawi: {
    label: "Usimamizi wa Matawi",
    table: "matawi",
    fields: [
      { key: "name", label: "Jina la Tawi", required: true },
      { key: "region", label: "Mahali", required: true },
      { key: "jimbo", label: "Jimbo", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  waumini: {
    label: "Waumini",
    table: "waumini",
    fields: [
      { key: "name", label: "Jina Kamili", required: true },
      { key: "region", label: "Mkoa", required: true },
      { key: "simu", label: "Simu", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  viongozi: {
    label: "Viongozi wa Kanisa",
    table: "viongozi",
    fields: [
      { key: "name", label: "Jina la Kiongozi", required: true },
      { key: "region", label: "Mkoa", required: true },
      { key: "cheo", label: "Cheo", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  mahudhurio: {
    label: "Mahudhurio",
    table: "mahudhurio",
    fields: [
      { key: "name", label: "Ibada/Kikao", required: true },
      { key: "region", label: "Tawi/Jimbo", required: true },
      { key: "idadi", label: "Idadi", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  michango: {
    label: "Fedha & Michango",
    table: "michango",
    fields: [
      { key: "name", label: "Aina ya Mchango", required: true },
      { key: "region", label: "Chanzo", required: true },
      { key: "kiasi", label: "Kiasi", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
  vyanzo_mapato: {
    label: "Vyanzo vya Mapato",
    table: "vyanzo_mapato",
    fields: [
      { key: "name", label: "Jina la Chanzo", required: true },
      { key: "category", label: "Kundi Kuu", required: true },
      { key: "level", label: "Ngazi ya Kanisa", required: true },
      { key: "status", label: "Status", required: true, options: ["active", "inactive"] },
    ],
  },
};

const initialModuleRows = {
  dayosisi: [
    { id: 1, name: "Dayosisi ya Dar es Salaam", region: "Dar es Salaam", leader: "Askofu A. Mwangalizi", status: "active" },
    { id: 2, name: "Dayosisi ya Mwanza", region: "Mwanza", leader: "Askofu J. Simbila", status: "active" },
  ],
  majimbo: [
    { id: 1, name: "Jimbo la Kati", region: "Dodoma", dayosisi: "Dayosisi ya Dodoma", status: "active" },
    { id: 2, name: "Jimbo la Ziwa", region: "Mwanza", dayosisi: "Dayosisi ya Mwanza", status: "active" },
  ],
  matawi: [
    { id: 1, name: "Tawi la Amani", region: "Kinondoni", jimbo: "Jimbo la Mashariki", status: "active" },
    { id: 2, name: "Tawi la Neema", region: "Ilemela", jimbo: "Jimbo la Ziwa", status: "inactive" },
  ],
  waumini: [
    { id: 1, name: "Maria Paulo", region: "Dar es Salaam", simu: "0712340001", status: "active" },
    { id: 2, name: "John Samson", region: "Arusha", simu: "0712340002", status: "active" },
  ],
  viongozi: [
    { id: 1, name: "Mch. Daniel Msangi", region: "Dar es Salaam", cheo: "Mchungaji", status: "active" },
    { id: 2, name: "Askofu Rehema Mtei", region: "Mwanza", cheo: "Askofu Dayosisi", status: "active" },
  ],
  mahudhurio: [
    { id: 1, name: "Ibada ya Jumapili", region: "Tawi la Amani", idadi: "1240", status: "active" },
    { id: 2, name: "Maombi ya Jioni", region: "Tawi la Neema", idadi: "420", status: "active" },
  ],
  michango: [
    { id: 1, name: "Sadaka", region: "Tawi la Amani", kiasi: "5600000", status: "active" },
    { id: 2, name: "Zaka", region: "Jimbo la Kati", kiasi: "9200000", status: "active" },
  ],
  vyanzo_mapato: [
    { id: 1, name: "Sadaka ya Jumapili", category: "Sadaka za Kawaida", level: "Tawi", status: "active" },
    { id: 2, name: "Zaka", category: "Michango ya Wajibu", level: "Jimbo", status: "active" },
    { id: 3, name: "Mchango wa Ujenzi", category: "Matoleo ya Makusudi", level: "Dayosisi", status: "active" },
  ],
};

const state = {
  moduleRows: initialModuleRows,
  selectedModule: "dayosisi",
  selectedRowId: null,
};

export function getState() {
  return state;
}

export function setSelectedModule(moduleKey) {
  state.selectedModule = moduleKey;
  state.selectedRowId = null;
  emit();
}

export function setSelectedRow(id) {
  state.selectedRowId = id;
  emit();
}

export function updateModuleRows(moduleKey, rows) {
  state.moduleRows[moduleKey] = rows;
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((listener) => listener(state));
}
