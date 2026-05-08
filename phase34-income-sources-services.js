import { incomeSourceCategories, incomeSourceFrequencies } from "./phase34-income-sources-hooks.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const nextId = () => Date.now() + Math.floor(Math.random() * 9000);

const state = {
  rows: [
    {
      id: nextId(),
      kategoria: "Sadaka za Kawaida",
      chanzo_cha_mapato: "IBADA YA JUMAPILI",
      ngazi: "Dayosisi",
      dayosisi: "DAR ES SALAAM",
      jimbo: "KATI",
      tawi: "AMANI",
      kiasi_kinachotarajiwa: 5000000,
      kiasi_kilichopokelewa: 3200000,
      frequency: "Monthly",
      status: "In Progress",
      last_updated: now(),
    },
  ],
};

export function getIncomeSources() {
  return [...state.rows];
}

export function getIncomeSourcesMeta() {
  return { categories: [...incomeSourceCategories], frequencies: [...incomeSourceFrequencies] };
}

export async function saveIncomeSource(payload, editId = null) {
  if (editId) {
    state.rows = state.rows.map((r) => (r.id === editId ? { ...r, ...payload, last_updated: now() } : r));
    return;
  }
  state.rows.unshift({
    id: nextId(),
    ...payload,
    last_updated: now(),
  });
}

export async function deleteIncomeSource(id) {
  state.rows = state.rows.filter((r) => r.id !== id);
}
