import {
  syncSuperAdminCommandCenter,
  getTopKpis,
  getSystemHealthCards,
  getServicesStatus,
  getModuleStatus,
  getErrorLogs,
  getPerformanceMetrics,
  getStorageUsage,
  getRealtimeStatus,
  getMaintenanceState,
  getOwnershipRows,
  getWorkflowRows,
  getFilteredWorkflowRows,
  getComplianceRows,
  getApprovalDashboardSummary,
  getComplianceSummary,
  getVisitorTrackingRows,
  getAuditRows,
  getFilteredAuditRows,
  assignOwnership,
  reassignOwnership,
  removeOwnership,
  toggleOwnershipLock,
  runWorkflowAction,
  generateReportCenterItem,
  getReportCenterRows,
  writeSystemAudit,
  resolveError,
  reopenError,
  clearError,
  clearAllErrors,
  refreshDashboardMetrics,
  recalculateSummaries,
  rerunReports,
  toggleMaintenanceMode,
  emergencyLogoutAllSessions,
  clearCachePlaceholder,
  rebuildIndexPlaceholder,
  backupTriggerPlaceholder,
  toggleDebugMode,
  panicLockdown,
  runDiagnostics,
} from "./phase17-super-admin-services.js";
import { clearIntegrationErrors, getIntegrationErrors, installGlobalCrashGuards } from "./phase-integration-core.js";

const el = (id) => document.getElementById(id);

const toast = (message) => {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = message;
  el("toastWrap").appendChild(d);
  setTimeout(() => d.remove(), 2600);
};

const badge = (text) => `<span class="status-badge">${text}</span>`;
const pickFirstOwnershipId = () => getOwnershipRows()?.[0]?.id || null;
const workflowFilters = { module: "all", status: "all", level: "", search: "" };
const auditFilters = { user: "", role: "", module: "", action: "", status: "all", search: "" };
const reportFilters = { reportType: "workflow_pending", format: "CSV", from: "", to: "", search: "" };
const reportPreviewState = { source: "fallback_local", rows: 0 };
let reportPreviewRequestId = 0;
let reportPreviewDebounceTimer = null;
let reportBusy = false;
const csv = (rows) => {
  if (!rows?.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
};
const download = (name, rows) => {
  const blob = new Blob([csv(rows)], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};
const norm = (value) => String(value || "").trim().toLowerCase();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function renderIntegrationAlerts() {
  const card = el("integrationAlertsCard");
  if (!card) return;
  const rows = getIntegrationErrors(10);
  if (!rows.length) {
    card.hidden = true;
    card.innerHTML = "";
    return;
  }
  card.hidden = false;
  card.innerHTML = `
    <div class="section-head">
      <h2>Vitishio vya muunganisho (hivi karibuni)</h2>
      <button type="button" class="btn tiny" data-action="clearIntegrationAlerts">Futa orodha</button>
    </div>
    <ul class="integration-alert-list">
      ${rows
        .map(
          (e) =>
            `<li><strong>${escapeHtml(e.action)}</strong> — ${escapeHtml(e.message)}<small>${escapeHtml(e.at)}</small></li>`
        )
        .join("")}
    </ul>
  `;
}

function renderTopKpis() {
  el("topKpis").innerHTML = getTopKpis()
    .map((k) => `<article class="kpi-card ${k.color || "blue"}"><h4>${k.label}</h4><p>${k.value}</p></article>`)
    .join("");
}

function renderHealthCards() {
  el("healthCards").innerHTML = getSystemHealthCards()
    .map((x) => `<article class="health-card ${x.color || "blue"}"><h4>${x.name}</h4><p>${x.status}</p><small>${x.detail}</small></article>`)
    .join("");
}

function renderServiceStatus() {
  el("servicesBody").innerHTML = getServicesStatus()
    .map(
      (r) => `<tr>
      <td>${r.service_name}</td><td>${badge(r.status)}</td><td>${r.latency_ms} ms</td><td>${r.uptime}</td>
      <td><button class="btn tiny" data-action="runDiagnostics">Check</button></td>
    </tr>`
    )
    .join("");
}

function renderModuleStatus() {
  el("moduleStatusBody").innerHTML = getModuleStatus()
    .map((r) => `<tr><td>${r.module_name}</td><td>${badge(r.status)}</td><td>${r.last_sync}</td><td>${r.coverage}</td></tr>`)
    .join("");
}

function renderErrorCenter() {
  const rows = getErrorLogs();
  el("errorBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
      <td>${r.timestamp}</td><td>${badge(r.severity)}</td><td>${r.module}</td><td>${r.error_type}</td><td>${r.message_preview}</td><td>${badge(r.status)}</td><td>${r.assigned_to}</td>
      <td class="actions"><button class="btn tiny" data-action="viewError" data-id="${r.id}">View</button><button class="btn tiny" data-action="resolveError" data-id="${r.id}">Resolve</button><button class="btn tiny" data-action="reopenError" data-id="${r.id}">Reopen</button><button class="btn tiny danger" data-action="clearError" data-id="${r.id}">Clear</button><button class="btn tiny" data-action="exportErrors">Export</button></td>
    </tr>`
        )
        .join("")
    : `<tr><td colspan="8"><div class="empty">Hakuna makosa ya kuonyesha sasa.</div></td></tr>`;
}

function renderPerformanceMetrics() {
  el("metricCards").innerHTML = getPerformanceMetrics()
    .map((m) => `<article class="metric-card"><h4>${m.metric_name}</h4><p>${m.metric_value}</p><small>${m.metric_status}</small></article>`)
    .join("");
}

function renderStorage() {
  el("storageBody").innerHTML = getStorageUsage()
    .map((s) => `<tr><td>${s.bucket}</td><td>${s.used}</td><td>${s.limit}</td><td>${s.growth}</td></tr>`)
    .join("");
}

function renderRealtime() {
  el("realtimeBody").innerHTML = getRealtimeStatus()
    .map((n) => `<tr><td>${n.node}</td><td>${n.connections}</td><td>${n.channel_health}</td><td>${badge(n.status)}</td></tr>`)
    .join("");
}

function renderMaintenance() {
  const m = getMaintenanceState();
  el("maintenanceCard").innerHTML = `
    <article class="kpi-card ${m.enabled ? "yellow" : "green"}"><h4>Maintenance</h4><p>${m.enabled ? "ON" : "OFF"}</p></article>
    <article class="kpi-card ${m.debugMode ? "purple" : "gray"}"><h4>Debug Mode</h4><p>${m.debugMode ? "ENABLED" : "DISABLED"}</p></article>
    <article class="kpi-card blue"><h4>Updated</h4><p>${m.updated_at}</p></article>
  `;
}

function renderOwnershipTable() {
  const rows = getOwnershipRows();
  el("ownershipBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.ngazi}</td><td>${r.jina_la_ngazi}</td><td>${r.primary_owner}</td><td>${r.secondary_owner}</td><td>${r.reviewer}</td><td>${r.approver}</td>
      <td>${badge(r.submission_status)}</td><td>${badge(r.approval_status)}</td><td>${r.last_activity}</td>
      <td class="actions">
        <button class="btn tiny" data-action="assignOwnership" data-id="${r.id}">Assign</button>
        <button class="btn tiny" data-action="reassignOwnership" data-id="${r.id}">Reassign</button>
        <button class="btn tiny" data-action="viewOwnership" data-id="${r.id}">View</button>
        <button class="btn tiny" data-action="editOwnership" data-id="${r.id}">Edit</button>
        <button class="btn tiny danger" data-action="removeOwnership" data-id="${r.id}">Remove</button>
        <button class="btn tiny" data-action="lockLevel" data-id="${r.id}">Lock</button>
        <button class="btn tiny" data-action="unlockLevel" data-id="${r.id}">Unlock</button>
        <button class="btn tiny" data-action="exportOwnership" data-id="${r.id}">Export</button>
        <button class="btn tiny" data-action="printOwnership" data-id="${r.id}">Print</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderWorkflowTable() {
  const rows = getFilteredWorkflowRows(workflowFilters);
  el("workflowBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.module}</td><td>${r.level_name}</td><td>${badge(r.status)}</td><td>${r.submitted_by}</td><td>${r.reviewed_by}</td><td>${r.approved_by}</td><td>${r.updated_at}</td>
      <td class="actions">
        <button class="btn tiny" data-action="workflowSubmit" data-id="${r.id}">Submit</button>
        <button class="btn tiny" data-action="workflowApprove" data-id="${r.id}">Approve</button>
        <button class="btn tiny danger" data-action="workflowReject" data-id="${r.id}">Reject</button>
        <button class="btn tiny" data-action="workflowCorrection" data-id="${r.id}">Correction</button>
      </td>
    </tr>`
    )
    .join("");
}

function renderComplianceTable() {
  const rows = getComplianceRows();
  el("complianceBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.ngazi}</td><td>${r.jina_la_eneo}</td><td>${r.mmiliki_wa_ngazi}</td><td>${r.required_sections}</td><td>${r.completed_sections}</td>
      <td><div class="progress"><span style="width:${r.completion_percent}%"></span></div> ${r.completion_percent}%</td>
      <td>${badge(r.submission_status)}</td><td>${badge(r.approval_status)}</td><td>${r.last_updated}</td><td>${r.deadline}</td><td>${badge(r.status)}</td>
      <td><button class="btn tiny" data-action="viewCompliance" data-id="${r.id}">View</button><button class="btn tiny" data-action="exportCompliance" data-id="${r.id}">Export</button></td>
    </tr>`
    )
    .join("");
}

function renderApprovalSummaryCards() {
  const a = getApprovalDashboardSummary(workflowFilters);
  const c = getComplianceSummary();
  const cards = [
    ["Filtered Records", a.total_records || 0, "blue"],
    ["Pending Submissions", a.pending_submissions, "yellow"],
    ["Submitted Today", a.submitted_today, "blue"],
    ["Approved Today", a.approved_today, "green"],
    ["Rejected Today", a.rejected_today, "red"],
    ["Needs Correction", a.needs_correction, "purple"],
    ["Overdue Submissions", a.overdue_submissions, "slate"],
    ["Completed Levels", c.completed_levels, "emerald"],
    ["Incomplete Levels", c.incomplete_levels, "red"],
    ["Approved Levels", c.approved_levels, "green"],
    ["Pending Levels", c.pending_levels, "yellow"],
  ];
  el("approvalSummaryCards").innerHTML = cards.map((k) => `<article class="kpi-card ${k[2]}"><h4>${k[0]}</h4><p>${k[1]}</p></article>`).join("");
}

function renderVisitorsTable() {
  const rows = getVisitorTrackingRows();
  el("visitorsBody").innerHTML = rows
    .map(
      (r) => `<tr><td>${r.jina}</td><td>${r.role}</td><td>${r.device}</td><td>${r.browser}</td><td>${r.current_page}</td><td>${r.login_time}</td><td>${r.last_seen}</td><td>${r.session_duration}</td><td>${badge(r.online_status)}</td><td>${r.location}</td><td><button class="btn tiny" data-action="viewSession">View</button></td></tr>`
    )
    .join("");
}

function renderAuditTable() {
  const rows = getFilteredAuditRows(auditFilters);
  el("auditBody").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr><td>${r.timestamp}</td><td>${r.user}</td><td>${r.role}</td><td>${r.module}</td><td>${r.action}</td><td>${r.record}</td><td>${badge(r.status)}</td><td>${r.device}</td><td>${r.location_placeholder}</td><td><button class="btn tiny" data-action="exportAudit">Export</button></td></tr>`
        )
        .join("")
    : `<tr><td colspan="10"><div class="empty">Hakuna audit logs kwa sasa.</div></td></tr>`;
}

function refreshAll() {
  renderIntegrationAlerts();
  renderTopKpis();
  renderHealthCards();
  renderServiceStatus();
  renderModuleStatus();
  renderErrorCenter();
  renderPerformanceMetrics();
  renderStorage();
  renderRealtime();
  renderMaintenance();
  renderApprovalSummaryCards();
  renderOwnershipTable();
  renderWorkflowTable();
  renderComplianceTable();
  renderVisitorsTable();
  renderAuditTable();
}

function collectWorkflowFilters() {
  workflowFilters.module = el("workflowFilterModule")?.value || "all";
  workflowFilters.status = el("workflowFilterStatus")?.value || "all";
  workflowFilters.level = el("workflowFilterLevel")?.value || "";
  workflowFilters.search = el("workflowFilterSearch")?.value || "";
}

function bindWorkflowFilterInputs() {
  const ids = ["workflowFilterModule", "workflowFilterStatus", "workflowFilterLevel", "workflowFilterSearch"];
  ids.forEach((id) => {
    const node = el(id);
    if (!node) return;
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => {
      collectWorkflowFilters();
      renderApprovalSummaryCards();
      renderWorkflowTable();
    });
  });
}

function collectAuditFilters() {
  auditFilters.user = el("auditFilterUser")?.value || "";
  auditFilters.role = el("auditFilterRole")?.value || "";
  auditFilters.module = el("auditFilterModule")?.value || "";
  auditFilters.action = el("auditFilterAction")?.value || "";
  auditFilters.status = el("auditFilterStatus")?.value || "all";
  auditFilters.search = el("auditFilterSearch")?.value || "";
}

function bindAuditFilterInputs() {
  const ids = ["auditFilterUser", "auditFilterRole", "auditFilterModule", "auditFilterAction", "auditFilterStatus", "auditFilterSearch"];
  ids.forEach((id) => {
    const node = el(id);
    if (!node) return;
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => {
      collectAuditFilters();
      renderAuditTable();
    });
  });
}

function collectReportFilters() {
  reportFilters.reportType = el("reportType")?.value || "workflow_pending";
  reportFilters.format = el("reportFormat")?.value || "CSV";
  reportFilters.from = el("reportFromDate")?.value || "";
  reportFilters.to = el("reportToDate")?.value || "";
  reportFilters.search = el("reportSearch")?.value || "";
}

function filterRowsByDateAndSearch(rows, timestampKey = "updated_at") {
  const fromDate = reportFilters.from ? new Date(`${reportFilters.from}T00:00:00`) : null;
  const toDate = reportFilters.to ? new Date(`${reportFilters.to}T23:59:59`) : null;
  const search = norm(reportFilters.search);
  return rows.filter((row) => {
    const rawDate = row[timestampKey] || row.timestamp || row.updated_at || row.last_updated;
    const rowDate = rawDate ? new Date(rawDate) : null;
    if (fromDate && rowDate && rowDate < fromDate) return false;
    if (toDate && rowDate && rowDate > toDate) return false;
    if (search) {
      const searchable = Object.values(row)
        .map((v) => norm(v))
        .join(" ");
      if (!searchable.includes(search)) return false;
    }
    return true;
  });
}

function buildReportPayload() {
  let rows = [];
  let reportLabel = "";
  if (reportFilters.reportType === "workflow_pending") {
    rows = getFilteredWorkflowRows({ ...workflowFilters, status: "Submitted" });
    reportLabel = "Orodha ya Pending";
  } else if (reportFilters.reportType === "workflow_approved") {
    rows = getFilteredWorkflowRows({ ...workflowFilters, status: "Approved" });
    reportLabel = "Orodha ya Approved";
  } else if (reportFilters.reportType === "workflow_rejected") {
    rows = getFilteredWorkflowRows({ ...workflowFilters, status: "Rejected" });
    reportLabel = "Orodha ya Rejected";
  } else if (reportFilters.reportType === "compliance_incomplete") {
    rows = getComplianceRows().filter((r) => ["Incomplete", "Missing Required Fields"].includes(r.status));
    reportLabel = "Orodha ya Incomplete Levels";
  } else if (reportFilters.reportType === "audit_logs") {
    rows = getFilteredAuditRows(auditFilters);
    reportLabel = "Orodha ya Activity Logs";
  }
  const filteredRows = filterRowsByDateAndSearch(rows);
  return { rows: filteredRows, reportLabel };
}

function renderReportPreview() {
  collectReportFilters();
  const preview = el("reportPreview");
  if (!preview) return;
  const { rows, reportLabel } = buildReportPayload();
  const sourceLabel = reportPreviewState.source === "supabase" ? "Supabase" : "Fallback Local";
  const loadingLine = reportPreviewState.loading ? `<br /><span class="preview-loading">Loading report data...</span>` : "";
  const errorLine = reportPreviewState.error ? `<br /><span class="preview-error">${reportPreviewState.error}</span>` : "";
  const updatedAt = new Date().toLocaleString();
  const rowsCount = reportPreviewState.rows || rows.length;
  const emptyLine = rowsCount === 0 ? `<br /><span class="preview-empty">Hakuna data kwa filters hizi.</span>` : "";
  preview.innerHTML = `<strong>${reportLabel}</strong><br />Rows: ${rowsCount}<br />Format: ${reportFilters.format}<br />Date Range: ${reportFilters.from || "-"} mpaka ${reportFilters.to || "-"}<br />Source: ${sourceLabel}<br />Updated: ${updatedAt}${emptyLine}${loadingLine}${errorLine}`;
  syncReportActionButtons();
}

function syncReportActionButtons() {
  const isDisabled = !!reportBusy || !!reportPreviewState.loading;
  ["previewReport", "generateReportCenter", "clearReportFilters"].forEach((action) => {
    const btn = document.querySelector(`[data-action="${action}"]`);
    if (!btn) return;
    btn.disabled = isDisabled;
    btn.style.opacity = isDisabled ? "0.65" : "1";
    btn.style.cursor = isDisabled ? "not-allowed" : "pointer";
  });
}

async function refreshReportPreviewAsync() {
  const requestId = ++reportPreviewRequestId;
  collectReportFilters();
  const preview = el("reportPreview");
  if (!preview) return;
  reportPreviewState.loading = true;
  reportPreviewState.error = "";
  renderReportPreview();

  const { rows: localRows } = buildReportPayload();
  try {
    const result = await getReportCenterRows(
      reportFilters.reportType,
      {
        from: reportFilters.from,
        to: reportFilters.to,
        search: reportFilters.search,
      },
      localRows
    );
    if (requestId !== reportPreviewRequestId) return;
    reportPreviewState.source = result?.source || "fallback_local";
    reportPreviewState.rows = (result?.rows || localRows).length;
  } catch (_) {
    if (requestId !== reportPreviewRequestId) return;
    reportPreviewState.source = "fallback_local";
    reportPreviewState.rows = localRows.length;
    reportPreviewState.error = "Imeshindwa kupata live data, inaonyesha fallback.";
  } finally {
    if (requestId !== reportPreviewRequestId) return;
    reportPreviewState.loading = false;
  }
  renderReportPreview();
}

function bindReportFilterInputs() {
  const ids = ["reportType", "reportFormat", "reportFromDate", "reportToDate", "reportSearch"];
  ids.forEach((id) => {
    const node = el(id);
    if (!node) return;
    const eventName = node.tagName === "SELECT" ? "change" : "input";
    node.addEventListener(eventName, () => {
      clearTimeout(reportPreviewDebounceTimer);
      reportPreviewDebounceTimer = setTimeout(() => {
        refreshReportPreviewAsync();
      }, 260);
    });
  });
}

function bindEvents() {
  document.body.addEventListener("click", async (e) => {
    const action = e.target.dataset.action;
    const id = Number(e.target.dataset.id);
    if (!action) return;

    if (action === "resolveError" && id) {
      await resolveError(id);
      refreshAll();
      toast("Error imeresolve.");
    }
    if (action === "reopenError" && id) {
      await reopenError(id);
      refreshAll();
      toast("Error imefunguliwa tena.");
    }
    if (action === "clearError" && id) {
      await clearError(id);
      refreshAll();
      toast("Error imeondolewa.");
    }
    if (action === "clearErrors") {
      await clearAllErrors();
      refreshAll();
      toast("Error Center imefutwa.");
    }
    if (action === "viewError") toast("Detail: Error imefunguliwa.");
    if (action === "exportErrors") {
      download("error-center", getErrorLogs());
      toast("Error list ime-export.");
    }

    if (action === "clearIntegrationAlerts") {
      clearIntegrationErrors();
      renderIntegrationAlerts();
      toast("Orodha ya makosa ya muunganisho imefutwa.");
    }
    if (action === "batchRefreshParallel") {
      try {
        await Promise.all([refreshDashboardMetrics(), refreshReportPreviewAsync()]);
        refreshAll();
        toast("Sawisho la pamoja limekamilika (dashboard + ripoti, parallel).");
      } catch (_) {
        refreshAll();
        toast("Sawisho la pamoja limekwama sehemu; angalia kadi ya muunganisho.");
      }
    }
    if (action === "refreshDashboardMetrics") {
      await refreshDashboardMetrics();
      refreshAll();
      toast("Dashboard metrics zime-refresh.");
    }
    if (action === "openLiveValidation") {
      window.location.href = "live-validation-center.html";
    }
    if (action === "openSystemHealth") {
      window.location.href = "system-health.html";
    }
    if (action === "openQuickTest") {
      window.location.href = "quick-system-test.html";
    }
    if (action === "openDocsWorkflow") {
      window.location.href = "documents-approval-workflow.html";
    }
    if (action === "recalculateSummaries") {
      await recalculateSummaries();
      toast("Summaries zinahesabiwa upya.");
    }
    if (action === "rerunReports") {
      await rerunReports();
      toast("Report jobs zimeanzishwa upya.");
    }
    if (action === "toggleMaintenance") {
      await toggleMaintenanceMode();
      refreshAll();
      toast("Maintenance mode imebadilishwa.");
    }
    if (action === "emergencyLogout") {
      await emergencyLogoutAllSessions();
      toast("Emergency logout ime-trigger.");
    }
    if (action === "clearCache") {
      await clearCachePlaceholder();
      toast("Clear cache placeholder imetekelezwa.");
    }
    if (action === "rebuildIndex") {
      await rebuildIndexPlaceholder();
      toast("Rebuild index placeholder imetekelezwa.");
    }
    if (action === "backupTrigger") {
      await backupTriggerPlaceholder();
      toast("Backup trigger placeholder imeanzishwa.");
    }
    if (action === "toggleDebugMode") {
      await toggleDebugMode();
      refreshAll();
      toast("Debug mode imebadilishwa.");
    }
    if (action === "panicLockdown") {
      await panicLockdown();
      refreshAll();
      toast("Panic lockdown imewashwa.");
    }
    if (action === "runDiagnostics") {
      await runDiagnostics();
      toast("Diagnostics imekimbia.");
    }
    if (action === "assignOwnership") {
      const rowId = id || pickFirstOwnershipId();
      if (!rowId) return toast("Hakuna row ya ku-assign.");
      try {
        await assignOwnership(
          rowId,
          { primary_owner: "PRIMARY OWNER", secondary_owner: "ASSISTANT OWNER", reviewer: "REVIEW TEAM", approver: "CHIEF ADMIN" },
          { user: "SUPER ADMIN", role: "super_admin" }
        );
        await writeSystemAudit({ user: "SUPER ADMIN", role: "super_admin", module: "role_assignment", action: "assign", record: String(rowId) });
        refreshAll();
        toast("Umiliki wa ngazi umewekwa.");
      } catch (error) {
        toast(error?.message || "Assignment imeshindikana.");
      }
    }
    if (action === "reassignOwnership" && id) {
      try {
        await reassignOwnership(
          id,
          { primary_owner: "REASSIGNED OWNER", secondary_owner: "ASSISTANT OWNER", reviewer: "REVIEW TEAM", approver: "CHIEF ADMIN" },
          { user: "SUPER ADMIN", role: "super_admin" }
        );
        refreshAll();
        toast("Umiliki umehamishwa.");
      } catch (error) {
        toast(error?.message || "Reassignment imeshindikana.");
      }
    }
    if (action === "removeOwnership" && id) {
      try {
        await removeOwnership(id, { user: "SUPER ADMIN", role: "super_admin" });
        refreshAll();
        toast("Assignment imeondolewa.");
      } catch (error) {
        toast(error?.message || "Kuondoa assignment kumeshindikana.");
      }
    }
    if (action === "lockLevel" && id) {
      try {
        await toggleOwnershipLock(id, true, { user: "SUPER ADMIN", role: "super_admin" });
        refreshAll();
        toast("Ngazi imefungwa.");
      } catch (error) {
        toast(error?.message || "Kufunga ngazi kumeshindikana.");
      }
    }
    if (action === "unlockLevel" && id) {
      try {
        await toggleOwnershipLock(id, false, { user: "SUPER ADMIN", role: "super_admin" });
        refreshAll();
        toast("Ngazi imefunguliwa.");
      } catch (error) {
        toast(error?.message || "Kufungua ngazi kumeshindikana.");
      }
    }
    if (action === "workflowSubmit" && id) {
      await runWorkflowAction(id, "submit", { user: "LEVEL OWNER", role: "module_owner" });
      refreshAll();
    }
    if (action === "workflowApprove" && id) {
      await runWorkflowAction(id, "approve", { user: "CHIEF ADMIN", role: "chief_admin" });
      refreshAll();
    }
    if (action === "workflowReject" && id) {
      await runWorkflowAction(id, "reject", { user: "CHIEF ADMIN", role: "chief_admin" });
      refreshAll();
    }
    if (action === "workflowCorrection" && id) {
      await runWorkflowAction(id, "correction", { user: "REVIEWER", role: "reviewer" });
      refreshAll();
    }
    if (action === "clearWorkflowFilters") {
      if (el("workflowFilterModule")) el("workflowFilterModule").value = "all";
      if (el("workflowFilterStatus")) el("workflowFilterStatus").value = "all";
      if (el("workflowFilterLevel")) el("workflowFilterLevel").value = "";
      if (el("workflowFilterSearch")) el("workflowFilterSearch").value = "";
      collectWorkflowFilters();
      renderApprovalSummaryCards();
      renderWorkflowTable();
      toast("Workflow filters zimefutwa.");
    }
    if (action === "exportWorkflowFiltered") {
      collectWorkflowFilters();
      download("workflow-filtered", getFilteredWorkflowRows(workflowFilters));
      toast("Workflow filtered list ime-export.");
    }
    if (action === "previewReport") {
      await refreshReportPreviewAsync();
      toast("Preview ya report imeboreshwa.");
    }
    if (action === "clearReportFilters") {
      if (el("reportType")) el("reportType").value = "workflow_pending";
      if (el("reportFormat")) el("reportFormat").value = "CSV";
      if (el("reportFromDate")) el("reportFromDate").value = "";
      if (el("reportToDate")) el("reportToDate").value = "";
      if (el("reportSearch")) el("reportSearch").value = "";
      collectReportFilters();
      await refreshReportPreviewAsync();
      toast("Report filters zimefutwa.");
    }
    if (action === "generateReportCenter") {
      collectReportFilters();
      reportBusy = true;
      reportPreviewState.error = "";
      reportPreviewState.loading = true;
      renderReportPreview();
      const { rows: localRows, reportLabel } = buildReportPayload();
      try {
        const result = await getReportCenterRows(
          reportFilters.reportType,
          {
            from: reportFilters.from,
            to: reportFilters.to,
            search: reportFilters.search,
          },
          localRows
        );
        const rows = result?.rows || localRows;
        reportPreviewState.source = result?.source || "fallback_local";
        reportPreviewState.rows = rows.length;
        reportPreviewState.loading = false;
        const out = generateReportCenterItem(reportFilters.format, reportLabel, {
          generated_by: "SUPER ADMIN",
          from: reportFilters.from,
          to: reportFilters.to,
          search: reportFilters.search,
        });
        if (reportFilters.format === "Print") {
          window.print();
        } else {
          download(`report-${reportFilters.reportType}-${reportFilters.format.toLowerCase()}`, rows);
        }
        await refreshReportPreviewAsync();
        toast(`Ripoti iko tayari: ${out.reportType} (${out.format}) • Rows ${rows.length}`);
      } catch (_) {
        reportPreviewState.loading = false;
        reportPreviewState.error = "Report generation imeshindikana. Jaribu tena.";
        renderReportPreview();
        toast("Report generation imeshindikana.");
      } finally {
        reportBusy = false;
        syncReportActionButtons();
      }
    }
    if (action === "viewOwnership" && id) {
      const row = getOwnershipRows().find((x) => x.id === id);
      if (row) toast(`${row.ngazi}: ${row.primary_owner} / ${row.secondary_owner}`);
    }
    if (action === "editOwnership" && id) {
      try {
        await reassignOwnership(
          id,
          { primary_owner: "UPDATED OWNER", secondary_owner: "UPDATED ASSISTANT", reviewer: "REVIEW TEAM", approver: "CHIEF ADMIN" },
          { user: "SUPER ADMIN", role: "super_admin" }
        );
        refreshAll();
        toast("Ownership imehaririwa.");
      } catch (error) {
        toast(error?.message || "Ownership edit imeshindikana.");
      }
    }
    if (action === "exportOwnership") {
      download("jedwali-wamiliki-ngazi", getOwnershipRows());
      toast("Jedwali la umiliki lime-export.");
    }
    if (action === "printOwnership") window.print();
    if (action === "viewCompliance" && id) {
      const row = getComplianceRows().find((x) => x.id === id);
      if (row) toast(`${row.ngazi}: ${row.completion_percent}% complete, missing fields ${row.missing_fields_count}`);
    }
    if (action === "exportCompliance") {
      download("ufuatiliaji-ukamilifu-ngazi", getComplianceRows());
      toast("Compliance table ime-export.");
    }
    if (action === "viewSession") toast("Session details drawer ready.");
    if (action === "exportAudit") {
      download("audit-logs", getAuditRows());
      toast("Audit logs zime-export.");
    }
    if (action === "clearAuditFilters") {
      if (el("auditFilterUser")) el("auditFilterUser").value = "";
      if (el("auditFilterRole")) el("auditFilterRole").value = "";
      if (el("auditFilterModule")) el("auditFilterModule").value = "";
      if (el("auditFilterAction")) el("auditFilterAction").value = "";
      if (el("auditFilterStatus")) el("auditFilterStatus").value = "all";
      if (el("auditFilterSearch")) el("auditFilterSearch").value = "";
      collectAuditFilters();
      renderAuditTable();
      toast("Audit filters zimefutwa.");
    }
    if (action === "exportAuditFiltered") {
      collectAuditFilters();
      download("audit-logs-filtered", getFilteredAuditRows(auditFilters));
      toast("Audit filtered logs zime-export.");
    }
  });
}

async function init() {
  installGlobalCrashGuards("phase17_super_admin_control");
  bindEvents();
  bindWorkflowFilterInputs();
  bindAuditFilterInputs();
  bindReportFilterInputs();
  collectWorkflowFilters();
  collectAuditFilters();
  collectReportFilters();
  try {
    await Promise.all([syncSuperAdminCommandCenter(), refreshReportPreviewAsync()]);
  } catch (_) {
    toast("Sehemu ya load ya kwanza imekwama; data ya ndani bado inapatikana.");
  }
  refreshAll();
}

init();
