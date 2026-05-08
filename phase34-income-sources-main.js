import { getIncomeSources, getIncomeSourcesMeta, saveIncomeSource, deleteIncomeSource } from "./phase34-income-sources-services.js";
import { normalizePayloadByFieldMap } from "./utils/input-normalization.js";

const el = (id) => document.getElementById(id);
const badge = (text) => `<span class="badge">${text}</span>`;

function renderMeta() {
  const meta = getIncomeSourcesMeta();
  el("categoryOptions").innerHTML = meta.categories.map((x) => `<option>${x}</option>`).join("");
  el("frequencyOptions").innerHTML = meta.frequencies.map((x) => `<option>${x}</option>`).join("");
}

function renderTable() {
  const rows = getIncomeSources();
  el("incomeSourcesBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.kategoria}</td><td>${r.chanzo_cha_mapato}</td><td>${r.ngazi}</td><td>${r.dayosisi}</td><td>${r.jimbo}</td><td>${r.tawi}</td>
      <td>${Number(r.kiasi_kinachotarajiwa || 0).toLocaleString()}</td><td>${Number(r.kiasi_kilichopokelewa || 0).toLocaleString()}</td><td>${r.frequency}</td><td>${badge(r.status)}</td><td>${r.last_updated}</td>
      <td><button class="btn tiny" data-action="view" data-id="${r.id}">View</button><button class="btn tiny danger" data-action="delete" data-id="${r.id}">Delete</button></td>
    </tr>`
    )
    .join("");
}

async function submitForm() {
  const raw = Object.fromEntries(new FormData(el("incomeSourceForm")).entries());
  const payload = normalizePayloadByFieldMap(raw, {
    maelezo: { preserveCase: true },
  });
  await saveIncomeSource(payload);
  el("incomeSourceForm").reset();
  renderTable();
}

function bind() {
  el("saveIncomeSourceBtn").addEventListener("click", submitForm);
  document.body.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    const id = Number(e.target.dataset.id);
    if (action === "delete" && id) {
      await deleteIncomeSource(id);
      renderTable();
    }
  });
}

function init() {
  renderMeta();
  renderTable();
  bind();
}

init();
