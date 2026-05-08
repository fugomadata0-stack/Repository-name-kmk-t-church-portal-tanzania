import { churchSystemLevels } from "../constants/workflow.constants.js";

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const nextId = () => Date.now() + Math.floor(Math.random() * 4567);

const statuses = [
  "Not Started",
  "Partially Completed",
  "Submitted",
  "Approved",
  "Incomplete",
  "Missing Required Fields",
  "Overdue",
  "Locked",
];

const rows = churchSystemLevels.slice(0, 7).map((level, i) => {
  const required = 15 + i;
  const done = Math.max(0, required - (6 - i));
  const percent = Math.round((done / required) * 100);
  return {
    id: nextId() + i,
    ngazi: level,
    jina_la_eneo: `${level} Area ${i + 1}`,
    mmiliki_wa_ngazi: i % 2 ? "ADMIN TEAM" : "FINANCE OFFICER",
    required_sections: required,
    completed_sections: done,
    completion_percent: percent,
    submission_status: percent > 70 ? "Submitted" : "In Progress",
    approval_status: percent > 84 ? "Approved" : "Pending",
    last_updated: now(),
    deadline: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
    status: statuses[i % statuses.length],
    missing_fields_count: Math.max(0, required - done),
    missing_documents_count: i % 4,
    late_submission: i > 4,
  };
});

export function getComplianceRows() {
  return [...rows];
}

export function getComplianceSummary() {
  return {
    completed_levels: rows.filter((r) => r.completion_percent >= 100).length,
    incomplete_levels: rows.filter((r) => r.status === "Incomplete" || r.status === "Missing Required Fields").length,
    submitted_levels: rows.filter((r) => r.submission_status === "Submitted").length,
    approved_levels: rows.filter((r) => r.approval_status === "Approved").length,
    pending_levels: rows.filter((r) => r.approval_status !== "Approved").length,
    overdue_levels: rows.filter((r) => r.late_submission).length,
  };
}
