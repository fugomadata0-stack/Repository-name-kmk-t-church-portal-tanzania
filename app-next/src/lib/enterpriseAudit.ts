export type AuditActionCategory =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "upload"
  | "export"
  | "download"
  | "login"
  | "other";

export const AUDIT_ACTION_CATEGORIES: AuditActionCategory[] = [
  "create",
  "update",
  "delete",
  "approve",
  "upload",
  "export",
  "download",
  "login",
  "other",
];

export const AUDIT_CATEGORY_LABELS: Record<AuditActionCategory, { sw: string; en: string }> = {
  create: { sw: "Unda", en: "Create" },
  update: { sw: "Sasisha", en: "Update" },
  delete: { sw: "Futa", en: "Delete" },
  approve: { sw: "Idhini", en: "Approve" },
  upload: { sw: "Pakia", en: "Upload" },
  export: { sw: "Hamisha nje", en: "Export" },
  download: { sw: "Pakua", en: "Download" },
  login: { sw: "Kuingia", en: "Login" },
  other: { sw: "Nyingine", en: "Other" },
};

/** Classify legacy/free-form action names into standard categories. */
export function inferAuditActionCategory(action: string): AuditActionCategory {
  const a = String(action ?? "").trim().toLowerCase();
  if (!a) return "other";
  if (/(^|_)(create|insert|add|new|signup|register)(_|$)/.test(a)) return "create";
  if (/(approve|idhini|verify|verified|reject|promote)/.test(a)) return "approve";
  if (/(delete|remove|drop)/.test(a)) return "delete";
  if (/upload|attach|pakua_up/.test(a)) return "upload";
  if (/download/.test(a) && !/upload/.test(a)) return "download";
  if (/(export|pdf|excel|print|hamisha)/.test(a)) return "export";
  if (/(login|logout|sign_in|sign_out|session|token)/.test(a)) return "login";
  if (/(update|edit|upsert|save|patch)/.test(a)) return "update";
  return "other";
}

/** Map DB table / entity keys to portal module keys for audit grouping. */
export function inferAuditModuleFromEntity(entity: string): string {
  const e = String(entity ?? "").trim().toLowerCase();
  if (!e) return "general";
  if (e.includes("member") || e.includes("waumini") || e.includes("family")) return "waumini";
  if (e.includes("contribution") || e.includes("michango") || e.includes("sadaka") || e.includes("zaka")) return "michango";
  if (e.includes("income") || e.includes("expense") || e.includes("fedha") || e.includes("finance") || e.includes("remittance")) return "fedha";
  if (e.includes("tawi") || e.includes("jimbo") || e.includes("dayosisi") || e.includes("structure") || e.includes("hierarchy") || e.includes("muundo")) return "muundo";
  if (e.includes("leadership") || e.includes("viongozi") || e.includes("credential") || e.includes("certificate")) return "viongozi";
  if (e.includes("project") || e.includes("taasisi")) return "taasisi";
  if (e.includes("upload") || e.includes("storage") || e.includes("document") || e.includes("file")) return "file_manager";
  if (e.includes("security") || e.includes("access_event") || e.includes("rbac") || e.includes("session")) return "usalama";
  if (e.includes("audit")) return "usalama";
  if (e.includes("signup") || e.includes("portal_directory")) return "usalama";
  if (e.includes("habari") || e.includes("news")) return "habari";
  if (e.includes("attendance") || e.includes("mahudhurio")) return "mahudhurio";
  if (e.includes("analytics") || e.includes("report") || e.includes("ripoti")) return "ripoti";
  if (e.includes("settings") || e.includes("branding") || e.includes("about")) return "settings";
  return "general";
}

/** Display timestamp in Tanzania locale from ISO string. */
export function formatAuditTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("sw-TZ", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
