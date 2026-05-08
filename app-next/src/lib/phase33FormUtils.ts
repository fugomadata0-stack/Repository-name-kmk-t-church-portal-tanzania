/** Kutoka phase33-dynamic-signup-main.js — domo la unit na scope */

export function requestedScopeFromPayload(role: string, payload: Record<string, string>): string {
  if (role.includes("Diocese")) return "Diocese";
  if (role.includes("Jimbo")) return "Jimbo";
  if (role.includes("Branch")) return "Branch";
  return (
    payload.departmentLevel ||
    payload.fellowshipLevel ||
    payload.choirLevel ||
    payload.mediaLevel ||
    payload.viewerScope ||
    payload.eventLevel ||
    "General"
  );
}

export function unitFromPayload(payload: Record<string, string>): string {
  return (
    payload.branch ||
    payload.viewerBranch ||
    payload.mediaBranch ||
    payload.eventBranch ||
    payload.jimbo ||
    payload.viewerJimbo ||
    payload.diocese ||
    payload.department ||
    payload.institution ||
    "-"
  );
}

export function needsVerificationFlag(payload: Record<string, string>): string {
  const hasNewArea = Object.values(payload).some((v) => String(v || "").toLowerCase().includes("eneo jipya"));
  return hasNewArea ? "Needs Verification" : "";
}
