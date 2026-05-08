import { workflowStatuses } from "../constants/workflow.constants.js";
import { writeAuditLog } from "./audit-trail-service.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const eventId = () => Date.now() + Math.floor(Math.random() * 1234);

const state = {
  records: [],
};

for (let i = 1; i <= 8; i += 1) {
  state.records.push({
    id: eventId() + i,
    module: i % 2 === 0 ? "Finance" : "Reports",
    level_name: i % 2 === 0 ? "Dayosisi Dar es Salaam" : "Jimbo Kati",
    status: i < 3 ? "Draft" : i < 5 ? "Submitted" : i < 7 ? "Under Review" : "Needs Correction",
    created_by: "SYSTEM",
    submitted_by: i > 3 ? "FINANCE OFFICER" : "-",
    reviewed_by: i > 5 ? "REVIEW TEAM" : "-",
    approved_by: "-",
    rejected_by: "-",
    last_updated_by: "SYSTEM",
    created_at: now(),
    submitted_at: i > 3 ? now() : "-",
    reviewed_at: i > 5 ? now() : "-",
    approved_at: "-",
    updated_at: now(),
    is_locked: false,
  });
}

export function getWorkflowRecords() {
  return [...state.records];
}

function normalizeFilterValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function applyWorkflowFilters(rows, filters = {}) {
  const moduleFilter = normalizeFilterValue(filters.module);
  const statusFilter = normalizeFilterValue(filters.status);
  const levelFilter = normalizeFilterValue(filters.level);
  const searchFilter = normalizeFilterValue(filters.search);

  return rows.filter((row) => {
    if (moduleFilter && moduleFilter !== "all" && normalizeFilterValue(row.module) !== moduleFilter) return false;
    if (statusFilter && statusFilter !== "all" && normalizeFilterValue(row.status) !== statusFilter) return false;
    if (levelFilter && levelFilter !== "all" && !normalizeFilterValue(row.level_name).includes(levelFilter)) return false;

    if (searchFilter) {
      const searchable = [row.module, row.level_name, row.status, row.submitted_by, row.reviewed_by, row.approved_by]
        .map((v) => normalizeFilterValue(v))
        .join(" ");
      if (!searchable.includes(searchFilter)) return false;
    }
    return true;
  });
}

export function getFilteredWorkflowRecords(filters = {}) {
  return applyWorkflowFilters(state.records, filters);
}

export function getWorkflowStatusOptions() {
  return [...workflowStatuses];
}

export function getApprovalDashboardSummary(filters = {}) {
  const rows = applyWorkflowFilters(state.records, filters);
  const isToday = (value) => String(value || "").slice(0, 10) === new Date().toISOString().slice(0, 10);
  return {
    total_records: rows.length,
    pending_submissions: rows.filter((r) => r.status === "Submitted" || r.status === "Under Review").length,
    submitted_today: rows.filter((r) => r.status === "Submitted" && isToday(r.submitted_at)).length,
    approved_today: rows.filter((r) => r.status === "Approved" && isToday(r.approved_at)).length,
    rejected_today: rows.filter((r) => r.status === "Rejected" && isToday(r.updated_at)).length,
    needs_correction: rows.filter((r) => r.status === "Needs Correction").length,
    overdue_submissions: rows.filter((r) => r.status === "In Progress").length,
  };
}

export async function updateWorkflowStatus(recordId, nextStatus, actor = {}) {
  if (!workflowStatuses.includes(nextStatus)) return;
  state.records = state.records.map((row) => {
    if (row.id !== recordId) return row;
    const updated = { ...row, status: nextStatus, last_updated_by: actor.user || "SYSTEM", updated_at: now() };
    if (nextStatus === "Submitted") updated.submitted_by = actor.user || "SYSTEM";
    if (nextStatus === "Submitted") updated.submitted_at = now();
    if (nextStatus === "Under Review") updated.reviewed_by = actor.user || "SYSTEM";
    if (nextStatus === "Under Review") updated.reviewed_at = now();
    if (nextStatus === "Approved") updated.approved_by = actor.user || "SYSTEM";
    if (nextStatus === "Approved") updated.approved_at = now();
    if (nextStatus === "Rejected") updated.rejected_by = actor.user || "SYSTEM";
    if (nextStatus === "Locked") updated.is_locked = true;
    return updated;
  });

  await writeAuditLog({
    ...actor,
    module: "workflow_engine",
    action: "update_workflow_status",
    record: String(recordId),
    payload: { nextStatus },
  });
}
