import type { UserRole } from "../types";

const ALL_USER_ROLES: UserRole[] = [
  "super_admin",
  "chief_admin",
  "national_admin",
  "office_admin",
  "finance_admin",
  "secretary",
  "approver",
  "reviewer",
  "dayosisi_admin",
  "jimbo_admin",
  "tawi_admin",
  "viewer",
  "editor",
  "member_user",
];

const roleKeySet = new Set<string>(ALL_USER_ROLES);

/** Tumia role_key kutoka portal_directory_profiles; ikiwa si sahihi rudisha viewer. */
export function parsePortalUserRole(roleKey: string | null | undefined): UserRole {
  const k = String(roleKey ?? "").trim();
  if (roleKeySet.has(k)) return k as UserRole;
  return "viewer";
}

const fullAccessModules = new Set([
  "dashboard",
  "developer",
  "documents",
  "mahubiri",
  "events",
  "gallery",
  "habari",
  "video_library",
  "audio_library",
  "file_manager",
  "live_stream",
  "analytics",
  "ai_assistant",
  "notifications",
  "attendance",
  "muundo",
  "viongozi",
  "waumini",
  "jumuiya",
  "taasisi",
  "matukio",
  "machapisho",
  "nyaraka",
  "fedha",
  "mapato_income",
  "vyanzo_mapato",
  "ripoti",
  "communications",
  "mipangilio",
  "usalama",
  "super_admin",
  "aid_management",
]);

const limitedMap: Record<UserRole, string[]> = {
  super_admin: [...fullAccessModules],
  chief_admin: [...fullAccessModules].filter((m) => m !== "super_admin"),
  national_admin: [...fullAccessModules].filter((m) => m !== "super_admin" && m !== "usalama"),
  office_admin: [...fullAccessModules].filter((m) => m !== "super_admin" && m !== "usalama"),
  finance_admin: [
    "dashboard",
    "developer",
    "documents",
    "mahubiri",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "file_manager",
    "live_stream",
    "notifications",
    "fedha",
    "mapato_income",
    "vyanzo_mapato",
    "ripoti",
    "analytics",
    "communications",
    "nyaraka",
    "muundo",
    "aid_management",
  ],
  secretary: [
    "dashboard",
    "developer",
    "documents",
    "mahubiri",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "file_manager",
    "live_stream",
    "notifications",
    "waumini",
    "matukio",
    "communications",
    "nyaraka",
    "jumuiya",
    "machapisho",
    "muundo",
    "aid_management",
  ],
  approver: [
    "dashboard",
    "developer",
    "documents",
    "mahubiri",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "nyaraka",
    "fedha",
    "mapato_income",
    "ripoti",
    "analytics",
    "file_manager",
    "live_stream",
    "notifications",
    "communications",
    "aid_management",
  ],
  reviewer: [
    "dashboard",
    "ripoti",
    "analytics",
    "waumini",
    "viongozi",
    "muundo",
    "fedha",
    "mapato_income",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "file_manager",
    "live_stream",
    "notifications",
    "aid_management",
    "communications",
  ],
  dayosisi_admin: [
    "dashboard",
    "muundo",
    "viongozi",
    "waumini",
    "jumuiya",
    "matukio",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "fedha",
    "vyanzo_mapato",
    "ripoti",
    "analytics",
    "file_manager",
    "live_stream",
    "notifications",
    "communications",
    "aid_management",
  ],
  jimbo_admin: [
    "dashboard",
    "muundo",
    "viongozi",
    "waumini",
    "jumuiya",
    "matukio",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "fedha",
    "vyanzo_mapato",
    "ripoti",
    "analytics",
    "file_manager",
    "live_stream",
    "notifications",
    "aid_management",
  ],
  tawi_admin: [
    "dashboard",
    "muundo",
    "viongozi",
    "waumini",
    "jumuiya",
    "matukio",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "file_manager",
    "live_stream",
    "notifications",
    "aid_management",
  ],
  viewer: ["dashboard", "ripoti", "analytics", "events", "gallery", "habari", "video_library", "audio_library", "file_manager", "live_stream", "notifications", "aid_management", "communications"],
  editor: [
    "dashboard",
    "documents",
    "mahubiri",
    "events",
    "gallery",
    "habari",
    "video_library",
    "audio_library",
    "communications",
    "notifications",
  ],
  member_user: ["dashboard", "habari", "events", "mahubiri", "documents"],
};

export function canViewModule(role: UserRole, moduleKey: string) {
  return limitedMap[role]?.includes(moduleKey) ?? false;
}

export function canCreate(role: UserRole, moduleKey: string) {
  if (role === "viewer" || role === "reviewer" || role === "approver") return false;
  return canViewModule(role, moduleKey);
}

export function canEdit(role: UserRole, moduleKey: string) {
  if (["viewer", "reviewer", "tawi_admin"].includes(role)) return false;
  if (role === "approver") return ["nyaraka", "fedha", "mapato_income", "communications"].includes(moduleKey);
  return canViewModule(role, moduleKey);
}

export function canDelete(role: UserRole, moduleKey: string) {
  if (!["super_admin", "chief_admin", "national_admin"].includes(role)) return false;
  return canViewModule(role, moduleKey);
}

export function canExport(role: UserRole, moduleKey: string) {
  return canViewModule(role, moduleKey);
}

/** Chief Admin + Super Admin: full branding / site uploads */
export function canManageSiteAssets(role: UserRole) {
  return role === "super_admin" || role === "chief_admin";
}

export function canPublishAbout(role: UserRole) {
  return ["super_admin", "chief_admin", "national_admin", "office_admin"].includes(role);
}

/** Kuona log za kanisa (Audit Logs / Audit Trail) */
export function canViewAuditLogs(role: UserRole) {
  return ["super_admin", "chief_admin", "national_admin", "office_admin", "finance_admin", "approver", "reviewer"].includes(role);
}

/** Ingizo la log kwa mkono + kiambatisho */
export function canSubmitManualAuditLog(role: UserRole) {
  return ["super_admin", "chief_admin", "national_admin", "office_admin"].includes(role);
}

/** Mfumo wa RBAC, directory, visibility, sera (usalama wa hali ya juu) */
export function canManagePortalSecurity(role: UserRole) {
  return role === "super_admin" || role === "chief_admin";
}
