import { installGlobalCrashGuards } from "./phase-integration-core.js";
import { exportCsv } from "./phase3-services.js";
import {
  addApprovalStage,
  addCustomCategory,
  addCustomJustificationField,
  addCustomType,
  addPermissionLayer,
  assertElevatedAccessPage,
  canReviewElevatedQueue,
  getAdminReviewQueue,
  getApprovalRoutes,
  getApprovedAccess,
  getAuditLogs,
  getCurrentUser,
  getNotifications,
  getProfileSummary,
  getRequestById,
  getRequestCatalog,
  getRequestsByOwner,
  initElevatedAccessData,
  prepareSupportingLetter,
  resubmitRequest,
  resolveSupportingLetterLink,
  runExpiryCheck,
  saveDraft,
  submitRequest,
  updateRequestStatus,
} from "./phase31-elevated-access-services.js";
import { elevatedStatuses, requestedLevels, statusActions } from "./phase31-elevated-access-hooks.js";

const el = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Maandishi ya barua yaliyopakiwa (Storage au localref) — yanaunganishwa na ombi linalowasilishwa */
let pendingLetter = { supportingLetter: "", supportingLetterName: "" };

function resetLetterState() {
  pendingLetter = { supportingLetter: "", supportingLetterName: "" };
  const fi = el("supportingLetterFile");
  if (fi) fi.value = "";
}

function letterButton(r) {
  if (!r.supportingLetter) return "";
  const label = r.supportingLetterName || "Barua";
  return `<button type="button" class="btn tiny" data-letter-open="${r.id}" title=${JSON.stringify(label)}>Barua</button>`;
}

const toast = (message) => {
  const wrap = el("toastWrap");
  if (!wrap) return;
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  wrap.appendChild(node);
  setTimeout(() => node.remove(), 2800);
};

const badge = (status) => {
  const matched = elevatedStatuses.find((x) => x.sw === status);
  const cls = matched?.color || (status === "new" ? "blue" : "slate");
  return `<span class="badge ${cls}">${status}</span>`;
};

function tableHeaderHtml() {
  return `<tr><th>S/N</th><th>Request ID</th><th>Applicant Name</th><th>Current Role</th><th>Requested Role / Permission</th><th>Scope / Unit</th><th>Request Type</th><th>Status</th><th>Submitted Date</th><th>Reviewed By</th><th>Expiry Date</th><th>Actions</th></tr>`;
}

function reviewerLabel(session) {
  return session?.name || session?.email || "Reviewer";
}

function printElevatedReport(title, rowsHtml) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    toast("Browser imezuiya pop-up; ruhusu print window.");
    return;
  }
  w.document.write(`<!DOCTYPE html><html lang="sw"><head><meta charset="UTF-8"/><title>${title}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;padding:16px;color:#111}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;font-size:12px}</style>
    </head><body><h2>${title}</h2>${rowsHtml}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

function exportMyRequestsCsv() {
  const rows = getRequestsByOwner();
  const header =
    "Request ID,Applicant,Current Roles,Requested,Level,Unit,Status,Submitted,Reviewed By,Expiry";
  const lines = rows.map(
    (r) =>
      `${r.id},${csvCell(r.applicantName)},${csvCell(r.currentRoles)},${csvCell(r.requestedRolePermission)},${csvCell(r.requestedLevel)},${csvCell(r.requestedUnit)},${csvCell(r.status)},${csvCell(r.submittedDate)},${csvCell(r.reviewedBy)},${csvCell(r.expiryDate || "")}`
  );
  exportCsv("kmt-elevated-access-my-requests.csv", [header, ...lines]);
  toast("CSV imepakuliwa.");
}

function exportApprovedCsv() {
  const rows = getApprovedAccess();
  const header = "Request ID,Applicant,Role/Permission,Level,Unit,Active,Expiry";
  const lines = rows.map(
    (r) =>
      `${r.requestId},${csvCell(r.applicantName)},${csvCell(r.rolePermission)},${csvCell(r.level)},${csvCell(r.unit)},${r.active ? "Yes" : "No"},${csvCell(r.expiryDate || "")}`
  );
  exportCsv("kmt-elevated-access-active.csv", [header, ...lines]);
  toast("CSV ya ruhusa za juu imepakuliwa.");
}

function csvCell(v) {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function renderProfile() {
  const me = getCurrentUser();
  const p = getProfileSummary();
  el("profilePanel").innerHTML = `
    <h2>User Profile Integration</h2>
    <div class="profile-grid">
      <article class="mini"><b>Current Roles</b><p>${p.currentRoles.join(", ")}</p></article>
      <article class="mini"><b>Permission Layers</b><p>${p.permissionLayers.join(", ")}</p></article>
      <article class="mini"><b>Temporary Accesses</b><p>${p.temporaryAccesses.length}</p></article>
      <article class="mini"><b>Pending Elevated Requests</b><p>${p.pending.length}</p></article>
      <article class="mini"><b>Previous Elevated Requests</b><p>${p.previous.length}</p></article>
      <article class="mini"><b>Approval History Entries</b><p>${p.history.length}</p></article>
    </div>
    <p>${me.full_name} | ${me.current_scope}</p>
  `;
}

function renderStepStatus() {
  el("stepStatus").innerHTML = elevatedStatuses.map((s) => `<span class="step ${s.color}">${s.sw} / ${s.en}</span>`).join("");
}

function bindFormCatalog() {
  const catalog = getRequestCatalog();
  const categoryEl = el("requestCategory");
  const roleEl = el("requestedRolePermission");
  const levelEl = el("requestedLevel");

  const categories = [
    ["Elevated Roles", catalog.categories.elevatedRoles],
    ["Permission Layers", catalog.categories.permissionLayers],
    ["Temporary / Acting Access", catalog.categories.temporaryActing],
    ...catalog.custom.categories.map((c) => [c, catalog.custom.types.length ? catalog.custom.types : ["Custom Request"]]),
  ];
  categoryEl.innerHTML = categories.map(([label]) => `<option>${label}</option>`).join("");
  levelEl.innerHTML = requestedLevels.map((level) => `<option>${level}</option>`).join("");

  const fillRoles = () => {
    const selected = categories.find(([label]) => label === categoryEl.value);
    const opts = selected ? selected[1] : [];
    roleEl.innerHTML = [...opts, ...catalog.custom.permissions].map((v) => `<option>${v}</option>`).join("");
  };
  fillRoles();
  categoryEl.addEventListener("change", fillRoles);
}

function getFormPayload() {
  const form = el("requestForm");
  const data = Object.fromEntries(new FormData(form).entries());
  return {
    ...data,
    supportingLetter: pendingLetter.supportingLetter || "",
    supportingLetterName: pendingLetter.supportingLetterName || "",
    temporary: Boolean(data.startDate || data.endDate),
  };
}

function ensureTerms() {
  if (!el("termsCheck").checked) {
    toast("Tafadhali kubali Terms & responsibility kwanza.");
    return false;
  }
  return true;
}

function renderRoutes() {
  el("routingBody").innerHTML = getApprovalRoutes().map((x) => `<tr><td>${x.requestType}</td><td>${x.route}</td></tr>`).join("");
}

function renderMyRequests(session) {
  const rows = getRequestsByOwner();
  el("tableHead").innerHTML = tableHeaderHtml();
  el("myRequestBody").innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `
      <tr>
      <td>${i + 1}</td><td>${r.id}</td><td>${r.applicantName}</td><td>${r.currentRoles}</td><td>${r.requestedRolePermission}</td>
      <td>${r.requestedLevel} / ${r.requestedUnit || "-"}</td><td>${r.requestType}</td><td>${badge(r.status)}</td><td>${r.submittedDate}</td><td>${r.reviewedBy}</td><td>${r.expiryDate || "-"}</td>
      <td class="actions">
        ${letterButton(r)}
        ${statusActions.map((a) => `<button type="button" class="btn tiny" data-row="${r.id}" data-user-action="${a}">${a}</button>`).join(" ")}
        ${
          r.status === "Inahitaji Marekebisho"
            ? `<button type="button" class="btn tiny gold" data-resubmit="${r.id}">Resubmit</button>`
            : ""
        }
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="12">Hakuna maombi bado.</td></tr>`;
}

function renderAdminQueue() {
  const section = el("adminQueueSection");
  if (!section) return;
  if (!canReviewElevatedQueue()) {
    section.style.display = "none";
    return;
  }
  section.style.display = "";
  const rows = getAdminReviewQueue();
  el("tableHeadAdmin").innerHTML = tableHeaderHtml();
  el("adminQueueBody").innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
      <td>${i + 1}</td><td>${r.id}</td><td>${r.applicantName}</td><td>${r.currentRoles}</td><td>${r.requestedRolePermission}</td>
      <td>${r.requestedLevel} / ${r.requestedUnit || "-"}</td><td>${r.requestType}</td><td>${badge(r.status)}</td><td>${r.submittedDate}</td><td>${r.reviewedBy}</td><td>${r.expiryDate || "-"}</td>
      <td class="actions">
        ${letterButton(r)}
        <button type="button" class="btn tiny" data-admin-action="review" data-id="${r.id}">Review</button>
        <button type="button" class="btn tiny" data-admin-action="approve" data-id="${r.id}">Approve</button>
        <button type="button" class="btn tiny danger" data-admin-action="reject" data-id="${r.id}">Reject</button>
        <button type="button" class="btn tiny" data-admin-action="correction" data-id="${r.id}">Request Correction</button>
        <button type="button" class="btn tiny" data-admin-action="complete" data-id="${r.id}">Mark Completed</button>
        <button type="button" class="btn tiny" data-admin-action="archive" data-id="${r.id}">Archive</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="12">Hakuna maombi kwenye queue ya uthibitisho.</td></tr>`;
}

function renderApproved() {
  const rows = getApprovedAccess();
  el("approvedBody").innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `<tr><td>${i + 1}</td><td>${r.requestId}</td><td>${r.applicantName}</td><td>${r.rolePermission}</td><td>${r.level} / ${r.unit}</td><td>${badge(r.active ? "Imekamilika" : "Imehifadhiwa")}</td><td>${r.expiryDate || "-"}</td><td class="actions">
          <button type="button" class="btn tiny" data-approved-print="${r.requestId}">Print</button>
          <button type="button" class="btn tiny" data-approved-export="${r.requestId}">Export</button>
        </td></tr>`
        )
        .join("")
    : `<tr><td colspan="8">Hakuna ruhusa za juu zilizo active.</td></tr>`;
}

function renderNotifications() {
  const rows = getNotifications();
  el("notificationBody").innerHTML = rows
    .map((n) => `<tr><td>${n.title}</td><td>${n.channel}</td><td>${badge(n.status)}</td><td>${n.at}</td></tr>`)
    .join("");
}

function renderAudit() {
  const rows = getAuditLogs();
  el("auditBody").innerHTML = rows.map((x) => `<tr><td>${x.action}</td><td>${x.actor}</td><td>${x.details}</td><td>${x.at}</td></tr>`).join("");
}

function refreshAll(session) {
  runExpiryCheck();
  renderProfile();
  renderRoutes();
  renderMyRequests(session);
  renderAdminQueue();
  renderApproved();
  renderNotifications();
  renderAudit();
}

async function handleUserRowAction(action, rowId, session) {
  const row = getRequestById(rowId);
  if (!row) return;
  const admin = canReviewElevatedQueue();

  if (action === "View") {
    const lines = [
      `Request ID: ${row.id}`,
      `Applicant: ${row.applicantName}`,
      `Requested: ${row.requestedRolePermission}`,
      `Category: ${row.requestCategory}`,
      `Level / Unit: ${row.requestedLevel} / ${row.requestedUnit || "-"}`,
      `Status: ${row.status}`,
      `Justification: ${row.justification}`,
      `Notes: ${row.notes || "-"}`,
    ];
    toast(lines.join(" | "));
    if (row.supportingLetter) {
      const href = await resolveSupportingLetterLink(row.supportingLetter);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      else toast("Barua haipatikani (Storage/local).");
    }
    return;
  }

  if (action === "Export") {
    exportCsv(`kmt-elevated-request-${rowId}.csv`, [
      "Field,Value",
      ...Object.entries(row).map(([k, v]) => `${csvCell(k)},${csvCell(typeof v === "object" ? JSON.stringify(v) : v)}`),
    ]);
    toast("Row imeexportiwa CSV.");
    return;
  }

  if (action === "Print") {
    const html = `<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>${Object.entries(row)
      .map(([k, v]) => `<tr><td>${k}</td><td>${typeof v === "object" ? JSON.stringify(v) : v}</td></tr>`)
      .join("")}</tbody></table>`;
    printElevatedReport(`Elevated Request ${rowId}`, html);
    return;
  }

  if (["Review", "Approve", "Reject", "Request Correction", "Mark Completed", "Archive"].includes(action)) {
    if (!admin) {
      toast("Hatua hii ni kwa approvers / admins tu.");
      return;
    }
    const who = reviewerLabel(session);
    if (action === "Review") await updateRequestStatus(rowId, "Inakaguliwa", who);
    if (action === "Approve") await updateRequestStatus(rowId, "Imeidhinishwa", who);
    if (action === "Reject") await updateRequestStatus(rowId, "Imekataliwa", who, "Rejected after review.");
    if (action === "Request Correction") await updateRequestStatus(rowId, "Inahitaji Marekebisho", who, "Tafadhali rekebisha maelezo.");
    if (action === "Mark Completed") await updateRequestStatus(rowId, "Imekamilika", who);
    if (action === "Archive") await updateRequestStatus(rowId, "Imehifadhiwa", who);
  }
}

function bindEvents(session) {
  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (action === "saveDraft") {
      if (!ensureTerms()) return;
      await saveDraft(getFormPayload());
      resetLetterState();
      toast("Draft imehifadhiwa.");
      refreshAll(session);
    }
    if (action === "submitRequest") {
      if (!ensureTerms()) return;
      await submitRequest(getFormPayload());
      resetLetterState();
      toast("Request imewasilishwa kwa workflow.");
      refreshAll(session);
    }
    if (action === "exportMyRequests") {
      exportMyRequestsCsv();
    }
    if (action === "exportApprovedTable") {
      exportApprovedCsv();
    }
    if (action === "preview") {
      const p = getFormPayload();
      const body = el("previewBody");
      const modal = el("previewModal");
      if (body && modal) {
        const letterNote = pendingLetter.supportingLetterName
          ? `Ndiyo — ${pendingLetter.supportingLetterName} (tayari kupakiwa)`
          : "Hapana (bado hakuna faili iliyopakiwa kwa mafanikio)";
        body.innerHTML = `
          <dl>
            <dt>Jina kamili</dt><dd>${escapeHtml(p.applicantName)}</dd>
            <dt>Email</dt><dd>${escapeHtml(p.email)}</dd>
            <dt>Simu</dt><dd>${escapeHtml(p.phone)}</dd>
            <dt>Roles za sasa</dt><dd>${escapeHtml(p.currentRoles)}</dd>
            <dt>Scope</dt><dd>${escapeHtml(p.currentScope)}</dd>
            <dt>Aina ya ombi</dt><dd>${escapeHtml(p.requestCategory)}</dd>
            <dt>Ruhusa inayoombwa</dt><dd>${escapeHtml(p.requestedRolePermission)}</dd>
            <dt>Ngazi / Level</dt><dd>${escapeHtml(p.requestedLevel)}</dd>
            <dt>Kitengo / Unit</dt><dd>${escapeHtml(p.requestedUnit || "—")}</dd>
            <dt>Sababu</dt><dd>${escapeHtml(p.justification || "—")}</dd>
            <dt>Tarehe (muda mfupi)</dt><dd>${escapeHtml(p.startDate || "—")} → ${escapeHtml(p.endDate || "—")}</dd>
            <dt>Maelezo ya ziada</dt><dd>${escapeHtml(p.notes || "—")}</dd>
            <dt>Barua ya kuunga mkono</dt><dd>${escapeHtml(letterNote)}</dd>
          </dl>`;
        modal.removeAttribute("hidden");
      } else {
        toast(`Preview: ${p.requestCategory} → ${p.requestedRolePermission} (${p.requestedLevel})`);
      }
    }
    if (action === "closePreview") {
      const modal = el("previewModal");
      if (modal) modal.setAttribute("hidden", "");
    }
    if (action === "cancelForm") {
      el("requestForm").reset();
      el("termsCheck").checked = false;
      resetLetterState();
      toast("Form imefutwa.");
    }

    if (action === "addApprovalStage") {
      const type = prompt("Request Type");
      const role = prompt("Approver Role");
      addApprovalStage(type || "", role || "", "");
      refreshAll(session);
    }
    if (action === "addApproverRole") {
      const role = prompt("Approver Role");
      addApprovalStage("Custom", role || "", "");
      refreshAll(session);
    }
    if (action === "addModuleRoute") {
      const type = prompt("Request Type");
      const role = prompt("Approver Role");
      const moduleName = prompt("Module-specific route");
      addApprovalStage(type || "", role || "", moduleName || "");
      refreshAll(session);
    }

    const resubmitId = target.dataset.resubmit;
    if (resubmitId) {
      if (!ensureTerms()) return;
      await resubmitRequest(resubmitId, getFormPayload());
      resetLetterState();
      toast("Ombi limewasilishwa tena.");
      refreshAll(session);
    }

    const letterRowId = target.dataset.letterOpen;
    if (letterRowId) {
      const row = getRequestById(letterRowId);
      if (row?.supportingLetter) {
        const href = await resolveSupportingLetterLink(row.supportingLetter);
        if (href) window.open(href, "_blank", "noopener,noreferrer");
        else toast("Barua haipatikani.");
      }
    }

    const userAction = target.dataset.userAction;
    const rowId = target.dataset.row;
    if (userAction && rowId) {
      await handleUserRowAction(userAction, rowId, session);
      refreshAll(session);
    }

    const id = target.dataset.id;
    const a = target.dataset.adminAction;
    if (id && a) {
      if (!canReviewElevatedQueue()) {
        toast("Huna ruhusa ya queue hii.");
        return;
      }
      const who = reviewerLabel(session);
      if (a === "review") await updateRequestStatus(id, "Inakaguliwa", who);
      if (a === "approve") await updateRequestStatus(id, "Imeidhinishwa", who);
      if (a === "reject") await updateRequestStatus(id, "Imekataliwa", who, "Rejected after review.");
      if (a === "correction") await updateRequestStatus(id, "Inahitaji Marekebisho", who, "Please fix scope details.");
      if (a === "complete") await updateRequestStatus(id, "Imekamilika", who);
      if (a === "archive") await updateRequestStatus(id, "Imehifadhiwa", who);
      refreshAll(session);
    }

    const printRid = target.dataset.approvedPrint;
    if (printRid) {
      const row = getApprovedAccess().find((x) => x.requestId === printRid);
      if (!row) return;
      const html = `<table><tr><th>Applicant</th><td>${row.applicantName}</td></tr><tr><th>Permission</th><td>${row.rolePermission}</td></tr><tr><th>Scope</th><td>${row.level} / ${row.unit}</td></tr><tr><th>Expiry</th><td>${row.expiryDate || "-"}</td></tr></table>`;
      printElevatedReport(`Elevated Access ${printRid}`, html);
    }
    const exportRid = target.dataset.approvedExport;
    if (exportRid) {
      const row = getApprovedAccess().find((x) => x.requestId === exportRid);
      if (!row) return;
      exportCsv(`kmt-elevated-approved-${exportRid}.csv`, [
        "Field,Value",
        ...Object.entries(row).map(([k, v]) => `${csvCell(k)},${csvCell(v)}`),
      ]);
      toast("Row imeexportiwa CSV.");
    }
  });
}

function seedReadonlyFields() {
  const me = getCurrentUser();
  el("fullName").value = me.full_name;
  el("email").value = me.email;
  el("phone").value = me.phone;
  el("currentRoles").value = me.current_roles.join(", ");
  el("currentScope").value = me.current_scope;
}

function bindSupportingLetterUpload() {
  const input = el("supportingLetterFile");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      pendingLetter = { supportingLetter: "", supportingLetterName: "" };
      return;
    }
    try {
      pendingLetter = await prepareSupportingLetter(file);
      toast(`Barua imepakiwa: ${pendingLetter.supportingLetterName || file.name}`);
    } catch (err) {
      pendingLetter = { supportingLetter: "", supportingLetterName: "" };
      input.value = "";
      toast(err?.message || "Upload imeshindwa.");
    }
  });
}

function initCustomActions() {
  const { custom } = getRequestCatalog();
  if (!custom.categories.includes("Additional Module Permissions")) addCustomCategory("Additional Module Permissions");
  if (!custom.types.includes("Temporary Acting Role")) addCustomType("Temporary Acting Role");
  if (!custom.permissions.includes("Finance Admin Privilege")) addPermissionLayer("Finance Admin Privilege");
  if (!custom.justificationFields.includes("Operational impact statement")) addCustomJustificationField("Operational impact statement");
}

async function init() {
  installGlobalCrashGuards("phase31_elevated_access");
  const session = assertElevatedAccessPage();
  if (!session) return;

  await initElevatedAccessData(session);
  initCustomActions();
  renderStepStatus();
  seedReadonlyFields();
  bindSupportingLetterUpload();
  bindFormCatalog();
  bindEvents(session);
  el("previewModal")?.addEventListener("click", (ev) => {
    if (ev.target?.id === "previewModal") el("previewModal")?.setAttribute("hidden", "");
  });
  refreshAll(session);
  setInterval(() => {
    runExpiryCheck();
    refreshAll(session);
  }, 5 * 60 * 1000);
}

init();
