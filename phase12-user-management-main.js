import {
  addCustomRole,
  cloneRole,
  getPermissionColumns,
  getPermissionMatrix,
  getRoles,
  getSlots,
  getUsers,
  loadPhase12Data,
  togglePermission,
  updateSlot,
  updateUser,
} from "./phase12-user-management-services.js";
import { installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);
const state = {
  q: "",
  status: "",
  level: "",
  selectedIds: new Set(),
  selectedUser: null,
};

const toast = (m) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = m;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2200);
};

function filteredUsers() {
  return getUsers().filter((u) => {
    const q = state.q.toLowerCase();
    const hit =
      !q ||
      [u.full_name, u.email, u.phone, u.primary_role, u.assigned_unit].join(" ").toLowerCase().includes(q);
    const sHit = !state.status || u.status === state.status;
    const lHit = !state.level || u.assigned_level === state.level;
    return hit && sHit && lHit;
  });
}

function renderKpis() {
  const users = getUsers();
  const by = (k) => users.filter((u) => u.status === k).length;
  el("kpiGrid").innerHTML = [
    ["All Users", users.length],
    ["Active", by("active")],
    ["Inactive", by("inactive")],
    ["Pending", by("pending")],
    ["Suspended", by("suspended")],
    ["Locked", by("locked")],
  ]
    .map(([l, v]) => `<article class="kpi"><h4>${l}</h4><p>${v}</p></article>`)
    .join("");
}

function renderUsersTable() {
  const rows = filteredUsers();
  el("usersBody").innerHTML = rows.length
    ? rows
        .map(
          (u, i) => `<tr>
      <td><input type="checkbox" data-check="${u.id}" ${state.selectedIds.has(u.id) ? "checked" : ""}/></td>
      <td>${i + 1}</td>
      <td>${u.full_name}</td><td>${u.email}</td><td>${u.phone}</td>
      <td>${u.primary_role}</td><td>${u.assigned_level}</td><td>${u.assigned_unit}</td>
      <td><span class="badge status-${u.status}">${u.status}</span></td>
      <td>${u.last_login}</td><td>${u.created_date}</td>
      <td class="actions">
        <button class="btn tiny" data-act="view" data-id="${u.id}">View</button>
        <button class="btn tiny" data-act="edit" data-id="${u.id}">Edit</button>
        <button class="btn tiny" data-act="activate" data-id="${u.id}">Activate</button>
        <button class="btn tiny" data-act="deactivate" data-id="${u.id}">Deactivate</button>
        <button class="btn tiny danger" data-act="suspend" data-id="${u.id}">Suspend</button>
        <button class="btn tiny" data-act="reset" data-id="${u.id}">Reset Password</button>
        <button class="btn tiny" data-act="assign" data-id="${u.id}">Assign Role</button>
        <button class="btn tiny" data-act="removeRole" data-id="${u.id}">Remove Role</button>
        <button class="btn tiny" data-act="unit" data-id="${u.id}">Change Unit</button>
        <button class="btn tiny" data-act="audit" data-id="${u.id}">View Audit</button>
        <button class="btn tiny" data-act="archive" data-id="${u.id}">Archive</button>
      </td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="12"><div class="empty">Hakuna watumiaji kwa filters hizi.</div></td></tr>`;
}

function renderRolesEngine() {
  el("rolesWrap").innerHTML = getRoles().map((r) => `<span class="chip">${r}</span>`).join("");
}

function renderSlots() {
  el("slotsBody").innerHTML = getSlots()
    .map(
      (s, i) => `<tr>
    <td>${i + 1}</td><td>${s.level}</td><td>${s.unit}</td><td>${s.slot_label}</td>
    <td>${s.user}</td><td>${s.role}</td><td>${s.status}</td><td>${s.last_activity}</td>
    <td>${s.completion}%</td><td>${s.submission_status}</td>
    <td class="actions">
      <button class="btn tiny" data-slot="assign" data-id="${s.id}">Assign User</button>
      <button class="btn tiny" data-slot="replace" data-id="${s.id}">Replace User</button>
      <button class="btn tiny danger" data-slot="remove" data-id="${s.id}">Remove User</button>
      <button class="btn tiny" data-slot="view" data-id="${s.id}">View Submitted Data</button>
      <button class="btn tiny" data-slot="reset" data-id="${s.id}">Reset Slot</button>
      <button class="btn tiny" data-slot="lock" data-id="${s.id}">Lock Slot</button>
      <button class="btn tiny" data-slot="unlock" data-id="${s.id}">Unlock Slot</button>
    </td>
  </tr>`
    )
    .join("");
}

function renderPermissions() {
  const cols = getPermissionColumns();
  el("permHead").innerHTML = `<tr><th>Role</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  el("permBody").innerHTML = getPermissionMatrix()
    .map(
      (r) => `<tr>
    <td>${r.role}</td>
    ${cols
      .map(
        (c) => `<td><input type="checkbox" data-role="${r.role}" data-col="${c}" ${r[c] ? "checked" : ""} /></td>`
      )
      .join("")}
  </tr>`
    )
    .join("");
}

function renderProfilePanel(user) {
  if (!user) return (el("profilePanel").innerHTML = `<div class="empty">Chagua mtumiaji kwenye table kuona profile panel.</div>`);
  el("profilePanel").innerHTML = `
    <div class="profile-top">
      <img src="${user.photo}" alt="${user.full_name}" />
      <div><h3>${user.full_name}</h3><p>${user.scope_badge}</p></div>
    </div>
    <p><b>Email:</b> ${user.email}</p>
    <p><b>Phone:</b> ${user.phone}</p>
    <p><b>Status:</b> ${user.status}</p>
    <p><b>Primary Role:</b> ${user.primary_role}</p>
    <p><b>Other Roles:</b> ${(user.other_roles || []).join(", ") || "-"}</p>
    <p><b>Assigned Scope:</b> ${user.assigned_level} - ${user.assigned_unit}</p>
    <p><b>Slot assignment:</b> ${user.slot_assignment}</p>
    <p><b>Last login:</b> ${user.last_login}</p>
    <p><b>Activity summary:</b> ${user.activity_summary}</p>
    <p><b>Submissions count:</b> ${user.submissions_count}</p>
    <p><b>Approval count:</b> ${user.approvals_count}</p>
    <p><b>Rejection count:</b> ${user.rejections_count}</p>
    <p><b>Completion rate:</b> ${user.completion_rate}%</p>
  `;
}

function refreshAll() {
  renderKpis();
  renderUsersTable();
  renderRolesEngine();
  renderSlots();
  renderPermissions();
  renderProfilePanel(state.selectedUser);
}

function bind() {
  el("searchInput").addEventListener("input", (e) => {
    state.q = e.target.value;
    renderUsersTable();
  });
  el("statusFilter").addEventListener("change", (e) => {
    state.status = e.target.value;
    renderUsersTable();
  });
  el("levelFilter").addEventListener("change", (e) => {
    state.level = e.target.value;
    renderUsersTable();
  });

  el("usersBody").addEventListener("change", (e) => {
    const id = Number(e.target.dataset.check);
    if (!id) return;
    if (e.target.checked) state.selectedIds.add(id);
    else state.selectedIds.delete(id);
  });

  el("usersBody").addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);
    const act = e.target.dataset.act;
    if (!id || !act) return;
    const user = getUsers().find((u) => u.id === id);
    if (!user) return;
    if (act === "view") {
      state.selectedUser = user;
      renderProfilePanel(user);
      return;
    }
    if (act === "activate") updateUser(id, { status: "active" });
    if (act === "deactivate") updateUser(id, { status: "inactive" });
    if (act === "suspend") updateUser(id, { status: "suspended" });
    if (act === "archive") updateUser(id, { status: "locked" });
    if (act === "assign") {
      const role = prompt("Assign role (supports multiple by comma):", user.primary_role) || user.primary_role;
      const list = role.split(",").map((x) => x.trim()).filter(Boolean);
      updateUser(id, { primary_role: list[0] || user.primary_role, other_roles: list.slice(1) });
    }
    if (act === "removeRole") updateUser(id, { other_roles: [] });
    if (act === "unit") {
      const unit = prompt("Weka assigned unit mpya:", user.assigned_unit) || user.assigned_unit;
      updateUser(id, { assigned_unit: unit });
    }
    if (act === "edit") {
      const phone = prompt("Hariri phone:", user.phone) || user.phone;
      updateUser(id, { phone });
    }
    if (act === "reset" || act === "audit") toast(`${act} action imeanzishwa kwa ${user.full_name}.`);
    refreshAll();
  });

  el("bulkActivateBtn").addEventListener("click", () => {
    [...state.selectedIds].forEach((id) => updateUser(id, { status: "active" }));
    toast("Bulk activate imekamilika.");
    refreshAll();
  });
  el("bulkSuspendBtn").addEventListener("click", () => {
    [...state.selectedIds].forEach((id) => updateUser(id, { status: "suspended" }));
    toast("Bulk suspend imekamilika.");
    refreshAll();
  });

  el("addCustomRoleBtn").addEventListener("click", () => {
    const role = prompt("Andika custom role:");
    addCustomRole(role || "");
    refreshAll();
  });
  el("cloneRoleBtn").addEventListener("click", () => {
    const source = prompt("Source role:");
    const target = prompt("New cloned role:");
    cloneRole(source || "", target || "");
    refreshAll();
  });

  el("slotsBody").addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);
    const act = e.target.dataset.slot;
    if (!id || !act) return;
    if (act === "assign" || act === "replace") {
      const user = prompt("Jina la mtumiaji:");
      const role = prompt("Role ya slot:");
      updateSlot(id, { user: user || "Vacant", role: role || "Viewer", last_activity: new Date().toISOString().slice(0, 16).replace("T", " "), status: "Active" });
    }
    if (act === "remove") updateSlot(id, { user: "Vacant", role: "-", status: "Inactive" });
    if (act === "reset") updateSlot(id, { completion: 0, submission_status: "Haijawasilishwa", status: "Inactive" });
    if (act === "lock") updateSlot(id, { locked: true, status: "Locked" });
    if (act === "unlock") updateSlot(id, { locked: false, status: "Active" });
    if (act === "view") toast("Submitted data preview placeholder.");
    refreshAll();
  });

  el("permBody").addEventListener("change", (e) => {
    const role = e.target.dataset.role;
    const col = e.target.dataset.col;
    if (!role || !col) return;
    togglePermission(role, col);
    renderPermissions();
  });
}

async function init() {
  installGlobalCrashGuards("phase12_user_management");
  await loadPhase12Data();
  refreshAll();
  bind();
}

init();
