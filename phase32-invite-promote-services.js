/**
 * Phase 32 — Mialiko, upandishaji, ruhusa za ziada, badilishaji
 * Local-first; unganisha Supabase baadaye kwa jedwali sawa na `phase32-supabase-invite-promote.sql`.
 */
import { getSession } from "./phase3-services.js";
import { MAX_SUPER_ADMIN_SLOTS } from "./phase32-invite-promote-hooks.js";
import { getSafeSupabase, safeAsync } from "./phase-integration-core.js";

const LS_SLOTS = "kmt_super_admin_slots";
const LS_SETTINGS = "kmt_phase32_settings";
const LS_MODULE = "kmt_phase32_invite_promote_v1";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const today = () => new Date().toISOString().slice(0, 10);
const token = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function loadSlots() {
  try {
    const raw = localStorage.getItem(LS_SLOTS);
    const arr = JSON.parse(raw || "[]");
    if (Array.isArray(arr) && arr.length === MAX_SUPER_ADMIN_SLOTS) return arr;
  } catch (_) {}
  return [
    { slot: 1, occupied: true, name: "Chief", email: "chief@kmkt.or.tz", status: "Permanent", registeredAt: "2026-01-01" },
    { slot: 2, occupied: true, name: "Super A", email: "supera@kmkt.or.tz", status: "Active", registeredAt: "2026-02-01" },
    { slot: 3, occupied: false, name: "", email: "", status: "Available", registeredAt: "" },
    { slot: 4, occupied: false, name: "", email: "", status: "Available", registeredAt: "" },
  ];
}

function saveSlots(slots) {
  localStorage.setItem(LS_SLOTS, JSON.stringify(slots));
}

export function getPhase32Settings() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}");
    return {
      superInviteAllowedForSuperAdmin: !!d.superInviteAllowedForSuperAdmin,
      nationalAdminCanInvite: !!d.nationalAdminCanInvite,
      officeAdminCanUse: d.officeAdminCanUse !== false,
    };
  } catch (_) {
    return { superInviteAllowedForSuperAdmin: false, nationalAdminCanInvite: false, officeAdminCanUse: true };
  }
}

export function savePhase32Settings(partial) {
  const cur = getPhase32Settings();
  localStorage.setItem(LS_SETTINGS, JSON.stringify({ ...cur, ...partial }));
}

const state = {
  invitations: [],
  promotions: [],
  permissionLayers: [],
  replacements: [],
  activeAssignments: [],
  auditLogs: [],
  notifications: [],
};

const toBool = (v) => v === true || v === "true" || v === 1;

function toDbInvite(r) {
  return {
    id: r.id,
    invite_token: r.inviteToken,
    full_name: r.fullName,
    email: r.email,
    phone: r.phone || "",
    invite_type: r.inviteType,
    role_to_assign: r.roleToAssign || "",
    primary_role: r.primaryRole || "",
    additional_roles: r.additionalRoles || "",
    assigned_level: r.assignedLevel || "",
    assigned_unit: r.assignedUnit || "",
    slot_number: r.slotNumber ? String(r.slotNumber) : "",
    start_date: r.startDate || null,
    end_date: r.endDate || null,
    temp_or_permanent: r.tempOrPermanent || "Permanent",
    notes: r.notes || "",
    invite_expiry: r.inviteExpiry || null,
    status: r.status || "Rasimu",
    created_at: r.createdAt || now(),
    opened_at: r.openedAt || null,
    accepted_at: r.acceptedAt || null,
    approved_by: r.approvedBy || "-",
    save_as_draft: !!r.saveAsDraft,
  };
}

function fromDbInvite(r) {
  return {
    id: r.id,
    inviteToken: r.invite_token,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    inviteType: r.invite_type,
    roleToAssign: r.role_to_assign,
    primaryRole: r.primary_role,
    additionalRoles: r.additional_roles,
    assignedLevel: r.assigned_level,
    assignedUnit: r.assigned_unit,
    slotNumber: r.slot_number,
    startDate: r.start_date || "",
    endDate: r.end_date || "",
    tempOrPermanent: r.temp_or_permanent,
    notes: r.notes,
    inviteExpiry: r.invite_expiry || "",
    status: r.status,
    createdAt: r.created_at || now(),
    openedAt: r.opened_at || "",
    acceptedAt: r.accepted_at || "",
    approvedBy: r.approved_by || "-",
    saveAsDraft: !!r.save_as_draft,
  };
}

function toDbPromotion(r) {
  return {
    id: r.id,
    user_name: r.userName,
    user_email: r.userEmail || "",
    current_roles: r.currentRoles || "",
    new_role: r.newRole,
    promotion_type: r.promotionType || "permanent",
    assigned_level: r.assignedLevel || "",
    assigned_unit: r.assignedUnit || "",
    start_date: r.startDate || null,
    end_date: r.endDate || null,
    reason: r.reason || "",
    notes: r.notes || "",
    approval_needed: !!r.approvalNeeded,
    status: r.status || "Rasimu",
    submitted_at: r.submittedAt || now(),
    approved_by: r.approvedBy || "-",
    save_as_draft: !!r.saveAsDraft,
  };
}

function fromDbPromotion(r) {
  return {
    id: r.id,
    userName: r.user_name,
    userEmail: r.user_email || "",
    currentRoles: r.current_roles || "",
    newRole: r.new_role,
    promotionType: r.promotion_type || "permanent",
    assignedLevel: r.assigned_level || "",
    assignedUnit: r.assigned_unit || "",
    startDate: r.start_date || "",
    endDate: r.end_date || "",
    reason: r.reason || "",
    notes: r.notes || "",
    approvalNeeded: toBool(r.approval_needed),
    status: r.status || "Rasimu",
    submittedAt: r.submitted_at || now(),
    approvedBy: r.approved_by || "-",
    saveAsDraft: toBool(r.save_as_draft),
  };
}

function toDbLayer(r) {
  return {
    id: r.id,
    user_name: r.userName,
    user_email: r.userEmail || "",
    primary_role: r.primaryRole || "",
    layer: r.layer,
    scope: r.scope || "global",
    unit: r.unit || "",
    start_date: r.startDate || null,
    end_date: r.endDate || null,
    temp_or_permanent: r.tempOrPermanent || "Permanent",
    reason: r.reason || "",
    notes: r.notes || "",
    status: r.status || "Rasimu",
    submitted_at: r.submittedAt || now(),
    approved_by: r.approvedBy || "-",
    save_as_draft: !!r.saveAsDraft,
  };
}

function fromDbLayer(r) {
  return {
    id: r.id,
    userName: r.user_name,
    userEmail: r.user_email || "",
    primaryRole: r.primary_role || "",
    layer: r.layer,
    scope: r.scope || "global",
    unit: r.unit || "",
    startDate: r.start_date || "",
    endDate: r.end_date || "",
    tempOrPermanent: r.temp_or_permanent || "Permanent",
    reason: r.reason || "",
    notes: r.notes || "",
    status: r.status || "Rasimu",
    submittedAt: r.submitted_at || now(),
    approvedBy: r.approved_by || "-",
    saveAsDraft: toBool(r.save_as_draft),
  };
}

function toDbReplacement(r) {
  return {
    id: r.id,
    current_user: r.currentUser,
    replacement_user: r.replacementUser || "",
    replacement_is_invite: !!r.replacementIsInvite,
    effective_date: r.effectiveDate || null,
    immediate: !!r.immediate,
    transfer_pending_tasks: !!r.transferPendingTasks,
    reason: r.reason || "",
    notes: r.notes || "",
    status: r.status || "Inasubiri",
    created_at: r.createdAt || now(),
    approved_by: r.approvedBy || "-",
  };
}

function fromDbReplacement(r) {
  return {
    id: r.id,
    currentUser: r.current_user,
    replacementUser: r.replacement_user || "",
    replacementIsInvite: toBool(r.replacement_is_invite),
    effectiveDate: r.effective_date || "",
    immediate: toBool(r.immediate),
    transferPendingTasks: toBool(r.transfer_pending_tasks),
    reason: r.reason || "",
    notes: r.notes || "",
    status: r.status || "Inasubiri",
    createdAt: r.created_at || now(),
    approvedBy: r.approved_by || "-",
  };
}

function syncInviteRow(row) {
  const s = getSafeSupabase();
  if (!s) return;
  safeAsync("phase32_invite_upsert", () => s.from("phase32_invitations").upsert(toDbInvite(row), { onConflict: "id" }), null);
}

function syncPromotionRow(row) {
  const s = getSafeSupabase();
  if (!s) return;
  safeAsync("phase32_promotion_upsert", () => s.from("phase32_promotions").upsert(toDbPromotion(row), { onConflict: "id" }), null);
}

function syncLayerRow(row) {
  const s = getSafeSupabase();
  if (!s) return;
  safeAsync("phase32_layer_upsert", () => s.from("phase32_permission_layers").upsert(toDbLayer(row), { onConflict: "id" }), null);
}

function syncReplacementRow(row) {
  const s = getSafeSupabase();
  if (!s) return;
  safeAsync("phase32_replacement_upsert", () => s.from("phase32_replacements").upsert(toDbReplacement(row), { onConflict: "id" }), null);
}

function persist() {
  try {
    localStorage.setItem(
      LS_MODULE,
      JSON.stringify({
        invitations: state.invitations,
        promotions: state.promotions,
        permissionLayers: state.permissionLayers,
        replacements: state.replacements,
        activeAssignments: state.activeAssignments,
        auditLogs: state.auditLogs.slice(0, 300),
        notifications: state.notifications.slice(0, 150),
      })
    );
  } catch (_) {}
}

function hydrate() {
  try {
    const raw = localStorage.getItem(LS_MODULE);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.invitations)) state.invitations = d.invitations;
    if (Array.isArray(d.promotions)) state.promotions = d.promotions;
    if (Array.isArray(d.permissionLayers)) state.permissionLayers = d.permissionLayers;
    if (Array.isArray(d.replacements)) state.replacements = d.replacements;
    if (Array.isArray(d.activeAssignments)) state.activeAssignments = d.activeAssignments;
    if (Array.isArray(d.auditLogs)) state.auditLogs = d.auditLogs;
    if (Array.isArray(d.notifications)) state.notifications = d.notifications;
  } catch (_) {}
}

function audit(action, actor, details) {
  state.auditLogs.unshift({ id: token("AUD"), action, actor, details, at: now() });
  persist();
  const s = getSafeSupabase();
  if (s) {
    safeAsync("phase32_audit", () =>
      s.from("audit_logs").insert({
        actor_role: actor,
        action,
        entity_table: "phase32_admin_invite",
        entity_id: String(details).slice(0, 120),
        payload: { at: now() },
      })
    );
  }
}

function notify(title, channel = "In-app") {
  state.notifications.unshift({ id: token("NTF"), title, channel, status: "new", at: now() });
  persist();
}

export function assertAdminInviteModuleAccess() {
  const session = getSession();
  if (!session) {
    window.location.href = "auth-login.html";
    return null;
  }
  if (session.expiresAt && Date.now() > session.expiresAt) {
    window.location.href = "session-expired.html";
    return null;
  }
  const st = getPhase32Settings();
  const r = session.role;
  if (r === "chief_admin" || r === "super_admin") {
    return { session, level: "full", settings: st };
  }
  if (r === "national_admin" && st.nationalAdminCanInvite) {
    return { session, level: "extended", settings: st };
  }
  if (r === "admin" && st.officeAdminCanUse) {
    return { session, level: "limited", settings: st };
  }
  window.location.href = "unauthorized.html";
  return null;
}

export function canUseSuperAdminInvite(ctx) {
  if (!ctx) return false;
  if (ctx.session.role === "chief_admin") return true;
  if (ctx.session.role === "super_admin" && ctx.settings.superInviteAllowedForSuperAdmin) return true;
  return false;
}

export function getAvailableSuperSlots() {
  const slots = loadSlots();
  return slots.filter((s) => !s.occupied);
}

export function superAdminSlotsFullMessage() {
  return "Slot zote za Super Admin zimejaa. Ondoa au badilisha Super Admin mmoja kwanza.";
}

export function createInvite(payload, actor) {
  if (payload.inviteType === "Super Admin Invite") {
    const session = getSession();
    const ctx = { session, settings: getPhase32Settings() };
    if (!session || !canUseSuperAdminInvite(ctx)) {
      throw new Error("Super Admin invite: Chief Admin pekee, au Super Admin ikiwa Chief amewezesha katika mipangilio.");
    }
    const slots = loadSlots();
    const available = slots.filter((s) => !s.occupied);
    if (!available.length) throw new Error(superAdminSlotsFullMessage());
    if (!payload.slotNumber) throw new Error("Chagua nambari ya slot (1–4) inayopatikana.");
    const sn = Number(payload.slotNumber);
    const slotRow = slots.find((s) => s.slot === sn);
    if (!slotRow) throw new Error("Slot haipo.");
    if (slotRow.occupied) throw new Error(superAdminSlotsFullMessage());
  }
  let initialStatus = "Rasimu";
  if (!payload.saveAsDraft) {
    initialStatus = payload.inviteType === "Super Admin Invite" ? "Inakaguliwa" : "Imetumwa";
  }
  const row = {
    id: token("INV"),
    inviteToken: token("TKN"),
    ...payload,
    status: initialStatus,
    createdAt: now(),
    openedAt: "",
    acceptedAt: "",
    approvedBy: "-",
  };
  state.invitations.unshift(row);
  syncInviteRow(row);
  audit("Invite created", actor, row.id);
  notify(`Mwaliko umeundwa: ${row.fullName} (${row.inviteType})`);
  persist();
  return row;
}

export function sendInvite(id, actor) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row) return;
  if (!["Rasimu", "Inakaguliwa"].includes(row.status)) return;

  if (row.inviteType === "Super Admin Invite" && row.status === "Rasimu") {
    row.status = "Inakaguliwa";
    syncInviteRow(row);
    audit("Super invite moved to review", actor, id);
    notify(`Mwaliko wa Super Admin: Inakaguliwa — thibitisha utumaji wa mwisho / Awaiting final send`);
    persist();
    return;
  }

  if (row.inviteType === "Super Admin Invite" && row.status === "Inakaguliwa") {
    const session = getSession();
    const ctx = { session, settings: getPhase32Settings() };
    if (!session || !canUseSuperAdminInvite(ctx)) return;
    row.status = "Imetumwa";
    syncInviteRow(row);
    audit("Invite sent", actor, id);
    notify(`Mwaliko umetumwa: ${row.email}`);
    persist();
    return;
  }

  row.status = "Imetumwa";
  syncInviteRow(row);
  audit("Invite sent", actor, id);
  notify(`Mwaliko umetumwa: ${row.email}`);
  persist();
}

export function cancelInvite(id, actor) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row) return;
  if (["Imekubaliwa", "Imekamilika", "Imeghairiwa"].includes(row.status)) return;
  row.status = "Imeghairiwa";
  syncInviteRow(row);
  audit("Invite cancelled", actor, id);
  notify(`Mwaliko umeghairiwa: ${row.id}`);
  persist();
}

export function expireInvite(id, actor) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imeisha Muda";
  syncInviteRow(row);
  audit("Invite expired (manual)", actor, id);
  persist();
}

export function archiveInvite(id, actor) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imehifadhiwa";
  syncInviteRow(row);
  audit("Invite archived", actor, id);
  persist();
}

export function markInviteOpened(id) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row || row.status !== "Imetumwa") return;
  row.status = "Imepokelewa";
  row.openedAt = now();
  syncInviteRow(row);
  audit("Invite opened", "System", id);
  persist();
}

export function acceptInvite(id, actor) {
  const row = state.invitations.find((x) => x.id === id);
  if (!row || row.status === "Imekubaliwa") return;
  if (!["Imetumwa", "Imepokelewa"].includes(row.status)) return;
  row.status = "Imekubaliwa";
  row.acceptedAt = now();
  syncInviteRow(row);
  if (row.inviteType === "Super Admin Invite" && row.slotNumber) {
    const slots = loadSlots();
    const ix = slots.findIndex((s) => s.slot === Number(row.slotNumber));
    if (ix >= 0 && !slots[ix].occupied) {
      slots[ix] = {
        ...slots[ix],
        occupied: true,
        name: row.fullName,
        email: row.email,
        status: "Pending Activation",
        registeredAt: today(),
      };
      saveSlots(slots);
      audit("Super Admin invite accepted", actor, `slot ${row.slotNumber}`);
    }
  }
  state.activeAssignments.unshift({
    id: token("ASN"),
    user: row.fullName,
    currentRole: "-",
    assignedRole: row.primaryRole,
    permissionLayer: "-",
    scope: row.assignedLevel,
    unit: row.assignedUnit || "-",
    status: "Imekamilika",
    startDate: row.startDate || today(),
    endDate: row.endDate || "",
    tempPerm: row.tempOrPermanent || "Permanent",
    approvedBy: actor,
    sourceId: row.id,
  });
  notify(`Mwaliko umekubaliwa: ${row.fullName}`);
  audit("Invite accepted", actor, id);
  persist();
}

export function createPromotion(payload, actor) {
  const row = {
    id: token("PRO"),
    ...payload,
    status: payload.saveAsDraft ? "Rasimu" : "Inasubiri",
    submittedAt: now(),
    approvedBy: "-",
  };
  state.promotions.unshift(row);
  syncPromotionRow(row);
  audit("Promotion created", actor, row.id);
  notify(`Upandishaji uwasilishwa: ${row.userName} → ${row.newRole}`);
  persist();
  return row;
}

export function approvePromotion(id, actor) {
  const row = state.promotions.find((x) => x.id === id);
  if (!row || row.status === "Imeidhinishwa" || row.status === "Imekamilika") return;
  row.status = "Imeidhinishwa";
  row.approvedBy = actor;
  syncPromotionRow(row);
  state.activeAssignments.unshift({
    id: token("ASN"),
    user: row.userName,
    currentRole: row.currentRoles,
    assignedRole: row.newRole,
    permissionLayer: "-",
    scope: row.assignedLevel,
    unit: row.assignedUnit || "-",
    status: "Imekamilika",
    startDate: row.startDate || today(),
    endDate: row.endDate || "",
    tempPerm: row.promotionType === "temporary" ? "Temporary" : "Permanent",
    approvedBy: actor,
    sourceId: row.id,
  });
  audit("Promotion approved", actor, id);
  notify(`Upandishaji umeidhinishwa: ${row.userName}`);
  persist();
}

export function applyPromotionImmediately(id, actor) {
  const row = state.promotions.find((x) => x.id === id);
  if (!row || row.approvalNeeded) return;
  approvePromotion(id, actor);
}

export function rejectPromotion(id, actor, reason) {
  const row = state.promotions.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imekataliwa";
  row.notes = `${row.notes || ""} | ${reason || ""}`.trim();
  syncPromotionRow(row);
  audit("Promotion rejected", actor, id);
  persist();
}

export function addPermissionLayer(payload, actor) {
  const row = {
    id: token("LAY"),
    ...payload,
    status: payload.saveAsDraft ? "Rasimu" : "Inasubiri",
    submittedAt: now(),
    approvedBy: "-",
  };
  state.permissionLayers.unshift(row);
  syncLayerRow(row);
  audit("Permission layer request", actor, row.id);
  notify(`Ruhusa ya ziada: ${row.userName} + ${row.layer}`);
  persist();
  return row;
}

export function rejectPermissionLayer(id, actor, reason) {
  const row = state.permissionLayers.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imekataliwa";
  row.notes = `${row.notes || ""} | ${reason || ""}`.trim();
  syncLayerRow(row);
  audit("Permission layer rejected", actor, id);
  persist();
}

export function approvePermissionLayer(id, actor) {
  const row = state.permissionLayers.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imeidhinishwa";
  row.approvedBy = actor;
  syncLayerRow(row);
  state.activeAssignments.unshift({
    id: token("ASN"),
    user: row.userName,
    currentRole: row.primaryRole,
    assignedRole: row.primaryRole,
    permissionLayer: row.layer,
    scope: row.scope,
    unit: row.unit || "-",
    status: "Imekamilika",
    startDate: row.startDate || today(),
    endDate: row.endDate || "",
    tempPerm: row.tempOrPermanent || "Permanent",
    approvedBy: actor,
    sourceId: row.id,
  });
  audit("Permission layer added", actor, id);
  notify(`Ruhusa ya ziada imeidhinishwa: ${row.layer}`);
  persist();
}

export function createReplacement(payload, actor) {
  const row = {
    id: token("REP"),
    ...payload,
    status: "Inasubiri",
    createdAt: now(),
    approvedBy: "-",
  };
  state.replacements.unshift(row);
  syncReplacementRow(row);
  audit("Replacement flow created", actor, row.id);
  notify(`Ombi la badilishaji: ${row.currentUser} → ${row.replacementUser}`);
  persist();
  return row;
}

export function applyReplacement(id, actor) {
  const row = state.replacements.find((x) => x.id === id);
  if (!row) return;
  row.status = "Imekamilika";
  row.approvedBy = actor;
  syncReplacementRow(row);
  audit("Replacement completed", actor, id);
  notify(`Badilishaji limekamilika: ${row.currentUser}`);
  persist();
}

export function runTemporaryExpirySweep() {
  const end = new Date(today()).getTime();
  state.activeAssignments.forEach((a) => {
    if (a.tempPerm !== "Temporary" || !a.endDate) return;
    const t = new Date(a.endDate).getTime();
    if (!Number.isNaN(t) && t < end) {
      a.status = "Imeisha Muda";
      audit("Temporary access expired", "Scheduler", a.id);
    }
  });
  persist();
}

function terminalInviteStatuses() {
  return new Set(["Imekubaliwa", "Imekamilika", "Imeghairiwa", "Imehifadhiwa", "Imeisha Muda"]);
}

export function runInviteExpirySweep() {
  const todayStr = today();
  state.invitations.forEach((inv) => {
    if (!inv.inviteExpiry || terminalInviteStatuses().has(inv.status)) return;
    if (inv.inviteExpiry < todayStr) {
      inv.status = "Imeisha Muda";
      audit("Invite expired", "Scheduler", inv.id);
      notify(`Mwaliko umeisha muda: ${inv.email}`);
    }
  });
  persist();
}

export function runAllPhase32Sweeps() {
  runTemporaryExpirySweep();
  runInviteExpirySweep();
}

/** DB-first sync: husoma Supabase na kujaza state; local hubaki fallback */
export async function syncPhase32FromSupabase() {
  const s = getSafeSupabase();
  if (!s) return false;
  const invRes = await safeAsync("phase32_sync_invitations", () => s.from("phase32_invitations").select("*").order("created_at", { ascending: false }), null);
  const proRes = await safeAsync("phase32_sync_promotions", () => s.from("phase32_promotions").select("*").order("submitted_at", { ascending: false }), null);
  const layRes = await safeAsync("phase32_sync_layers", () => s.from("phase32_permission_layers").select("*").order("submitted_at", { ascending: false }), null);
  const repRes = await safeAsync("phase32_sync_replacements", () => s.from("phase32_replacements").select("*").order("created_at", { ascending: false }), null);

  const invRows = Array.isArray(invRes?.data) ? invRes.data : [];
  const proRows = Array.isArray(proRes?.data) ? proRes.data : [];
  const layRows = Array.isArray(layRes?.data) ? layRes.data : [];
  const repRows = Array.isArray(repRes?.data) ? repRes.data : [];

  if (!invRows.length && !proRows.length && !layRows.length && !repRows.length) return false;

  state.invitations = invRows.map(fromDbInvite);
  state.promotions = proRows.map(fromDbPromotion);
  state.permissionLayers = layRows.map(fromDbLayer);
  state.replacements = repRows.map(fromDbReplacement);
  persist();
  return true;
}

/** Muunganisho wa wasifu — data ya mfumo (local) kwa mtumiaji aliyeingia */
export function getProfileIntegrationBundle(session) {
  if (!session) {
    return {
      primaryRole: "-",
      additionalRoles: [],
      permissionLayers: [],
      temporaryAssignments: [],
      expiryDates: [],
      pendingInvites: [],
      pendingPromotions: [],
      pendingPermissionRequests: [],
      roleHistory: [],
      approvalHistory: [],
    };
  }
  const email = (session.email || "").trim().toLowerCase();
  const name = (session.name || "").trim();
  const pendingInvites = state.invitations.filter(
    (i) => i.email && i.email.toLowerCase() === email && !terminalInviteStatuses().has(i.status)
  );
  const nameToken = name.toLowerCase().split(/\s+/).filter(Boolean)[0] || "";
  const pendingPromotions = state.promotions.filter(
    (p) =>
      (p.userEmail && p.userEmail.toLowerCase() === email) ||
      (nameToken && p.userName && p.userName.toLowerCase().includes(nameToken))
  );
  const pendingPermissionRequests = state.permissionLayers.filter(
    (p) =>
      p.status &&
      !["Imeidhinishwa", "Imekataliwa", "Imehifadhiwa"].includes(p.status) &&
      ((p.userEmail && p.userEmail.toLowerCase() === email) || (name && p.userName === name))
  );
  const approvedLayers = state.permissionLayers
    .filter((p) => p.status === "Imeidhinishwa" && ((p.userEmail && p.userEmail.toLowerCase() === email) || (name && p.userName === name)))
    .map((p) => p.layer);
  const tempAssign = state.activeAssignments.filter(
    (a) => a.tempPerm === "Temporary" && name && (a.user === name || (a.user && a.user.includes(name.split(" ")[0] || "")))
  );
  const roleHistory = state.promotions
    .filter((p) => p.userName === name || (p.userEmail && p.userEmail.toLowerCase() === email))
    .map((p) => `${p.submittedAt}: ${p.currentRoles} → ${p.newRole} (${p.status})`);
  const approvalHistory = state.auditLogs.filter((l) => l.actor === (session.name || email)).slice(0, 20);

  return {
    primaryRole: session.role || "-",
    additionalRoles: Array.isArray(session.additionalRoles) ? session.additionalRoles : [],
    permissionLayers: approvedLayers,
    temporaryAssignments: tempAssign,
    expiryDates: tempAssign.map((t) => t.endDate).filter(Boolean),
    pendingInvites,
    pendingPromotions,
    pendingPermissionRequests,
    roleHistory,
    approvalHistory,
  };
}

export function getInvitations() {
  return [...state.invitations];
}
export function getPromotions() {
  return [...state.promotions];
}
export function getPermissionLayers() {
  return [...state.permissionLayers];
}
export function getReplacements() {
  return [...state.replacements];
}
export function getActiveAssignments() {
  return [...state.activeAssignments];
}
export function getAuditLogs() {
  return [...state.auditLogs];
}
export function getNotifications() {
  return [...state.notifications];
}

export function seedIfEmpty(actorName) {
  hydrate();
  if (state.invitations.length) return;
  state.invitations.push({
    id: "INV-DEMO-1",
    inviteToken: "TKN-DEMO-1",
    fullName: "Neema Chuwa",
    email: "neema@kmkt.or.tz",
    phone: "+255700000001",
    inviteType: "Standard Invite",
    roleToAssign: "Jimbo Data Officer",
    primaryRole: "Jimbo Data Officer",
    additionalRoles: "",
    assignedLevel: "Jimbo",
    assignedUnit: "Jimbo la Kati",
    slotNumber: "",
    startDate: today(),
    endDate: "",
    tempOrPermanent: "Permanent",
    notes: "Mwaliko wa mfano",
    inviteExpiry: "2026-12-31",
    status: "Imetumwa",
    createdAt: now(),
    openedAt: "",
    acceptedAt: "",
    approvedBy: "-",
    saveAsDraft: false,
  });
  state.promotions.push({
    id: "PRO-DEMO-1",
    userName: "Asha Mrema",
    userEmail: "asha@kmkt.or.tz",
    currentRoles: "Diocese Data Officer",
    newRole: "Diocese Admin",
    promotionType: "permanent",
    assignedLevel: "Dayosisi",
    assignedUnit: "Dayosisi ya Mara",
    startDate: today(),
    endDate: "",
    reason: "Uongozi wa data umeimarika",
    notes: "",
    approvalNeeded: true,
    status: "Inakaguliwa",
    submittedAt: now(),
    approvedBy: "-",
    saveAsDraft: false,
  });
  audit("Module seeded", actorName, "phase32");
  persist();
}

hydrate();
