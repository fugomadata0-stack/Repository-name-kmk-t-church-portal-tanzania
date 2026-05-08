import {
  MAX_SUPER_ADMIN_SLOTS,
  submissionStatuses,
  levelOptions,
  roleOptions,
  permissionMatrixColumns,
  superAdminActions,
} from "./phase16-access-hooks.js";
import { resolveFinalStatusColor } from "./phase-final-standards.js";
import {
  getChiefAdminCard,
  loadAccessData,
  getSuperAdmins,
  getSuperAdminSlots,
  registerSuperAdmin,
  superAdminResign,
  removeSuperAdmin,
  replaceSuperAdmin,
  toggleSuperAdminRegistrationLock,
  getAccessSlots,
  getAutoFillForUnit,
  assignAccessUser,
  resetAccessSlot,
  getSubmissions,
  updateSubmissionStatus,
  lockSubmission,
  unlockSubmission,
  getSubmissionKpis,
  getProgressByGroup,
  getPermissionMatrix,
  addCustomRole,
  cloneRole,
  toggleRoleDisabled,
  resetPermissions,
  getAuditLogs,
  getNotifications,
  getSessions,
  getLoginAttempts,
  getSecurityPolicies,
  getSecurityAlerts,
  markAllNotificationsRead,
  suggestRoleForLevel,
} from "./phase16-access-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
const state = {
  superAdminPage: 1,
  superAdminPageSize: 6,
  superAdminSearch: "",
  superAdminStatus: "",
  superAdminSort: "slot",
  selectedSubmissionIds: new Set(),
  submissionFilters: { level: "", status: "", completion: "", user: "" },
  confirm: null,
};

const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2500);
};

const statusClassByText = (text) => {
  const found = submissionStatuses.find((x) => x.sw === text || x.en === text);
  if (found?.color) return found.color;
  return resolveFinalStatusColor(text);
};

const statusBadge = (text) => `<span class="status-badge ${statusClassByText(text)}">${text}</span>`;
const rowClass = (status) => `status-${statusClassByText(status)}`;
const paginate = (rows, page, size) => rows.slice((page - 1) * size, page * size);

function ensureAssignModal() {
  if (document.getElementById("assignRoleModal")) return;
  const modal = document.createElement("div");
  modal.id = "assignRoleModal";
  modal.className = "confirm-backdrop";
  modal.innerHTML = `
    <div class="confirm-dialog" role="dialog" aria-modal="true">
      <h3>Assign User + Role</h3>
      <p id="assignRoleMeta" style="margin:0 0 8px;color:#d6d9e0"></p>
      <label style="display:block;margin:8px 0 4px">Jina la Kiongozi</label>
      <input id="assignRoleUserInput" type="text" style="width:100%;padding:8px;border-radius:8px;border:1px solid #5a6070;background:#0f1729;color:#fff;" />
      <label style="display:block;margin:10px 0 4px">Role</label>
      <select id="assignRoleSelect" style="width:100%;padding:8px;border-radius:8px;border:1px solid #5a6070;background:#0f1729;color:#fff;"></select>
      <div class="confirm-actions" style="margin-top:12px">
        <button type="button" class="btn" id="assignRoleCancelBtn">Cancel</button>
        <button type="button" class="btn gold" id="assignRoleSaveBtn">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openAssignRoleModal({ level, unitName, slot, suggestedRole }) {
  ensureAssignModal();
  const modal = document.getElementById("assignRoleModal");
  const userInput = document.getElementById("assignRoleUserInput");
  const roleSelect = document.getElementById("assignRoleSelect");
  const meta = document.getElementById("assignRoleMeta");
  const cancelBtn = document.getElementById("assignRoleCancelBtn");
  const saveBtn = document.getElementById("assignRoleSaveBtn");
  const roleList = [...new Set([suggestedRole, ...roleOptions])];
  roleSelect.innerHTML = roleList.map((r) => `<option value="${r}" ${r === suggestedRole ? "selected" : ""}>${r}</option>`).join("");
  userInput.value = "";
  meta.textContent = `${level || "Ngazi"} • ${unitName || "-"} • Slot: ${slot} • AUTO role: ${suggestedRole}`;
  modal.classList.add("open");
  userInput.focus();
  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.remove("open");
      cancelBtn.onclick = null;
      saveBtn.onclick = null;
      resolve(result);
    };
    cancelBtn.onclick = () => close(null);
    saveBtn.onclick = () => {
      const user = String(userInput.value || "").trim();
      const role = String(roleSelect.value || suggestedRole).trim();
      if (!user) {
        toast("Andika jina la kiongozi kwanza.");
        userInput.focus();
        return;
      }
      close({ user, role });
    };
  });
}

function openConfirm(title, message, onOk) {
  state.confirm = onOk;
  el("confirmTitle").textContent = title;
  el("confirmMessage").textContent = message;
  el("confirmModal").classList.add("open");
}
function closeConfirm() {
  state.confirm = null;
  el("confirmModal").classList.remove("open");
}

function renderChiefAdminCard() {
  const c = getChiefAdminCard();
  el("chiefAdminCard").innerHTML = `
    <div class="mini"><b>Name</b><p>${c.name}</p></div>
    <div class="mini"><b>Role</b><p>${c.role}</p></div>
    <div class="mini"><b>Email</b><p>${c.email}</p></div>
    <div class="mini"><b>Access Level</b><p>${c.access_level}</p></div>
    <div class="mini"><b>Status</b><p>${statusBadge(c.status)}</p></div>
  `;
}

function renderSlotStatus() {
  const s = getSuperAdminSlots();
  const items = Array.from({ length: MAX_SUPER_ADMIN_SLOTS }).map((_, i) => {
    const slotNo = i + 1;
    const occupied = s.occupied.includes(slotNo);
    return `<article class="slot ${occupied ? "full" : "open"}"><b>Slot ${slotNo}</b><p>${occupied ? "Occupied" : "Available"}</p></article>`;
  });
  el("slotStatus").innerHTML = `
    <p><b>Filled:</b> ${s.filled}/${s.max} | <b>Registration:</b> ${s.locked ? "Locked" : "Open"}</p>
    <div class="slot-grid">${items.join("")}</div>
    ${s.filled >= s.max ? `<div class="empty">Slot zote za Super Admin zimejaa. Super Admin mmoja ajiondoe au Chief Admin amtoe ili mwingine ajisajili.</div>` : ""}
  `;

  const slotSelect = el("slotNumberSelect");
  if (slotSelect) {
    slotSelect.innerHTML = s.available.length
      ? s.available.map((x) => `<option value="${x}">Slot ${x}</option>`).join("")
      : `<option value="">No available slot</option>`;
  }
}

function getFilteredSuperAdmins() {
  let rows = getSuperAdmins();
  if (state.superAdminSearch.trim()) {
    const q = state.superAdminSearch.toLowerCase();
    rows = rows.filter((r) => [r.full_name, r.email, r.phone].join(" ").toLowerCase().includes(q));
  }
  if (state.superAdminStatus) rows = rows.filter((r) => r.status === state.superAdminStatus);
  if (state.superAdminSort === "name") rows = rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
  if (state.superAdminSort === "date") rows = rows.sort((a, b) => String(b.registered_at).localeCompare(String(a.registered_at)));
  if (state.superAdminSort === "slot") rows = rows.sort((a, b) => a.slot_number - b.slot_number);
  return rows;
}

function renderSuperAdminsTable() {
  const rows = getFilteredSuperAdmins();
  const pageRows = paginate(rows, state.superAdminPage, state.superAdminPageSize);
  el("superAdminBody").innerHTML = pageRows.length
    ? pageRows
        .map((r, idx) => `
      <tr class="${rowClass(r.status)}">
        <td>${(state.superAdminPage - 1) * state.superAdminPageSize + idx + 1}</td>
        <td>${r.full_name}</td><td>${r.email}</td><td>${r.phone}</td><td>${r.slot_number}</td>
        <td>${statusBadge(r.status)}</td><td>${r.registered_at}</td><td>${r.last_login}</td>
        <td class="actions">
          ${superAdminActions.map((a) => `<button class="btn tiny" data-row="${r.id}" data-super-action="${a}">${a}</button>`).join("")}
        </td>
      </tr>`)
        .join("")
    : `<tr><td colspan="9"><div class="empty">Hakuna Super Admin matching filter ulioweka.</div></td></tr>`;

  const totalPages = Math.max(1, Math.ceil(rows.length / state.superAdminPageSize));
  el("superAdminPagination").innerHTML = `
    <button class="btn tiny" data-action="prevSuperPage" ${state.superAdminPage <= 1 ? "disabled" : ""}>Prev</button>
    <span>Page ${state.superAdminPage}/${totalPages}</span>
    <button class="btn tiny" data-action="nextSuperPage" ${state.superAdminPage >= totalPages ? "disabled" : ""}>Next</button>
  `;
}

function renderAccessSlots() {
  const rows = getAccessSlots();
  el("accessSlotsBody").innerHTML = rows
    .map(
      (r, i) => `
      <tr class="${rowClass(r.completion_status)}">
        <td>${i + 1}</td><td>${r.level}</td><td>${r.unit_name}</td>
        <td>${r.slot_1_user}</td><td>${r.slot_2_user}</td><td>${r.slot_3_user}</td>
        <td>${statusBadge(r.access_status)}</td><td>${statusBadge(r.completion_status)}</td><td>${r.last_update}</td>
        <td class="actions">
          <button class="btn tiny" data-access-action="assign" data-id="${r.id}">Assign User</button>
          <button class="btn tiny" data-access-action="replace" data-id="${r.id}">Replace User</button>
          <button class="btn tiny danger" data-access-action="remove" data-id="${r.id}">Remove User</button>
          <button class="btn tiny" data-access-action="permissions" data-id="${r.id}">View Permissions</button>
          <button class="btn tiny" data-access-action="reset" data-id="${r.id}">Reset Access</button>
          <button class="btn tiny" data-access-action="viewData" data-id="${r.id}">View Submitted Data</button>
        </td>
      </tr>`
    )
    .join("");
}

function renderSubmissionKpis() {
  const k = getSubmissionKpis();
  const cards = [
    ["Jumla ya Maeneo", k.total, "blue"], ["Yaliyowasilisha", k.submitted, "green"], ["Yasiyowasilisha", k.notSubmitted, "gray"],
    ["Yanayosubiri", k.pending, "yellow"], ["Yaliyoidhinishwa", k.approved, "green"], ["Yaliyokataliwa", k.rejected, "red"],
    ["Yaliyokamilika", k.completed, "emerald"], ["Yasiyokamilika", k.notCompleted, "orange"], ["Yanayohitaji Marekebisho", k.needsCorrection, "purple"],
    ["Completion Rate %", `${k.completionRate}%`, "slate"],
  ];
  el("submissionKpis").innerHTML = cards.map(([label, value, c]) => `<article class="kpi status-${c}"><h4>${label}</h4><p>${value}</p></article>`).join("");
}

function renderProgressBars() {
  const p = getProgressByGroup();
  const blocks = [
    ["Dayosisi completion progress", p.dayosisi],
    ["Jimbo completion progress", p.jimbo],
    ["Branch completion progress", p.branch],
    ["Institution completion progress", p.institution],
  ];
  el("progressBars").innerHTML = blocks.map(([label, pct]) => `<article class="p-card"><h4>${label}</h4><div class="bar"><span style="width:${pct}%"></span></div><p>${pct}%</p></article>`).join("");
}

function renderSubmissionFiltersOptions() {
  el("filterLevel").innerHTML = `<option value="">Filter by Level</option>${levelOptions.map((x) => `<option>${x}</option>`).join("")}`;
  const statuses = submissionStatuses.map((s) => s.sw);
  el("filterStatus").innerHTML = `<option value="">Filter by Status</option>${statuses.map((s) => `<option>${s}</option>`).join("")}`;
}

function renderSubmissionsTable() {
  const rows = getSubmissions(state.submissionFilters);
  el("submissionBody").innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `<tr class="${rowClass(r.status)}">
      <td><input type="checkbox" data-submission-check="${r.id}" ${state.selectedSubmissionIds.has(r.id) ? "checked" : ""}/></td>
      <td>${i + 1}</td><td>${r.level}</td><td>${r.unit_name}</td><td>${r.assigned_user}</td>
      <td>${statusBadge(r.status)}</td><td>${statusBadge(r.completion)}</td><td>${r.submitted_date}</td><td>${r.notes}</td>
      <td class="actions">
        <button class="btn tiny" data-sub-action="approve" data-id="${r.id}">Approve</button>
        <button class="btn tiny danger" data-sub-action="reject" data-id="${r.id}">Reject</button>
        <button class="btn tiny" data-sub-action="correction" data-id="${r.id}">Return Correction</button>
        <button class="btn tiny" data-sub-action="complete" data-id="${r.id}">Mark Completed</button>
        <button class="btn tiny" data-sub-action="notComplete" data-id="${r.id}">Mark Not Completed</button>
        <button class="btn tiny" data-sub-action="${r.locked ? "unlock" : "lock"}" data-id="${r.id}">${r.locked ? "Unlock" : "Lock"}</button>
        <button class="btn tiny" data-sub-action="print" data-id="${r.id}">Print</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="10"><div class="empty">Hakuna submissions kwa filter ulizochagua.</div></td></tr>`;
}

function renderPermissionMatrix() {
  const rows = getPermissionMatrix();
  el("permissionHead").innerHTML = `<tr><th>Role</th>${permissionMatrixColumns.map((c) => `<th>${c}</th>`).join("")}<th>Status</th></tr>`;
  el("permissionBody").innerHTML = rows
    .map((r) => `<tr>
      <td>${r.role}</td>
      ${permissionMatrixColumns.map((c) => `<td>${r[c] ? "✅" : "—"}</td>`).join("")}
      <td>${statusBadge(r.disabled ? "Disabled" : "Active")}</td>
    </tr>`)
    .join("");
}

function renderAuditLogs() {
  const rows = getAuditLogs();
  el("auditBody").innerHTML = rows.length
    ? rows
        .map(
          (r, i) =>
            `<tr><td>${i + 1}</td><td>${r.user}</td><td>${r.role}</td><td>${r.action}</td><td>${r.module}</td><td>${r.record}</td><td>${r.old_value}</td><td>${r.new_value}</td><td>${r.datetime}</td><td>${r.ip_device}</td><td>${statusBadge(r.status)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="11"><div class="empty">Hakuna audit logs bado.</div></td></tr>`;
}

function renderNotifications() {
  el("notificationBody").innerHTML = getNotifications()
    .map((n) => `<tr><td>${n.title}</td><td>${n.type}</td><td>${n.channel}</td><td>${n.date}</td><td>${statusBadge(n.status)}</td></tr>`)
    .join("");
}

function renderSessions() {
  const rows = getSessions();
  el("sessionsBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.user}</td><td>${r.role}</td><td>${r.device}</td><td>${r.browser}</td><td>${r.ip}</td><td>${r.login_time}</td><td>${r.last_activity}</td><td>${statusBadge(r.status)}</td>
      <td class="actions"><button class="btn tiny">View</button><button class="btn tiny danger">Revoke</button><button class="btn tiny">Force Logout</button></td>
    </tr>`
    )
    .join("");
}

function renderLoginAttempts() {
  const rows = getLoginAttempts();
  el("loginAttemptsBody").innerHTML = rows
    .map((r) => `<tr><td>${r.user}</td><td>${r.role}</td><td>${r.attempt_time}</td><td>${statusBadge(r.result)}</td><td>${r.ip}</td><td>${r.notes}</td></tr>`)
    .join("");
}

function renderSecurityPolicies() {
  const rows = getSecurityPolicies();
  el("securityPolicies").innerHTML = rows.map((r) => `<article class="kpi"><h4>${r.label}</h4><p>${r.value}</p></article>`).join("");
}

function renderSecurityAlerts() {
  const rows = getSecurityAlerts();
  el("securityAlertsBody").innerHTML = rows
    .map((r) => `<tr><td>${r.alert}</td><td>${statusBadge(r.level)}</td><td>${r.module}</td><td>${r.datetime}</td><td>${statusBadge(r.status)}</td></tr>`)
    .join("");
}

function refreshAll() {
  renderChiefAdminCard();
  renderSlotStatus();
  renderSuperAdminsTable();
  renderAccessSlots();
  renderSubmissionKpis();
  renderProgressBars();
  renderSubmissionsTable();
  renderPermissionMatrix();
  renderAuditLogs();
  renderNotifications();
  renderSessions();
  renderLoginAttempts();
  renderSecurityPolicies();
  renderSecurityAlerts();
}

function bindEvents() {
  document.body.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === "openSuperAdminRegistration") {
      window.location.href = "super-admin-special-registration.html";
      return;
    }
    if (action === "closeRegistrationModal") el("registrationModal").classList.remove("open");
    if (action === "toggleSuperAdminLock") {
      toggleSuperAdminRegistrationLock();
      refreshAll();
      toast("Super Admin registration lock status imebadilishwa.");
    }
    if (action === "prevSuperPage") { state.superAdminPage = Math.max(1, state.superAdminPage - 1); renderSuperAdminsTable(); }
    if (action === "nextSuperPage") {
      const total = Math.max(1, Math.ceil(getFilteredSuperAdmins().length / state.superAdminPageSize));
      state.superAdminPage = Math.min(total, state.superAdminPage + 1);
      renderSuperAdminsTable();
    }
    if (action === "applySubmissionFilters") {
      state.submissionFilters = {
        level: el("filterLevel").value,
        status: el("filterStatus").value,
        completion: el("filterCompletion").value,
        user: el("filterUser").value,
      };
      renderSubmissionsTable();
    }
    if (action.startsWith("export") || action.startsWith("print")) toast("Action imeanzishwa. Export/Print adapter iko tayari kuunganishwa.");
    if (action === "markNotificationsRead") { await markAllNotificationsRead(); renderNotifications(); toast("Notifications zote zimesomwa."); }

    if (action === "addCustomRole") {
      const name = prompt("Ingiza jina la custom role");
      await addCustomRole(name || "");
      refreshAll();
    }
    if (action === "cloneRole") {
      const source = prompt("Source role");
      const name = prompt("New role name");
      await cloneRole(source || "", name || "");
      refreshAll();
    }
    if (action === "disableRole") {
      const role = prompt("Role to disable/enable");
      await toggleRoleDisabled(role || "");
      refreshAll();
    }
    if (action === "resetPermissions") {
      const role = prompt("Role to reset");
      await resetPermissions(role || "");
      refreshAll();
    }
    if (action === "editPermission") toast("Permission editor modal ready (next integration).");
    if (
      [
        "addPermissionGroup",
        "addAccessSlotRule",
        "addCategory",
        "addType",
        "addCustomField",
        "addCustomSection",
        "addTag",
        "addStatusLabel",
        "addDocumentType",
        "addAccessLevel",
        "addApprovalStage",
        "addReportTemplate",
      ].includes(action)
    ) {
      toast(`${action} imewezeshwa kama extensibility control ya mfumo.`);
    }

    if (action === "bulkApprove" || action === "bulkReject" || action === "bulkNeedsCorrection") {
      const ids = [...state.selectedSubmissionIds];
      for (const id of ids) {
        if (action === "bulkApprove") await updateSubmissionStatus(id, "Imeidhinishwa", "Imekamilika", "Super Admin");
        if (action === "bulkReject") await updateSubmissionStatus(id, "Imekataliwa", "Haijakamilika", "Super Admin");
        if (action === "bulkNeedsCorrection") await updateSubmissionStatus(id, "Inahitaji Marekebisho", "Haijakamilika", "Super Admin");
      }
      state.selectedSubmissionIds.clear();
      refreshAll();
      toast("Bulk action imekamilika.");
    }
  });

  document.body.addEventListener("click", async (e) => {
    const id = Number(e.target.dataset.id);
    const sa = e.target.dataset.superAction;
    if (sa) {
      if (sa === "Remove") {
        openConfirm("Remove Super Admin", "Una uhakika unataka kumtoa Super Admin huyu?", () => {
          removeSuperAdmin(id).then(() => {
            refreshAll();
            toast("Super Admin ameondolewa.");
          });
        });
      }
      if (sa === "Replace") {
        const name = prompt("Jina la replacement admin");
        await replaceSuperAdmin(id, name || "");
        refreshAll();
      }
      if (["View", "Edit", "Disable", "Audit Log"].includes(sa)) toast(`${sa} action ready for Super Admin #${id}.`);
    }

    const aa = e.target.dataset.accessAction;
    if (aa) {
      if (aa === "assign" || aa === "replace") {
        const auto = getAutoFillForUnit(id);
        const slot = auto?.slotKey || "slot_1_user";
        const suggestedRole = auto?.suggestedRole || suggestRoleForLevel(auto?.level);
        const picked = await openAssignRoleModal({
          level: auto?.level || "Ngazi",
          unitName: auto?.unitName || "-",
          slot,
          suggestedRole,
        });
        if (!picked) return;
        const finalUser = `${picked.user} (${picked.role})`;
        try { await assignAccessUser(id, slot, finalUser); } catch (error) { toast(error.message); }
        refreshAll();
      }
      if (aa === "remove") {
        const slot = prompt("Slot key to remove") || "slot_3_user";
        try { await assignAccessUser(id, slot, "Vacant"); } catch (error) { toast(error.message); }
        refreshAll();
      }
      if (aa === "reset") {
        await resetAccessSlot(id);
        refreshAll();
      }
      if (["permissions", "viewData"].includes(aa)) toast("Action imefunguliwa.");
    }

    const sact = e.target.dataset.subAction;
    if (sact) {
      try {
        if (sact === "approve") await updateSubmissionStatus(id, "Imeidhinishwa", "Imekamilika", "Approver");
        if (sact === "reject") await updateSubmissionStatus(id, "Imekataliwa", "Haijakamilika", "Approver");
        if (sact === "correction") await updateSubmissionStatus(id, "Inahitaji Marekebisho", "Haijakamilika", "Approver");
        if (sact === "complete") await updateSubmissionStatus(id, "Imekamilika", "Imekamilika", "Approver");
        if (sact === "notComplete") await updateSubmissionStatus(id, "Haijakamilika", "Haijakamilika", "Approver");
      } catch (error) {
        toast(error.message);
      }
      if (sact === "lock") await lockSubmission(id);
      if (sact === "unlock") await unlockSubmission(id);
      if (sact === "print") toast("Submission print summary started.");
      refreshAll();
    }
  });

  el("superAdminSearch").addEventListener("input", (e) => {
    state.superAdminSearch = e.target.value;
    state.superAdminPage = 1;
    renderSuperAdminsTable();
  });
  el("superAdminStatusFilter").addEventListener("change", (e) => {
    state.superAdminStatus = e.target.value;
    state.superAdminPage = 1;
    renderSuperAdminsTable();
  });
  el("superAdminSort").addEventListener("change", (e) => {
    state.superAdminSort = e.target.value;
    renderSuperAdminsTable();
  });

  el("bulkToggle").addEventListener("change", (e) => {
    const all = getSubmissions(state.submissionFilters).map((x) => x.id);
    if (e.target.checked) all.forEach((id) => state.selectedSubmissionIds.add(id));
    else state.selectedSubmissionIds.clear();
    renderSubmissionsTable();
  });

  document.body.addEventListener("change", (e) => {
    const id = Number(e.target.dataset.submissionCheck);
    if (!id) return;
    if (e.target.checked) state.selectedSubmissionIds.add(id);
    else state.selectedSubmissionIds.delete(id);
  });

  el("registrationForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const err = el("registrationError");
    err.textContent = "";
    if (data.password !== data.confirm_password) {
      err.textContent = "Password na Confirm Password hazifanani.";
      return;
    }
    try {
      await registerSuperAdmin(data, "ENOCK FUGO");
      el("registrationModal").classList.remove("open");
      e.target.reset();
      refreshAll();
      toast("Super Admin registration imewasilishwa.");
    } catch (error) {
      err.textContent = error.message;
    }
  });

  el("resignForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    openConfirm(
      "Jiondoe kama Super Admin",
      "Uko karibu kuachia slot yako ya Super Admin. Endelea?",
      async () => {
        try {
          await superAdminResign({ adminId: Number(data.admin_id), password: data.password }, "Super Admin");
          refreshAll();
          toast("Umejiondoa kama Super Admin, slot imeachiwa.");
        } catch (error) {
          toast(error.message);
        }
      }
    );
  });

  el("cancelConfirmBtn").addEventListener("click", closeConfirm);
  el("okConfirmBtn").addEventListener("click", () => {
    if (typeof state.confirm === "function") {
      Promise.resolve(state.confirm()).catch((error) => toast(error?.message || "Action failed."));
    }
    closeConfirm();
  });
}

async function init() {
  installGlobalCrashGuards("phase16_access");
  try {
    await loadAccessData();
  } catch (error) {
    toast("Imeshindwa kuvuta data ya Supabase, inaendelea na local data.");
  }
  renderSubmissionFiltersOptions();
  bindEvents();
  refreshAll();
}

init();
