import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const useSupabase = () => !!getSafeSupabase();

const state = {
  documents: [
    { id: 1, document_id: "DOC-001", title: "Barua ya Wito wa Mkutano", type: "Official Letter", module: "Leadership", owner: "Office Admin", current_stage: "Draft", status: "Draft", updated_at: now(), expiry_date: "" },
    { id: 2, document_id: "DOC-002", title: "Tangazo la Kongamano la Dayosisi", type: "Circular", module: "Events", owner: "Dayosisi Admin", current_stage: "Approval", status: "Pending Approval", updated_at: now(), expiry_date: "2026-12-31" },
    { id: 3, document_id: "DOC-003", title: "Mwongozo wa Matumizi ya Fedha", type: "Policy", module: "Finance", owner: "Finance Officer", current_stage: "Published", status: "Approved", updated_at: now(), expiry_date: "2027-06-30" },
  ],
  templates: [
    { id: 1, template_name: "Template ya Barua Rasmi", type: "Official Letter", version: "v1.2", status: "Active" },
    { id: 2, template_name: "Template ya Circular", type: "Circular", version: "v1.0", status: "Active" },
  ],
  approvals: [
    { id: 1, request_id: "APR-1001", document: "Tangazo la Kongamano la Dayosisi", submitted_by: "Dayosisi Admin", current_reviewer: "Office Admin", approval_stage: "Stage 2 - Office Admin", deadline: "2026-05-10", status: "In Review" },
    { id: 2, request_id: "APR-1002", document: "Mwongozo wa Matumizi ya Fedha", submitted_by: "Finance Officer", current_reviewer: "Super Admin", approval_stage: "Stage 3 - Super Admin", deadline: "2026-05-15", status: "Pending" },
  ],
  versions: [
    { id: 1, document: "Mwongozo wa Matumizi ya Fedha", version: "v2.1", changed_by: "Finance Officer", changed_at: "2026-04-20", notes: "Budget controls updated" },
    { id: 2, document: "Template ya Circular", version: "v1.0", changed_by: "Office Admin", changed_at: "2026-04-18", notes: "Initial release" },
  ],
};

const tables = {
  documents: "documents",
  templates: "document_templates",
  approvals: "approval_requests",
  approvalSteps: "approval_steps",
  versions: "document_versions",
  archive: "document_archive",
  audit: "document_audit_logs",
};

async function loadFromSupabase() {
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase21_load_docs_workflow",
    async () =>
      Promise.all([
        s.from(tables.documents).select("*").order("id", { ascending: false }),
        s.from(tables.templates).select("*").order("id", { ascending: false }),
        s.from(tables.approvals).select("*").order("id", { ascending: false }),
        s.from(tables.versions).select("*").order("id", { ascending: false }),
      ]),
    null
  );
  if (!result) return;
  const [docs, tpl, apr, ver] = result;
  if (!docs.error) state.documents = asArray(docs.data);
  if (!tpl.error) state.templates = asArray(tpl.data);
  if (!apr.error) state.approvals = asArray(apr.data);
  if (!ver.error) state.versions = asArray(ver.data);
}

export async function loadDocsWorkflowData() {
  if (!useSupabase()) return;
  await loadFromSupabase();
}

export const getDocuments = () => [...state.documents];
export const getTemplates = () => [...state.templates];
export const getApprovals = () => [...state.approvals];
export const getVersions = () => [...state.versions];

export function getKpis() {
  const docs = state.documents;
  const draft = docs.filter((d) => String(d.status).toLowerCase().includes("draft")).length;
  const pending = docs.filter((d) => String(d.status).toLowerCase().includes("pending")).length;
  const approved = docs.filter((d) => String(d.status).toLowerCase().includes("approved")).length;
  const rejected = docs.filter((d) => String(d.status).toLowerCase().includes("rejected")).length;
  const archived = docs.filter((d) => String(d.status).toLowerCase().includes("archiv")).length;
  const expiring = docs.filter((d) => d.expiry_date).length;
  const templates = state.templates.length;
  const health = pending <= 2 ? "Healthy" : "Attention";
  return { draft, pending, approved, rejected, archived, expiring, templates, health };
}

async function addAudit(action, payload = {}) {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  await safeAsync("phase21_audit_log", async () => s.from(tables.audit).insert({ action, payload }), null);
}

export async function createDocument() {
  const row = {
    id: Date.now(),
    document_id: `DOC-${String(Date.now()).slice(-5)}`,
    title: "Nyaraka Mpya",
    type: "Official Letter",
    module: "General",
    owner: "Office Admin",
    current_stage: "Draft",
    status: "Draft",
    updated_at: now(),
    expiry_date: "",
  };
  state.documents.unshift(row);
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_create_document", async () => s.from(tables.documents).insert(row), null);
  }
  await addAudit("create_document", row);
}

export async function updateDocumentStatus(id, status, stage = null) {
  const row = state.documents.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = status || row.status;
  row.current_stage = stage || row.current_stage;
  row.updated_at = now();
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase21_update_document",
      async () => s.from(tables.documents).update({ status: row.status, current_stage: row.current_stage, updated_at: new Date().toISOString() }).eq("id", id),
      null
    );
  }
  await addAudit("update_document_status", { id, status: row.status, stage: row.current_stage });
}

export async function deleteDocument(id) {
  state.documents = state.documents.filter((x) => Number(x.id) !== Number(id));
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_delete_document", async () => s.from(tables.documents).delete().eq("id", id), null);
  }
  await addAudit("delete_document", { id });
}

export async function clearDocuments() {
  state.documents = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_clear_documents", async () => s.from(tables.documents).delete().neq("id", -1), null);
  }
  await addAudit("clear_documents", {});
}

export async function clearApprovals() {
  state.approvals = [];
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_clear_approvals", async () => s.from(tables.approvals).delete().neq("id", -1), null);
  }
  await addAudit("clear_approvals", {});
}

export async function approvalAction(id, action) {
  const row = state.approvals.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  if (action === "approve") row.status = "Approved";
  if (action === "reject") row.status = "Rejected";
  if (action === "changes") row.status = "Changes Requested";
  if (action === "reassign") row.status = "Reassigned";
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_approval_action", async () => s.from(tables.approvals).update({ status: row.status }).eq("id", id), null);
  }
  if (useSupabase() && ["approve", "reject", "changes", "reassign"].includes(action)) {
    const s = getSafeSupabase();
    await safeAsync(
      "phase21_approval_step_insert",
      async () =>
        s.from(tables.approvalSteps).insert({
          approval_request_id: id,
          step_action: action,
          status: row.status,
          acted_at: new Date().toISOString(),
        }),
      null
    );
  }
  await addAudit("approval_action", { id, action, status: row.status });
}

export async function archiveDocument(id) {
  const row = state.documents.find((x) => Number(x.id) === Number(id));
  if (!row) return;
  row.status = "Archived";
  row.current_stage = "Archived";
  if (useSupabase()) {
    const s = getSafeSupabase();
    await safeAsync("phase21_archive_document_update", async () => s.from(tables.documents).update({ status: "Archived", current_stage: "Archived" }).eq("id", id), null);
    await safeAsync("phase21_archive_document_insert", async () => s.from(tables.archive).insert({ document_id: id, archived_at: new Date().toISOString() }), null);
  }
  await addAudit("archive_document", { id });
}
