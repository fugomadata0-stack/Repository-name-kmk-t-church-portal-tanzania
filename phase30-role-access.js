export const GLOBAL_ROLES = [
  "super_admin",
  "admin",
  "askofu_mkuu",
  "askofu_dayosisi",
  "mchungaji",
  "kiongozi_idara",
  "finance_officer",
  "media_admin",
  "member",
];

export const ROLE_SCOPE = {
  super_admin: "national",
  admin: "national",
  askofu_mkuu: "national",
  askofu_dayosisi: "dayosisi",
  mchungaji: "jimbo_tawi",
  kiongozi_idara: "tawi",
  finance_officer: "dayosisi",
  media_admin: "dayosisi",
  member: "self",
};

export const PERMISSIONS = {
  sidebarVisibility: {
    super_admin: "all",
    admin: "all",
    askofu_mkuu: "all",
    askofu_dayosisi: "dayosisi_and_below",
    mchungaji: "jimbo_and_below",
    kiongozi_idara: "assigned_modules",
    finance_officer: "finance_and_related",
    media_admin: "media_and_related",
    member: "member_view",
  },
  actions: {
    add: ["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji"],
    edit: ["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara"],
    delete: ["super_admin", "admin"],
    clear: ["super_admin", "admin"],
    export: ["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "finance_officer", "media_admin"],
    print: ["super_admin", "admin", "askofu_mkuu", "askofu_dayosisi", "mchungaji", "kiongozi_idara", "finance_officer", "media_admin"],
    view: GLOBAL_ROLES,
  },
};

export function can(role, action) {
  const allowed = PERMISSIONS.actions[action] || [];
  return allowed.includes(role);
}

export function canAccessRoute(role, requiredRoles = []) {
  if (!requiredRoles.length) return true;
  return requiredRoles.includes(role);
}

export function getUnauthorizedMessage(role) {
  return `Role ${role || "unknown"} haina ruhusa kwa ukurasa huu.`;
}
