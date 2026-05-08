const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
if (menuToggle) {
  menuToggle.addEventListener("click", () => mainNav.classList.toggle("open"));
}

const roles = [
  "Chief Admin",
  "Super Admin",
  "National Admin",
  "Office Admin",
  "Diocese Admin",
  "Diocese Data Officer",
  "Jimbo Admin",
  "Jimbo Data Officer",
  "Branch Admin",
  "Branch Data Officer",
  "Department Officer",
  "Fellowship Officer",
  "Choir Officer",
  "Institution Officer",
  "Events Officer",
  "Publications Officer",
  "Approver",
  "Reviewer",
  "Viewer",
];

const users = [
  {
    name: "Mch. Elias Mwakalonge",
    email: "elias.mwakalonge@kmt.or.tz",
    phone: "+255 712 554 008",
    primaryRole: "Diocese Admin",
    roles: ["Diocese Admin", "Reviewer", "Approver"],
    level: "Dayosisi",
    unit: "Dayosisi ya Mwanza",
    status: "active",
    lastLogin: "27 Apr 2026, 02:48",
    created: "12 Jan 2024",
  },
  {
    name: "Pr. Rehema Mnyonge",
    email: "rehema.mnyonge@kmt.or.tz",
    phone: "+255 754 880 321",
    primaryRole: "Jimbo Admin",
    roles: ["Jimbo Admin"],
    level: "Jimbo",
    unit: "Jimbo la Nkuyu",
    status: "pending",
    lastLogin: "26 Apr 2026, 20:12",
    created: "02 Mar 2025",
  },
  {
    name: "Br. Daniel Nyasulu",
    email: "daniel.nyasulu@kmt.or.tz",
    phone: "+255 783 118 909",
    primaryRole: "Branch Data Officer",
    roles: ["Branch Data Officer", "Viewer"],
    level: "Tawi",
    unit: "Tawi la Nyakato",
    status: "inactive",
    lastLogin: "22 Apr 2026, 07:32",
    created: "30 Nov 2023",
  },
  {
    name: "Sr. Victoria Athuman",
    email: "victoria.athuman@kmt.or.tz",
    phone: "+255 746 900 551",
    primaryRole: "Institution Officer",
    roles: ["Institution Officer", "Reviewer"],
    level: "National",
    unit: "KMK(T) Schools Desk",
    status: "suspended",
    lastLogin: "19 Apr 2026, 16:03",
    created: "08 Sep 2024",
  },
  {
    name: "Ev. Boniface Mtingwa",
    email: "boniface.mtingwa@kmt.or.tz",
    phone: "+255 718 443 222",
    primaryRole: "Office Admin",
    roles: ["Office Admin", "Viewer"],
    level: "National",
    unit: "Ofisi Kuu Dar",
    status: "locked",
    lastLogin: "27 Apr 2026, 01:14",
    created: "14 Jul 2022",
  },
  {
    name: "Pr. Juliana Ngowi",
    email: "juliana.ngowi@kmt.or.tz",
    phone: "+255 765 009 118",
    primaryRole: "National Admin",
    roles: ["National Admin", "Super Admin"],
    level: "National",
    unit: "HQ Governance Unit",
    status: "active",
    lastLogin: "27 Apr 2026, 03:06",
    created: "21 May 2021",
  },
];

const tableBody = document.querySelector("#usersTable tbody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const levelFilter = document.getElementById("levelFilter");
const checkAll = document.getElementById("checkAll");

function statusClass(status) {
  return status;
}

function userActions() {
  const labels = [
    "View",
    "Edit",
    "Activate",
    "Deactivate",
    "Suspend",
    "Reset Password",
    "Assign Role",
    "Remove Role",
    "Change Unit",
    "View Audit",
    "Archive",
  ];
  return labels.map((label) => `<button data-action="${label}">${label}</button>`).join("");
}

function renderUsers() {
  const query = searchInput.value.toLowerCase().trim();
  const sFilter = statusFilter.value;
  const lFilter = levelFilter.value;

  const rows = users.filter((user) => {
    const found = [user.name, user.email, user.phone, user.unit, user.primaryRole].join(" ").toLowerCase().includes(query);
    const statusOk = sFilter === "all" || user.status === sFilter;
    const levelOk = lFilter === "all" || user.level === lFilter;
    return found && statusOk && levelOk;
  });

  tableBody.innerHTML = rows
    .map(
      (user, index) => `
      <tr>
        <td><input type="checkbox" class="row-check" /></td>
        <td>${index + 1}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${user.primaryRole}</td>
        <td>${user.level}</td>
        <td>${user.unit}</td>
        <td><span class="status ${statusClass(user.status)}">${user.status}</span></td>
        <td>${user.lastLogin}</td>
        <td>${user.created}</td>
        <td><div class="action-group">${userActions()}</div></td>
      </tr>
    `
    )
    .join("");
}

searchInput.addEventListener("input", renderUsers);
statusFilter.addEventListener("change", renderUsers);
levelFilter.addEventListener("change", renderUsers);

checkAll.addEventListener("change", () => {
  document.querySelectorAll(".row-check").forEach((row) => {
    row.checked = checkAll.checked;
  });
});

["bulkActivate", "bulkSuspend", "bulkArchive"].forEach((id) => {
  document.getElementById(id).addEventListener("click", () => {
    alert(`${id} executed kwa users walioteuliwa.`);
  });
});

const rolesList = document.getElementById("rolesList");
const rolePicker = document.getElementById("rolePicker");
const roleUser = document.getElementById("roleUser");
const primaryRole = document.getElementById("primaryRole");

function renderRolePills() {
  rolesList.innerHTML = roles.map((role) => `<li>${role}</li>`).join("");
}

function renderRoleSelects() {
  const roleOptions = roles.map((role) => `<option value="${role}">${role}</option>`).join("");
  rolePicker.innerHTML = roleOptions;
  primaryRole.innerHTML = `<option value="">Select primary role</option>${roleOptions}`;
  roleUser.innerHTML = users.map((user) => `<option value="${user.email}">${user.name}</option>`).join("");
}

document.getElementById("addRoleBtn").addEventListener("click", () => {
  const input = document.getElementById("customRoleInput");
  const value = input.value.trim();
  if (!value) return;
  if (!roles.includes(value)) {
    roles.push(value);
    renderRolePills();
    renderRoleSelects();
  }
  input.value = "";
});

["assignRoleBtn", "removeRoleBtn", "cloneRoleBtn", "disableRoleBtn"].forEach((id) => {
  document.getElementById(id).addEventListener("click", () => {
    alert(`${id} action completed.`);
  });
});

const slots = [
  {
    label: "Slot 1",
    user: "Pr. Juliana Ngowi",
    role: "National Admin",
    status: "Active",
    activity: "20 mins ago",
    completion: 98,
    submission: "Approved",
  },
  {
    label: "Slot 2",
    user: "Mch. Elias Mwakalonge",
    role: "Diocese Admin",
    status: "Active",
    activity: "1 hr ago",
    completion: 94,
    submission: "Submitted",
  },
  {
    label: "Slot 3",
    user: "Pr. Rehema Mnyonge",
    role: "Jimbo Admin",
    status: "Pending",
    activity: "2 hrs ago",
    completion: 78,
    submission: "In Review",
  },
];

const slotGrid = document.getElementById("slotGrid");
function renderSlots() {
  slotGrid.innerHTML = slots
    .map(
      (slot, idx) => `
      <article class="slot-card">
        <h4>${slot.label}</h4>
        <p class="slot-meta">Assigned user: ${slot.user}</p>
        <p class="slot-meta">Role: ${slot.role}</p>
        <p class="slot-meta">Status: ${slot.status}</p>
        <p class="slot-meta">Last activity: ${slot.activity}</p>
        <p class="slot-meta">Completion: ${slot.completion}%</p>
        <p class="slot-meta">Submission: ${slot.submission}</p>
        <div class="action-group">
          <button onclick="alert('Assign User for ${slot.label}')">Assign User</button>
          <button onclick="alert('Replace User for ${slot.label}')">Replace User</button>
          <button onclick="alert('Remove User for ${slot.label}')">Remove User</button>
          <button onclick="alert('View Submitted Data for ${slot.label}')">View Submitted Data</button>
          <button onclick="alert('Reset Slot ${idx + 1}')">Reset Slot</button>
          <button onclick="alert('Lock Slot ${idx + 1}')">Lock Slot</button>
          <button onclick="alert('Unlock Slot ${idx + 1}')">Unlock Slot</button>
        </div>
      </article>
    `
    )
    .join("");
}

document.getElementById("addSlotLabelBtn").addEventListener("click", () => {
  const input = document.getElementById("customSlotLabel");
  const label = input.value.trim();
  if (!label) return;
  slots.push({
    label,
    user: "Not assigned",
    role: "Viewer",
    status: "Open",
    activity: "N/A",
    completion: 0,
    submission: "Not Started",
  });
  input.value = "";
  renderSlots();
});

document.getElementById("addGroupBtn").addEventListener("click", () => {
  const group = document.getElementById("customAccessGroup").value.trim();
  if (!group) return;
  alert(`Custom access group "${group}" added.`);
  document.getElementById("customAccessGroup").value = "";
});

const basePermissions = [
  "View",
  "Add",
  "Edit",
  "Delete/Archive",
  "Restore",
  "Submit",
  "Approve",
  "Reject",
  "Request Correction",
  "Export",
  "Print",
  "Manage Users",
  "Manage Roles",
  "Manage Settings",
  "Access Confidential Data",
  "Override Workflow",
];

const permissionsTableHead = document.querySelector("#permissionsTable thead");
const permissionsTableBody = document.querySelector("#permissionsTable tbody");
let allPermissions = [...basePermissions];

function roleDefaultCheck(role, permission) {
  if (role.includes("Viewer")) return permission === "View" || permission === "Print";
  if (role.includes("Chief") || role.includes("Super") || role.includes("National")) return true;
  if (role.includes("Approver")) return ["View", "Approve", "Reject", "Request Correction", "Print"].includes(permission);
  if (role.includes("Reviewer")) return ["View", "Edit", "Submit", "Request Correction", "Print"].includes(permission);
  return ["View", "Add", "Edit", "Submit", "Export", "Print"].includes(permission);
}

function renderPermissions() {
  permissionsTableHead.innerHTML = `
    <tr>
      <th>Role</th>
      ${allPermissions.map((permission) => `<th>${permission}</th>`).join("")}
    </tr>
  `;

  permissionsTableBody.innerHTML = roles
    .map(
      (role) => `
      <tr>
        <td>${role}</td>
        ${allPermissions
          .map(
            (permission) => `
          <td>
            <input
              type="checkbox"
              ${roleDefaultCheck(role, permission) ? "checked" : ""}
              title="${role} - ${permission}"
            />
          </td>
        `
          )
          .join("")}
      </tr>
    `
    )
    .join("");
}

document.getElementById("bulkEnablePermissions").addEventListener("click", () => {
  permissionsTableBody.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.checked = true;
  });
});

document.getElementById("clonePermissionBtn").addEventListener("click", () => {
  alert("Role permissions cloned successfully.");
});

document.getElementById("resetPermissionBtn").addEventListener("click", () => {
  renderPermissions();
});

document.getElementById("addPermissionBtn").addEventListener("click", () => {
  const input = document.getElementById("customPermissionInput");
  const permission = input.value.trim();
  if (!permission) return;
  if (!allPermissions.includes(permission)) {
    allPermissions.push(permission);
    renderPermissions();
  }
  input.value = "";
});

renderUsers();
renderRolePills();
renderRoleSelects();
renderSlots();
renderPermissions();
