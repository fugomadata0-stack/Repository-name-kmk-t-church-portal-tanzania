import type { PortalModuleMatrixRow } from "../types";

export type ModuleMatrixMap = Map<string, PortalModuleMatrixRow>;

function row(m: ModuleMatrixMap, moduleKey: string): PortalModuleMatrixRow | undefined {
  return m.get(moduleKey);
}

export function matrixCanView(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_view;
}

export function matrixCanCreate(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_create;
}

export function matrixCanEdit(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_edit;
}

export function matrixCanDelete(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_delete;
}

export function matrixCanExport(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_export;
}

export function matrixCanApprove(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_approve;
}

export function matrixCanReject(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_reject;
}

export function matrixCanPrint(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_print;
}

export function matrixCanUpload(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_upload;
}

export function matrixCanDownload(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_download;
}

export function matrixCanManageSettings(m: ModuleMatrixMap, moduleKey: string): boolean {
  return !!row(m, moduleKey)?.can_manage_settings;
}

/** Mipangilio / tovuti — branding, SEO, advanced */
export function matrixCanManageSiteAssets(m: ModuleMatrixMap): boolean {
  return !!row(m, "mipangilio")?.can_edit;
}

export function matrixCanPublishAbout(m: ModuleMatrixMap): boolean {
  return !!row(m, "mipangilio")?.can_edit;
}

/** Log za ukaguzi: usalama au fedha (can_audit) */
export function matrixCanViewAuditLogs(m: ModuleMatrixMap): boolean {
  return !!(row(m, "usalama")?.can_view || row(m, "fedha")?.can_audit);
}

export function matrixCanSubmitManualAuditLog(m: ModuleMatrixMap): boolean {
  return !!(row(m, "usalama")?.can_create || row(m, "usalama")?.can_edit);
}

/** Watumiaji, matrix, visibility, sessions */
export function matrixCanManagePortalSecurity(m: ModuleMatrixMap): boolean {
  return !!row(m, "usalama")?.can_edit;
}

/** Je, mtumiaji ana angalau moduli moja ya kuona? */
export function matrixHasAnyViewableModule(m: ModuleMatrixMap): boolean {
  for (const r of m.values()) {
    if (r.can_view) return true;
  }
  return false;
}
