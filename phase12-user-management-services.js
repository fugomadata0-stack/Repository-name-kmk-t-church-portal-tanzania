import { getSafeSupabase } from "./phase-integration-core.js";

const state = {
  users: [
    {
      id: 1,
      full_name: "ENOCK FUGO",
      email: "fugomadata0@gmail.com",
      phone: "+255700111000",
      primary_role: "Chief Admin",
      other_roles: ["Super Admin"],
      assigned_level: "National HQ",
      assigned_unit: "KMK(T) HQ",
      status: "active",
      last_login: "2026-04-27 02:10",
      created_date: "2026-01-01",
      scope_badge: "Scope: National HQ",
      slot_assignment: "Super Admin Slot 1",
      activity_summary: "Active high-level governance",
      submissions_count: 18,
      approvals_count: 34,
      rejections_count: 2,
      completion_rate: 95,
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: 2,
      full_name: "Asha Marwa",
      email: "asha@kmkt.or.tz",
      phone: "+255712340001",
      primary_role: "Diocese Data Officer",
      other_roles: ["Reviewer"],
      assigned_level: "Dayosisi",
      assigned_unit: "Dayosisi ya Mwanza",
      status: "active",
      last_login: "2026-04-26 19:30",
      created_date: "2026-02-14",
      scope_badge: "Scope: Dayosisi ya Mwanza",
      slot_assignment: "Dayosisi Slot 2",
      activity_summary: "Submissions + reports",
      submissions_count: 26,
      approvals_count: 6,
      rejections_count: 4,
      completion_rate: 82,
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: 3,
      full_name: "Moses Nyerere",
      email: "moses@kmkt.or.tz",
      phone: "+255712340002",
      primary_role: "Jimbo Admin",
      other_roles: [],
      assigned_level: "Jimbo",
      assigned_unit: "Jimbo la Nkuyu",
      status: "suspended",
      last_login: "2026-04-20 12:00",
      created_date: "2026-02-20",
      scope_badge: "Scope: Jimbo la Nkuyu",
      slot_assignment: "Jimbo Slot 1",
      activity_summary: "Suspended pending review",
      submissions_count: 12,
      approvals_count: 2,
      rejections_count: 5,
      completion_rate: 56,
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
    },
  ],
  roles: [
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
  ],
  slots: [
    { id: 1, level: "Dayosisi", unit: "Dayosisi ya Mwanza", slot_label: "Slot 1", user: "Neema John", role: "Diocese Data Officer", status: "Active", last_activity: "2026-04-27 01:22", completion: 88, submission_status: "Imewasilishwa", locked: false },
    { id: 2, level: "Dayosisi", unit: "Dayosisi ya Mwanza", slot_label: "Slot 2", user: "Asha Marwa", role: "Diocese Data Officer", status: "Active", last_activity: "2026-04-26 21:01", completion: 82, submission_status: "Inasubiri", locked: false },
    { id: 3, level: "Jimbo", unit: "Jimbo la Nkuyu", slot_label: "Slot 1", user: "Moses Nyerere", role: "Jimbo Admin", status: "Suspended", last_activity: "2026-04-20 12:00", completion: 56, submission_status: "Inahitaji Marekebisho", locked: true },
    { id: 4, level: "Tawi/Parokia/Kituo", unit: "Tawi la Amani", slot_label: "Slot 1", user: "Rehema Paul", role: "Branch Data Officer", status: "Active", last_activity: "2026-04-26 18:20", completion: 91, submission_status: "Imeidhinishwa", locked: false },
  ],
  permissionMatrix: [],
};

const cols = [
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

state.permissionMatrix = state.roles.map((role) => {
  const obj = { role };
  cols.forEach((c) => (obj[c] = false));
  if (role === "Chief Admin" || role === "Super Admin") cols.forEach((c) => (obj[c] = true));
  else {
    obj["View"] = true;
    obj["Print"] = true;
    obj["Submit"] = true;
  }
  return obj;
});

const useSupabase = () => !!getSafeSupabase();

export const getUsers = () => [...state.users];
export const getRoles = () => [...state.roles];
export const getSlots = () => [...state.slots];
export const getPermissionMatrix = () => [...state.permissionMatrix];
export const getPermissionColumns = () => [...cols];

export function updateUser(id, patch) {
  state.users = state.users.map((u) => (u.id === id ? { ...u, ...patch } : u));
}

export function addCustomRole(roleName) {
  if (!roleName || state.roles.includes(roleName)) return;
  state.roles.push(roleName);
  const row = { role: roleName };
  cols.forEach((c) => (row[c] = c === "View" || c === "Print"));
  state.permissionMatrix.push(row);
}

export function cloneRole(sourceRole, newRole) {
  const src = state.permissionMatrix.find((r) => r.role === sourceRole);
  if (!src || !newRole || state.roles.includes(newRole)) return;
  state.roles.push(newRole);
  state.permissionMatrix.push({ ...src, role: newRole });
}

export function togglePermission(role, col) {
  state.permissionMatrix = state.permissionMatrix.map((r) =>
    r.role === role ? { ...r, [col]: !r[col] } : r
  );
}

export function updateSlot(id, patch) {
  state.slots = state.slots.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export async function loadPhase12Data() {
  if (!useSupabase()) return;
  // Supabase-ready placeholder (phase12_users, phase12_slots, role_permissions_matrix)
}
