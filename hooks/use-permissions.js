import { can } from "../phase30-role-access.js";
import { getCurrentRole } from "../services/auth-service.js";

export function usePermissions() {
  const role = getCurrentRole();
  return {
    role,
    canAdd: can(role, "add"),
    canEdit: can(role, "edit"),
    canDelete: can(role, "delete"),
    canClear: can(role, "clear"),
    canExport: can(role, "export"),
    canPrint: can(role, "print"),
    canView: can(role, "view"),
  };
}
