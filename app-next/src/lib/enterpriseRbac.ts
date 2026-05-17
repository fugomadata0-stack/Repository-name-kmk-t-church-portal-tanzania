import type { UserRole } from "../types";

/** Enterprise roles (Step 10) — canonical keys in portal_roles. */
export const ENTERPRISE_ROLE_KEYS = [
  "chief_admin",
  "national_admin",
  "dayosisi_admin",
  "jimbo_admin",
  "tawi_admin",
  "finance_admin",
  "auditor",
  "viewer",
] as const;

export type EnterpriseRoleKey = (typeof ENTERPRISE_ROLE_KEYS)[number];

export const ENTERPRISE_ROLE_LABELS: Record<EnterpriseRoleKey, { sw: string; en: string }> = {
  chief_admin: { sw: "Mkuu wa Utawala", en: "Chief Admin" },
  national_admin: { sw: "Msimamizi wa Kitaifa", en: "National Admin" },
  dayosisi_admin: { sw: "Msimamizi wa Dayosisi", en: "Diocese Admin" },
  jimbo_admin: { sw: "Msimamizi wa Jimbo", en: "Presbytery Admin" },
  tawi_admin: { sw: "Msimamizi wa Tawi", en: "Branch Admin" },
  finance_admin: { sw: "Msimamizi wa Fedha", en: "Finance Admin" },
  auditor: { sw: "Mkaguzi", en: "Auditor" },
  viewer: { sw: "Mtazamaji", en: "Viewer" },
};

/** Legacy / alias keys → canonical portal_roles.role_key */
const ROLE_ALIASES: Record<string, UserRole | EnterpriseRoleKey> = {
  diocese_admin: "dayosisi_admin",
};

const ENTERPRISE_SET = new Set<string>(ENTERPRISE_ROLE_KEYS);

/** Normalize role_key from DB/JWT (preserves super_admin etc.). */
export function normalizePortalRoleKey(roleKey: string | null | undefined): string {
  const k = String(roleKey ?? "").trim().toLowerCase();
  if (!k) return "viewer";
  const aliased = ROLE_ALIASES[k];
  if (aliased) return aliased;
  return k;
}

export function isEnterpriseRole(roleKey: string | null | undefined): boolean {
  return ENTERPRISE_SET.has(normalizePortalRoleKey(roleKey));
}

/** PostgREST / RLS error → user-facing Swahili hint */
export function mapRlsOrPermissionError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("permission denied") || m.includes("42501") || m.includes("pgrst301")) {
    return "Huna ruhusa (RLS). Wasiliana na msimamizi wa portal.";
  }
  if (m.includes("jwt") || m.includes("not authenticated") || m.includes("session")) {
    return "Kipindi kimeisha. Ingia tena.";
  }
  if (m.includes("row-level security") || m.includes("rls")) {
    return "Uhifadhi wa data umekataliwa na sera ya usalama.";
  }
  return message;
}
