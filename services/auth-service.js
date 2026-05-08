import { canAccessRoute } from "../phase30-role-access.js";

export function getCurrentRole() {
  const raw = localStorage.getItem("kmt_session");
  if (!raw) return "member";
  try {
    const session = JSON.parse(raw);
    return session.role || "member";
  } catch (_) {
    return "member";
  }
}

export function guardRoute(requiredRoles = []) {
  const role = getCurrentRole();
  if (!canAccessRoute(role, requiredRoles)) {
    window.location.href = "unauthorized.html";
    return false;
  }
  return true;
}
