import { useMemo } from "react";
import { usePortal } from "../context/PortalContext";
import {
  ENTERPRISE_ROLE_KEYS,
  ENTERPRISE_ROLE_LABELS,
  isEnterpriseRole,
  normalizePortalRoleKey,
  type EnterpriseRoleKey,
} from "../lib/enterpriseRbac";
import { matrixCanViewAuditLogs, matrixCanManagePortalSecurity } from "../utils/matrixPermissions";

export function useEnterpriseRbac() {
  const {
    role,
    portalProfile,
    matrixByModule,
    canPortalViewModule,
    canPortalEditModule,
    rbacLoading,
  } = usePortal();

  const roleKey = useMemo(
    () => normalizePortalRoleKey(portalProfile?.role_key ?? role),
    [portalProfile?.role_key, role],
  );

  const roleLabel = useMemo(() => {
    const ent = ENTERPRISE_ROLE_LABELS[roleKey as EnterpriseRoleKey];
    if (ent) return ent.sw;
    return portalProfile?.role_key ?? roleKey;
  }, [roleKey, portalProfile?.role_key]);

  return {
    roleKey,
    roleLabel,
    rbacLoading,
    isEnterpriseRole: isEnterpriseRole(roleKey),
    enterpriseRoles: ENTERPRISE_ROLE_KEYS,
    enterpriseRoleLabels: ENTERPRISE_ROLE_LABELS,
    canViewModule: canPortalViewModule,
    canEditModule: canPortalEditModule,
    canViewAuditLogs: matrixCanViewAuditLogs(matrixByModule),
    canManageSecurity: matrixCanManagePortalSecurity(matrixByModule),
  };
}
