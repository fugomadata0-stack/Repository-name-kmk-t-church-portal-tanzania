import { churchSystemLevels } from "../constants/workflow.constants.js";
import { writeAuditLog } from "./audit-trail-service.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const nextId = () => Date.now() + Math.floor(Math.random() * 9999);
const UNASSIGNED = "UNASSIGNED";
const ADMIN_ROLES = new Set(["super_admin", "chief_admin"]);

const state = {
  ownershipRows: churchSystemLevels.map((level, index) => ({
    id: nextId() + index,
    ngazi: level,
    jina_la_ngazi: `${level} - Mkoa wa Kazi`,
    primary_owner: UNASSIGNED,
    secondary_owner: UNASSIGNED,
    reviewer: UNASSIGNED,
    approver: UNASSIGNED,
    submission_status: "Not Submitted",
    approval_status: "Pending",
    last_activity: now(),
    assigned_date: "",
    is_locked: false,
    progress: Math.floor(Math.random() * 40),
  })),
};

export function getLevelOwnershipRows() {
  return [...state.ownershipRows];
}

function ensureAuthorized(actor = {}) {
  if (!ADMIN_ROLES.has(actor.role)) {
    throw new Error("Huna ruhusa ya kufanya assignment ya ownership.");
  }
}

function resolveRow(levelId) {
  const row = state.ownershipRows.find((item) => item.id === levelId);
  if (!row) {
    throw new Error("Ownership row haijapatikana kwa ngazi hii.");
  }
  return row;
}

function normalizeOwner(value) {
  const clean = String(value || "")
    .trim()
    .toUpperCase();
  return clean || UNASSIGNED;
}

function validateUniqueOwners(nextRow) {
  const filled = [nextRow.primary_owner, nextRow.secondary_owner, nextRow.reviewer, nextRow.approver].filter(
    (v) => v && v !== UNASSIGNED
  );
  if (new Set(filled).size !== filled.length) {
    throw new Error("Mtu mmoja hawezi kubeba role zaidi ya moja kwenye ngazi moja.");
  }
}

function validateRequiredOwners(nextRow) {
  if (nextRow.primary_owner === UNASSIGNED) {
    throw new Error("Primary owner ni lazima achaguliwe.");
  }
  if (nextRow.approver === UNASSIGNED) {
    throw new Error("Approver ni lazima achaguliwe.");
  }
}

export async function assignLevelOwners(levelId, payload, actor = {}) {
  ensureAuthorized(actor);
  const current = resolveRow(levelId);
  if (current.is_locked) {
    throw new Error("Ngazi imefungwa; ifungue kwanza kabla ya kufanya assignment.");
  }

  const nextRow = {
    ...current,
    primary_owner: normalizeOwner(payload.primary_owner ?? current.primary_owner),
    secondary_owner: normalizeOwner(payload.secondary_owner ?? current.secondary_owner),
    reviewer: normalizeOwner(payload.reviewer ?? current.reviewer),
    approver: normalizeOwner(payload.approver ?? current.approver),
  };
  validateRequiredOwners(nextRow);
  validateUniqueOwners(nextRow);

  state.ownershipRows = state.ownershipRows.map((row) => {
    if (row.id !== levelId) return row;
    return {
      ...row,
      primary_owner: nextRow.primary_owner,
      secondary_owner: nextRow.secondary_owner,
      reviewer: nextRow.reviewer,
      approver: nextRow.approver,
      submission_status: "In Progress",
      approval_status: "Pending Review",
      assigned_date: now(),
      last_activity: now(),
    };
  });
  await writeAuditLog({
    ...actor,
    module: "role_assignment",
    action: "assign_level_owners",
    record: String(levelId),
    payload,
  });
}

export async function removeLevelAssignment(levelId, actor = {}) {
  ensureAuthorized(actor);
  const current = resolveRow(levelId);
  if (current.is_locked) {
    throw new Error("Ngazi imefungwa; ifungue kwanza kabla ya kuondoa assignment.");
  }

  state.ownershipRows = state.ownershipRows.map((row) => {
    if (row.id !== levelId) return row;
    return {
      ...row,
      primary_owner: UNASSIGNED,
      secondary_owner: UNASSIGNED,
      reviewer: UNASSIGNED,
      approver: UNASSIGNED,
      submission_status: "Not Submitted",
      approval_status: "Pending",
      assigned_date: "",
      last_activity: now(),
    };
  });
  await writeAuditLog({
    ...actor,
    module: "role_assignment",
    action: "remove_level_assignment",
    record: String(levelId),
  });
}

export async function lockLevel(levelId, isLocked = true, actor = {}) {
  ensureAuthorized(actor);
  resolveRow(levelId);
  state.ownershipRows = state.ownershipRows.map((row) => {
    if (row.id !== levelId) return row;
    return {
      ...row,
      is_locked: isLocked,
      approval_status: isLocked ? "Locked" : row.approval_status === "Locked" ? "Pending Review" : row.approval_status,
      last_activity: now(),
    };
  });
  await writeAuditLog({
    ...actor,
    module: "role_assignment",
    action: isLocked ? "lock_level" : "unlock_level",
    record: String(levelId),
  });
}
