import {
  MAX_SUPER_ADMIN_SLOTS,
  DEFAULT_UNIT_SLOTS,
  levelOptions,
  permissionRoles,
  permissionMatrixColumns,
} from "./phase16-access-hooks.js";
import { asArray, getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const nowDate = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const stamp = () => Date.now() + Math.floor(Math.random() * 999);
const toMask = () => "********";
const useSupabase = () => !!getSafeSupabase();

const state = {
  settings: {
    superAdminRegistrationLocked: false,
    superAdminApprovalMode: "chief_admin",
  },
  chiefAdmin: {
    id: 1,
    full_name: "ENOCK FUGO",
    email: "fugomadata0@gmail.com",
    phone: "+255700111000",
    role: "Chief Admin / Mkuu wa Mfumo",
    access_level: "Full System Control",
    status: "Active",
    initial_password_seed_only: "2026",
    password_hash: "seed_hash_2026_demo_only",
  },
  superAdmins: [
    {
      id: 101,
      full_name: "MCH. SOSPITER MASAMAKI CHANGURU",
      email: "sospiter@kmkt.or.tz",
      phone: "+255700001001",
      slot_number: 1,
      status: "Active",
      registered_at: "2026-04-01",
      last_login: "2026-04-26 21:20",
      password_hash: "hash_slot_1",
    },
  ],
  accessSlots: [
    {
      id: 1,
      level: "Dayosisi",
      unit_name: "Dayosisi ya Mara",
      slot_1_user: "Asha Mrema",
      slot_2_user: "John Limo",
      slot_3_user: "Peter Nchimbi",
      access_status: "Active",
      completion_status: "Imekamilika",
      last_update: "2026-04-26 18:12",
    },
    {
      id: 2,
      level: "Jimbo",
      unit_name: "Jimbo la Kati",
      slot_1_user: "Neema Chuwa",
      slot_2_user: "Moses Mariki",
      slot_3_user: "Vacant",
      access_status: "Partial",
      completion_status: "Inahitaji Marekebisho",
      last_update: "2026-04-26 17:02",
    },
    {
      id: 3,
      level: "Tawi / Parokia / Kituo",
      unit_name: "Tawi la Amani",
      slot_1_user: "Rehema Peter",
      slot_2_user: "David Simon",
      slot_3_user: "Edina Jonas",
      access_status: "Active",
      completion_status: "Imewasilishwa",
      last_update: "2026-04-25 13:24",
    },
  ],
  submissions: [
    {
      id: 301,
      level: "Dayosisi",
      unit_name: "Dayosisi ya Mara",
      assigned_user: "Asha Mrema",
      status: "Imeidhinishwa",
      completion: "Imekamilika",
      submitted_date: "2026-04-26",
      notes: "Imepitia ukaguzi wa mwisho.",
      locked: false,
    },
    {
      id: 302,
      level: "Jimbo",
      unit_name: "Jimbo la Kati",
      assigned_user: "Neema Chuwa",
      status: "Inahitaji Marekebisho",
      completion: "Haijakamilika",
      submitted_date: "2026-04-25",
      notes: "Tafadhali ongeza taarifa za idara.",
      locked: false,
    },
    {
      id: 303,
      level: "Tawi / Parokia / Kituo",
      unit_name: "Tawi la Neema",
      assigned_user: "Julius Mushi",
      status: "Inasubiri",
      completion: "Haijakamilika",
      submitted_date: "2026-04-26",
      notes: "Inasubiri mthibitishaji.",
      locked: false,
    },
  ],
  permissions: [],
  auditLogs: [],
  notifications: [
    { id: 901, title: "Submission received", type: "Submission", channel: "In-app", status: "new", date: nowTime() },
    { id: 902, title: "Slot full warning", type: "Security", channel: "In-app", status: "new", date: nowTime() },
  ],
  sessions: [
    { id: 1, user: "ENOCK FUGO", role: "Chief Admin", device: "Desktop", browser: "Chrome", ip: "IP Placeholder", login_time: "2026-04-26 09:10", last_activity: "2026-04-26 23:01", status: "Active" },
    { id: 2, user: "MCH. SOSPITER MASAMAKI CHANGURU", role: "Super Admin", device: "Laptop", browser: "Edge", ip: "IP Placeholder", login_time: "2026-04-26 08:45", last_activity: "2026-04-26 22:48", status: "Active" },
    { id: 3, user: "Neema Chuwa", role: "Jimbo Data Officer", device: "Mobile", browser: "Safari", ip: "IP Placeholder", login_time: "2026-04-26 16:00", last_activity: "2026-04-26 18:19", status: "Idle" },
  ],
  loginAttempts: [
    { id: 1, user: "unknown@kmkt.or.tz", role: "-", attempt_time: "2026-04-26 22:40", result: "Failed", ip: "IP Placeholder", notes: "Wrong password" },
    { id: 2, user: "fugomadata0@gmail.com", role: "Chief Admin", attempt_time: "2026-04-26 22:42", result: "Success", ip: "IP Placeholder", notes: "Authenticated" },
    { id: 3, user: "media@kmkt.or.tz", role: "Media Admin", attempt_time: "2026-04-26 22:43", result: "Locked", ip: "IP Placeholder", notes: "Threshold exceeded" },
  ],
  securityPolicies: [
    { label: "Password length", value: "Minimum 8" },
    { label: "Complexity", value: "Upper + Lower + Number + Symbol" },
    { label: "Expiration", value: "Placeholder / 90 days" },
    { label: "2FA", value: "Placeholder / Toggle Ready" },
    { label: "Lock threshold", value: "5 failed attempts" },
    { label: "Session timeout", value: "60 minutes idle" },
  ],
  securityAlerts: [
    { id: 1, alert: "Multiple failed login attempts", level: "Warning", module: "Auth", datetime: "2026-04-26 22:44", status: "Open" },
    { id: 2, alert: "Role changed for Dayosisi officer", level: "Info", module: "Roles", datetime: "2026-04-26 21:12", status: "Resolved" },
    { id: 3, alert: "Super Admin slot pending approval", level: "Reminder", module: "Super Admin", datetime: "2026-04-26 20:58", status: "Open" },
  ],
};

state.permissions = permissionRoles.map((role) => {
  const base = Object.fromEntries(permissionMatrixColumns.map((col) => [col, false]));
  if (role === "Chief Admin") return { role, ...Object.fromEntries(permissionMatrixColumns.map((col) => [col, true])), disabled: false };
  if (role === "Super Admin") return { role, ...Object.fromEntries(permissionMatrixColumns.map((col) => [col, true])), disabled: false };
  if (role.includes("Viewer")) return { role, ...base, View: true, Print: true, disabled: false };
  return { role, ...base, View: true, Add: true, Edit: true, Submit: true, Print: true, disabled: false };
});

function addAudit(user, role, action, module, record, oldValue = "-", newValue = "-", status = "Success") {
  state.auditLogs.unshift({
    id: stamp(),
    user,
    role,
    action,
    module,
    record,
    old_value: oldValue,
    new_value: newValue,
    datetime: nowTime(),
    ip_device: "web-client",
    status,
  });
  if (useSupabase()) {
    getSafeSupabase()
      .from("audit_logs")
      .insert({
        actor_role: role,
        action,
        entity_table: module,
        entity_id: String(record || "-"),
        payload: { user, oldValue, newValue, status },
      })
      .then(() => {})
      .catch(() => {});
  }
}

function addNotification(title, type = "General", channel = "In-app", status = "new") {
  state.notifications.unshift({ id: stamp(), title, type, channel, status, date: nowTime() });
  if (useSupabase()) {
    getSafeSupabase()
      .from("workflow_notifications")
      .insert({ title, notification_type: type, channel, status })
      .then(() => {})
      .catch(() => {});
  }
}

const normalizeSubmission = (r) => ({
  id: r.id,
  level: r.level_name,
  unit_name: r.unit_name,
  assigned_user: r.assigned_user || "-",
  status: r.status_sw || "Haijawasilishwa",
  completion: r.completion_sw || "Haijakamilika",
  submitted_date: r.submitted_at ? String(r.submitted_at).slice(0, 10) : nowDate(),
  notes: r.correction_notes || r.approver_comments || "-",
  locked: !!r.locked,
});

export async function loadAccessData() {
  if (!useSupabase()) return;
  const s = getSafeSupabase();
  if (!s) return;
  const result = await safeAsync(
    "phase16_load_access_data",
    async () =>
      Promise.all([
        s.from("chief_admin_profile").select("*").limit(1),
        s.from("super_admin_slots").select("*").order("slot_number", { ascending: true }),
        s.from("unit_access_slots").select("*").order("id", { ascending: true }),
        s.from("data_submissions").select("*").order("id", { ascending: false }),
        s.from("role_permissions_matrix").select("*").order("id", { ascending: true }),
        s.from("workflow_notifications").select("*").order("id", { ascending: false }).limit(50),
      ]),
    null
  );
  if (!result) return;
  const [chief, superSlots, unitSlots, submissions, permissions, notifications] = result;

  if (!chief.error && chief.data?.length) {
    const c = chief.data[0];
    state.chiefAdmin = {
      ...state.chiefAdmin,
      full_name: c.full_name || state.chiefAdmin.full_name,
      email: c.email || state.chiefAdmin.email,
      phone: c.phone || state.chiefAdmin.phone,
      role: c.role || state.chiefAdmin.role,
      access_level: c.access_level || state.chiefAdmin.access_level,
      status: c.status || state.chiefAdmin.status,
      password_hash: c.password_hash || state.chiefAdmin.password_hash,
    };
  }
  if (!superSlots.error && superSlots.data) {
    state.superAdmins = superSlots.data
      .filter((x) => x.status !== "Open")
      .map((x) => ({
        id: x.id,
        full_name: x.full_name || "-",
        email: x.email || "-",
        phone: x.phone || "-",
        slot_number: x.slot_number,
        status: x.status || "Pending Approval",
        registered_at: x.registered_at ? String(x.registered_at).slice(0, 10) : nowDate(),
        last_login: x.last_login ? String(x.last_login).slice(0, 19).replace("T", " ") : "-",
        password_hash: "hash_remote",
      }));
  }
  if (!unitSlots.error && unitSlots.data) {
    state.accessSlots = unitSlots.data.map((x) => ({
      id: x.id,
      level: x.level_name,
      unit_name: x.unit_name,
      slot_1_user: x.slot_1_user || "Vacant",
      slot_2_user: x.slot_2_user || "Vacant",
      slot_3_user: x.slot_3_user || "Vacant",
      access_status: x.access_status || "Active",
      completion_status: x.completion_status || "Haijawasilishwa",
      last_update: x.updated_at ? String(x.updated_at).slice(0, 19).replace("T", " ") : nowTime(),
    }));
  }
  if (!submissions.error && submissions.data) state.submissions = asArray(submissions.data).map(normalizeSubmission);
  if (!permissions.error && permissions.data?.length) {
    state.permissions = permissions.data.map((x) => ({
      role: x.role_name,
      View: !!x.can_view,
      Add: !!x.can_add,
      Edit: !!x.can_edit,
      Delete: !!x.can_delete,
      Submit: !!x.can_submit,
      Approve: !!x.can_approve,
      Reject: !!x.can_reject,
      Export: !!x.can_export,
      Print: !!x.can_print,
      "Manage Users": !!x.can_manage_users,
      "Manage Settings": !!x.can_manage_settings,
      "Access Confidential Data": !!x.can_access_confidential,
      disabled: !!x.disabled,
    }));
  }
  if (!notifications.error && notifications.data) {
    state.notifications = asArray(notifications.data).map((x) => ({
      id: x.id,
      title: x.title,
      type: x.notification_type,
      channel: x.channel,
      status: x.status,
      date: x.created_at ? String(x.created_at).slice(0, 19).replace("T", " ") : nowTime(),
    }));
  }
}

export function getChiefAdminCard() {
  const c = state.chiefAdmin;
  return {
    name: c.full_name,
    role: c.role,
    email: c.email,
    access_level: c.access_level,
    status: c.status,
    password_display: toMask(),
  };
}

export function getSuperAdmins() {
  return [...state.superAdmins].sort((a, b) => a.slot_number - b.slot_number);
}

export function getSuperAdminSlots() {
  const activeLike = getSuperAdmins().filter((x) => ["Active", "Pending Approval"].includes(x.status));
  const filled = activeLike.length;
  const occupied = activeLike.map((x) => x.slot_number);
  const available = [1, 2, 3, 4].filter((n) => !occupied.includes(n));
  return { max: MAX_SUPER_ADMIN_SLOTS, filled, occupied, available, locked: state.settings.superAdminRegistrationLocked };
}

export async function registerSuperAdmin(payload, actor = "Chief Admin") {
  const slots = getSuperAdminSlots();
  if (state.settings.superAdminRegistrationLocked) {
    throw new Error("Usajili wa Super Admin umefungwa na Chief Admin.");
  }
  if (slots.filled >= MAX_SUPER_ADMIN_SLOTS) {
    throw new Error("Slot zote za Super Admin zimejaa. Super Admin mmoja ajiondoe au Chief Admin amtoe ili mwingine ajisajili.");
  }
  if (slots.occupied.includes(Number(payload.slot_number))) {
    throw new Error("Slot uliyochagua tayari imechukuliwa.");
  }
  const row = {
    id: stamp(),
    full_name: payload.full_name,
    email: payload.email,
    phone: payload.phone,
    slot_number: Number(payload.slot_number),
    status: state.settings.superAdminApprovalMode === "none" ? "Active" : "Pending Approval",
    registered_at: nowDate(),
    last_login: "-",
    password_hash: `hash_${stamp()}`,
  };
  state.superAdmins.push(row);
  if (useSupabase()) {
    await getSafeSupabase().from("super_admin_registration_requests").insert({
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      password_hash: row.password_hash,
      slot_number: row.slot_number,
      security_question: payload.security_question || "",
      registration_status: row.status,
    });
  }
  addAudit(actor, "Chief Admin", "Registration", "Super Admin", row.email, "-", JSON.stringify(row.status));
  addNotification(`Usajili mpya wa Super Admin: ${row.full_name}`, "Registration");
  return row;
}

export async function superAdminResign({ adminId, password }, actor = "Super Admin") {
  const row = state.superAdmins.find((x) => x.id === adminId);
  if (!row) throw new Error("Super Admin hajapatikana.");
  if (row.status === "Removed" || row.status === "Resigned") throw new Error("Super Admin huyu tayari ameshaondoka.");
  if (!password || password.length < 4) throw new Error("Thibitisha password sahihi.");
  const old = row.status;
  row.status = "Resigned";
  if (useSupabase()) {
    await getSafeSupabase().from("super_admin_slots").update({ status: "Resigned" }).eq("id", adminId);
  }
  addAudit(row.full_name, actor, "Super Admin resignation", "Super Admin", row.email, old, row.status);
  addNotification(`Super Admin amejiuzulu: ${row.full_name}`, "Security");
}

export async function removeSuperAdmin(id, actor = "Chief Admin") {
  const row = state.superAdmins.find((x) => x.id === id);
  if (!row) return;
  const old = row.status;
  row.status = "Removed";
  if (useSupabase()) {
    await getSafeSupabase().from("super_admin_slots").update({ status: "Removed" }).eq("id", id);
  }
  addAudit(actor, "Chief Admin", "Role removal", "Super Admin", row.email, old, row.status);
}

export async function replaceSuperAdmin(id, replacementName, actor = "Chief Admin") {
  const row = state.superAdmins.find((x) => x.id === id);
  if (!row) return;
  const old = row.full_name;
  row.full_name = replacementName || row.full_name;
  row.status = "Active";
  if (useSupabase()) {
    await getSafeSupabase().from("super_admin_slots").update({ full_name: row.full_name, status: "Active" }).eq("id", id);
  }
  addAudit(actor, "Chief Admin", "Replace", "Super Admin", row.email, old, row.full_name);
}

export function toggleSuperAdminRegistrationLock() {
  state.settings.superAdminRegistrationLocked = !state.settings.superAdminRegistrationLocked;
  addAudit("ENOCK FUGO", "Chief Admin", "Manage Settings", "Super Admin Slots", "-", "-", String(state.settings.superAdminRegistrationLocked));
}

export function getAccessSlots() {
  return [...state.accessSlots];
}

export async function assignAccessUser(slotId, slotKey, userName, actor = "Super Admin") {
  const row = state.accessSlots.find((x) => x.id === slotId);
  if (!row) return;
  if (!["slot_1_user", "slot_2_user", "slot_3_user"].includes(slotKey)) throw new Error("Slot key si sahihi.");
  row[slotKey] = userName;
  row.last_update = nowTime();
  if (useSupabase()) {
    await getSafeSupabase().from("unit_access_slots").update({ [slotKey]: userName, updated_at: new Date().toISOString() }).eq("id", slotId);
  }
  addAudit(actor, "Admin", "Role assignment", "Access Slots", row.unit_name, "-", `${slotKey}:${userName}`);
  addNotification(`Mtumiaji amepewa ruhusa ${row.unit_name}`, "Role");
}

export async function resetAccessSlot(slotId, actor = "Super Admin") {
  const row = state.accessSlots.find((x) => x.id === slotId);
  if (!row) return;
  row.slot_1_user = "Vacant";
  row.slot_2_user = "Vacant";
  row.slot_3_user = "Vacant";
  row.access_status = "Reset";
  row.last_update = nowTime();
  if (useSupabase()) {
    await getSafeSupabase()
      .from("unit_access_slots")
      .update({
        slot_1_user: "Vacant",
        slot_2_user: "Vacant",
        slot_3_user: "Vacant",
        access_status: "Reset",
        updated_at: new Date().toISOString(),
      })
      .eq("id", slotId);
  }
  addAudit(actor, "Admin", "Reset Access", "Access Slots", row.unit_name, "-", "all slots reset");
}

export function getSubmissions(filters = {}) {
  return state.submissions.filter((row) => {
    if (filters.level && row.level !== filters.level) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.completion && row.completion !== filters.completion) return false;
    if (filters.user && !row.assigned_user.toLowerCase().includes(filters.user.toLowerCase())) return false;
    return true;
  });
}

export async function updateSubmissionStatus(id, status, completion, actor = "Approver") {
  const row = state.submissions.find((x) => x.id === id);
  if (!row) return;
  if (row.locked && !["Super Admin", "Chief Admin"].includes(actor)) {
    throw new Error("Submission hii imefungwa. Ni Super Admin/Chief Admin tu anaweza kubadilisha.");
  }
  const old = `${row.status}/${row.completion}`;
  row.status = status || row.status;
  row.completion = completion || row.completion;
  if (useSupabase()) {
    await getSafeSupabase()
      .from("data_submissions")
      .update({ status_sw: row.status, completion_sw: row.completion, updated_at: new Date().toISOString() })
      .eq("id", id);
  }
  addAudit(actor, "Approver", "Approval", "Submission", row.unit_name, old, `${row.status}/${row.completion}`);
  addNotification(`Submission update: ${row.unit_name} -> ${row.status}`, "Submission");
}

export async function lockSubmission(id, actor = "Super Admin") {
  const row = state.submissions.find((x) => x.id === id);
  if (!row) return;
  row.locked = true;
  if (useSupabase()) await getSafeSupabase().from("data_submissions").update({ locked: true }).eq("id", id);
  addAudit(actor, "Super Admin", "Lock submission", "Submission", row.unit_name, "Unlocked", "Locked");
}

export async function unlockSubmission(id, actor = "Super Admin") {
  const row = state.submissions.find((x) => x.id === id);
  if (!row) return;
  row.locked = false;
  if (useSupabase()) await getSafeSupabase().from("data_submissions").update({ locked: false }).eq("id", id);
  addAudit(actor, "Super Admin", "Unlock submission", "Submission", row.unit_name, "Locked", "Unlocked");
}

export function getSubmissionKpis() {
  const all = state.submissions;
  const countByStatus = (s) => all.filter((x) => x.status === s).length;
  const countByCompletion = (s) => all.filter((x) => x.completion === s).length;
  const submitted = all.filter((x) => ["Imewasilishwa", "Inasubiri", "Inakaguliwa", "Imeidhinishwa", "Imekataliwa", "Imekamilika"].includes(x.status)).length;
  const completed = countByCompletion("Imekamilika");
  const rate = all.length ? Math.round((completed / all.length) * 100) : 0;
  return {
    total: all.length,
    submitted,
    notSubmitted: countByStatus("Haijawasilishwa"),
    pending: countByStatus("Inasubiri"),
    approved: countByStatus("Imeidhinishwa"),
    rejected: countByStatus("Imekataliwa"),
    completed,
    notCompleted: countByCompletion("Haijakamilika"),
    needsCorrection: countByStatus("Inahitaji Marekebisho"),
    completionRate: rate,
  };
}

export function getProgressByGroup() {
  const groups = {
    dayosisi: state.submissions.filter((x) => x.level === "Dayosisi"),
    jimbo: state.submissions.filter((x) => x.level === "Jimbo"),
    branch: state.submissions.filter((x) => x.level.includes("Tawi")),
    institution: state.submissions.filter((x) => x.level === "Taasisi"),
  };
  const toRate = (arr) => (arr.length ? Math.round((arr.filter((x) => x.completion === "Imekamilika").length / arr.length) * 100) : 0);
  return {
    dayosisi: toRate(groups.dayosisi),
    jimbo: toRate(groups.jimbo),
    branch: toRate(groups.branch),
    institution: toRate(groups.institution),
  };
}

export function getPermissionMatrix() {
  return [...state.permissions];
}

export async function addCustomRole(name) {
  if (!name) return;
  const obj = Object.fromEntries(permissionMatrixColumns.map((col) => [col, false]));
  state.permissions.push({ role: name, ...obj, View: true, disabled: false });
  if (useSupabase()) {
    await getSafeSupabase().from("role_permissions_matrix").insert({
      role_name: name,
      can_view: true,
    });
  }
  addAudit("ENOCK FUGO", "Chief Admin", "Add Custom Role", "Permissions", name, "-", "created");
}

export async function cloneRole(sourceRole, newRole) {
  const src = state.permissions.find((x) => x.role === sourceRole);
  if (!src || !newRole) return;
  state.permissions.push({ ...src, role: newRole });
  if (useSupabase()) {
    await getSafeSupabase().from("role_permissions_matrix").insert({
      role_name: newRole,
      can_view: !!src.View,
      can_add: !!src.Add,
      can_edit: !!src.Edit,
      can_delete: !!src.Delete,
      can_submit: !!src.Submit,
      can_approve: !!src.Approve,
      can_reject: !!src.Reject,
      can_export: !!src.Export,
      can_print: !!src.Print,
      can_manage_users: !!src["Manage Users"],
      can_manage_settings: !!src["Manage Settings"],
      can_access_confidential: !!src["Access Confidential Data"],
      disabled: !!src.disabled,
    });
  }
  addAudit("ENOCK FUGO", "Chief Admin", "Clone Role", "Permissions", sourceRole, "-", newRole);
}

export async function toggleRoleDisabled(role) {
  const row = state.permissions.find((x) => x.role === role);
  if (!row || role === "Chief Admin") return;
  row.disabled = !row.disabled;
  if (useSupabase()) {
    await getSafeSupabase().from("role_permissions_matrix").update({ disabled: row.disabled }).eq("role_name", role);
  }
  addAudit("ENOCK FUGO", "Chief Admin", "Disable Role", "Permissions", role, "-", String(row.disabled));
}

export async function resetPermissions(role) {
  const row = state.permissions.find((x) => x.role === role);
  if (!row) return;
  permissionMatrixColumns.forEach((k) => {
    row[k] = role === "Chief Admin" || role === "Super Admin";
  });
  if (useSupabase()) {
    await getSafeSupabase()
      .from("role_permissions_matrix")
      .update({
        can_view: row.View,
        can_add: row.Add,
        can_edit: row.Edit,
        can_delete: row.Delete,
        can_submit: row.Submit,
        can_approve: row.Approve,
        can_reject: row.Reject,
        can_export: row.Export,
        can_print: row.Print,
        can_manage_users: row["Manage Users"],
        can_manage_settings: row["Manage Settings"],
        can_access_confidential: row["Access Confidential Data"],
      })
      .eq("role_name", role);
  }
  addAudit("ENOCK FUGO", "Chief Admin", "Reset Permissions", "Permissions", role, "-", "default");
}

export function getAuditLogs() {
  return [...state.auditLogs];
}

export function getNotifications() {
  return [...state.notifications];
}

export function getSessions() {
  return [...state.sessions];
}

export function getLoginAttempts() {
  return [...state.loginAttempts];
}

export function getSecurityPolicies() {
  return [...state.securityPolicies];
}

export function getSecurityAlerts() {
  return [...state.securityAlerts];
}

export async function markAllNotificationsRead() {
  state.notifications = state.notifications.map((x) => ({ ...x, status: "read" }));
  if (useSupabase()) {
    await getSafeSupabase().from("workflow_notifications").update({ status: "read" }).neq("id", -1);
  }
}

export function getLevelOptions() {
  return [...levelOptions];
}

export function getDefaultUnitSlots() {
  return DEFAULT_UNIT_SLOTS;
}

const roleByLevel = {
  "National / KMT": "National Admin",
  Dayosisi: "Dayosisi Data Officer",
  Jimbo: "Jimbo Data Officer",
  "Tawi / Parokia / Kituo": "Branch Data Officer",
  Idara: "Department Officer",
  Jumuiya: "Jumuiya Officer",
  Kwaya: "Choir Officer",
  Taasisi: "Institution Officer",
  "Events / Makambi": "Department Officer",
  "Publications / Documents": "Department Officer",
};

export function suggestRoleForLevel(level) {
  return roleByLevel[level] || "Data Officer / Mjaza Taarifa";
}

export function getAutoFillForUnit(slotId) {
  const row = state.accessSlots.find((x) => x.id === slotId);
  if (!row) return null;
  const preferredSlot =
    row.slot_1_user === "Vacant"
      ? "slot_1_user"
      : row.slot_2_user === "Vacant"
        ? "slot_2_user"
        : row.slot_3_user === "Vacant"
          ? "slot_3_user"
          : "slot_1_user";
  return {
    slotKey: preferredSlot,
    suggestedRole: suggestRoleForLevel(row.level),
    level: row.level,
    unitName: row.unit_name,
  };
}
