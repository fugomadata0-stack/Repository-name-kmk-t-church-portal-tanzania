export function getSession() {
  try {
    const raw = localStorage.getItem("kmt_session");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function guardDashboard() {
  const session = getSession();
  if (!session) {
    window.location.href = "session-expired.html";
    return null;
  }
  return session;
}

export function exportCsv(filename, rows) {
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function logAudit({ module, action, description, status = "ok", actor = "System" }) {
  const entry = {
    date: new Date().toISOString(),
    actor,
    module,
    action,
    description,
    status,
    ip: "N/A-local",
    source: "dashboard-ui",
  };
  const raw = localStorage.getItem("kmt_audit_logs");
  const logs = raw ? JSON.parse(raw) : [];
  logs.unshift(entry);
  localStorage.setItem("kmt_audit_logs", JSON.stringify(logs.slice(0, 500)));
}
