import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import { kpiDefs } from "./phase21-docs-workflow-hooks.js";
import {
  approvalAction,
  archiveDocument,
  clearApprovals,
  clearDocuments,
  createDocument,
  deleteDocument,
  getApprovals,
  getDocuments,
  getKpis,
  getTemplates,
  getVersions,
  loadDocsWorkflowData,
  updateDocumentStatus,
} from "./phase21-docs-workflow-services.js";

const el = (id) => document.getElementById(id);
const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2500);
};

const badge = (text) => `<span class="status ${resolveFinalStatusColor(text)}">${text}</span>`;

function renderKpis() {
  const k = getKpis();
  const values = [k.draft, k.pending, k.approved, k.rejected, k.archived, k.expiring, k.templates, k.health];
  el("kpiGrid").innerHTML = kpiDefs.map(([label, color], i) => `<article class="kpi ${color}"><h4>${label}</h4><p>${values[i]}</p></article>`).join("");
}

function renderDocuments() {
  const rows = getDocuments();
  el("documentsBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.document_id || r.id}</td><td>${r.title || "-"}</td><td>${r.type || "-"}</td><td>${r.module || "-"}</td><td>${r.owner || "-"}</td><td>${badge(r.current_stage || "-")}</td><td>${badge(r.status || "-")}</td><td>${r.updated_at || "-"}</td><td>${r.expiry_date || "-"}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewDoc" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editDoc" data-id="${r.id}">Edit</button>
        <button class="btn tiny" data-action="submitDoc" data-id="${r.id}">Submit for Approval</button>
        <button class="btn tiny" data-action="approveDoc" data-id="${r.id}">Approve</button>
        <button class="btn tiny" data-action="rejectDoc" data-id="${r.id}">Reject</button>
        <button class="btn tiny" data-action="archiveDoc" data-id="${r.id}">Archive</button>
        <button class="btn tiny" data-action="printDoc" data-id="${r.id}">Print</button>
        <button class="btn tiny" data-action="exportPdf" data-id="${r.id}">Export PDF</button>
        <button class="btn tiny" data-action="deleteDoc" data-id="${r.id}">Delete</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="10"><div class="empty">Hakuna nyaraka kwa sasa.</div></td></tr>`;
}

function renderApprovals() {
  const rows = getApprovals();
  el("approvalBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.request_id || r.id}</td><td>${r.document || "-"}</td><td>${r.submitted_by || "-"}</td><td>${r.current_reviewer || "-"}</td><td>${r.approval_stage || "-"}</td><td>${r.deadline || "-"}</td><td>${badge(r.status || "-")}</td>
      <td class="actions">
        <button class="btn tiny" data-action="viewApproval" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="approveReq" data-id="${r.id}">Approve</button>
        <button class="btn tiny" data-action="rejectReq" data-id="${r.id}">Reject</button>
        <button class="btn tiny" data-action="changesReq" data-id="${r.id}">Request Changes</button>
        <button class="btn tiny" data-action="reassignReq" data-id="${r.id}">Reassign</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="8"><div class="empty">Hakuna approval requests.</div></td></tr>`;
}

function renderTemplates() {
  el("templatesBody").innerHTML = getTemplates()
    .map((r) => `<tr><td>${r.template_name || r.name || "-"}</td><td>${r.type || "-"}</td><td>${r.version || "-"}</td><td>${badge(r.status || "-")}</td></tr>`)
    .join("");
}

function renderVersions() {
  el("versionsBody").innerHTML = getVersions()
    .map((r) => `<tr><td>${r.document || r.document_name || "-"}</td><td>${r.version || "-"}</td><td>${r.changed_by || "-"}</td><td>${r.changed_at || "-"}</td><td>${r.notes || "-"}</td></tr>`)
    .join("");
}

function refreshAll() {
  renderKpis();
  renderDocuments();
  renderApprovals();
  renderTemplates();
  renderVersions();
}

function bind() {
  document.body.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    const id = Number(e.target.dataset.id);
    if (!action) return;

    if (action === "createDocument") {
      await createDocument();
      refreshAll();
      toast("Document mpya imeundwa.");
    }
    if (action === "clearDocuments") {
      await clearDocuments();
      refreshAll();
      toast("Documents zimefutwa.");
    }
    if (action === "clearApprovals") {
      await clearApprovals();
      refreshAll();
      toast("Approvals zimefutwa.");
    }
    if (action === "deleteDoc" && id) {
      await deleteDocument(id);
      refreshAll();
      toast("Document imefutwa.");
    }
    if (action === "submitDoc" && id) {
      await updateDocumentStatus(id, "Pending Approval", "Approval");
      refreshAll();
      toast("Document imetumwa approval.");
    }
    if (action === "approveDoc" && id) {
      await updateDocumentStatus(id, "Approved", "Published");
      refreshAll();
      toast("Document imeidhinishwa.");
    }
    if (action === "rejectDoc" && id) {
      await updateDocumentStatus(id, "Rejected", "Review");
      refreshAll();
      toast("Document imekataliwa.");
    }
    if (action === "archiveDoc" && id) {
      await archiveDocument(id);
      refreshAll();
      toast("Document imehifadhiwa archive.");
    }

    if (action === "approveReq" && id) {
      await approvalAction(id, "approve");
      refreshAll();
      toast("Approval request imeidhinishwa.");
    }
    if (action === "rejectReq" && id) {
      await approvalAction(id, "reject");
      refreshAll();
      toast("Approval request imekataliwa.");
    }
    if (action === "changesReq" && id) {
      await approvalAction(id, "changes");
      refreshAll();
      toast("Marekebisho yameombwa.");
    }
    if (action === "reassignReq" && id) {
      await approvalAction(id, "reassign");
      refreshAll();
      toast("Request imepewa reviewer mwingine.");
    }

    if (["viewDoc", "editDoc", "printDoc", "viewApproval", "exportPdf", "exportApprovals"].includes(action)) {
      if (action === "printDoc") window.print();
      else toast(`${action} action iko tayari.`);
    }
  });
}

async function init() {
  installGlobalCrashGuards("phase21_docs_workflow");
  try {
    await loadDocsWorkflowData();
  } catch (_) {
    toast("Supabase load imekwama, inaendelea na local data.");
  }
  bind();
  refreshAll();
}

init();
