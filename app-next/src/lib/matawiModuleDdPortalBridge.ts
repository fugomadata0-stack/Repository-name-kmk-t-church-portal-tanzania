/** Ramani ya module IDs kutoka MATAWI MODULE DD.html → moduli za portal. */
export type MatawiDdPortalLink = {
  moduleKey: string;
  submodule?: string;
};

export const MATAWI_DD_PORTAL_LINKS: Record<string, MatawiDdPortalLink> = {
  registration: { moduleKey: "muundo", submodule: "Orodha ya Matawi / Vituo" },
  leaders: { moduleKey: "viongozi", submodule: "Viongozi wa Matawi/Vituo" },
  members: { moduleKey: "waumini", submodule: "Orodha ya Waumini" },
  attendance: { moduleKey: "attendance", submodule: "Sessions" },
  departments: { moduleKey: "jumuiya" },
  contributionForms: { moduleKey: "mapato_income" },
  finance: { moduleKey: "fedha" },
  projects: { moduleKey: "mapato_income", submodule: "Mapato ya Miradi na Uwekezaji" },
  notifications: { moduleKey: "notifications" },
  smswhatsapp: { moduleKey: "communications" },
  idcards: { moduleKey: "waumini", submodule: "Member Profiles" },
  smartdetect: { moduleKey: "analytics" },
  executive: { moduleKey: "muundo", submodule: "Injini ya Ngazi — Executive" },
  approval: { moduleKey: "dashboard", submodule: "Vibali vinavyosubiri" },
  publicmode: { moduleKey: "mipangilio", submodule: "SEO & Umma" },
  certificates: { moduleKey: "mipangilio", submodule: "Master Settings Center" },
  security: { moduleKey: "usalama" },
};

export const MATAWI_DD_NAVIGATE_EVENT = "kmt-matawi-dd-navigate" as const;
export const MATAWI_DD_READY_EVENT = "kmt-matawi-dd-ready" as const;
export const MATAWI_DD_SAVE_EVENT = "kmt-matawi-dd-save" as const;
export const MATAWI_DD_LOAD_EVENT = "kmt-matawi-dd-load" as const;
export const MATAWI_DD_CLEAR_EVENT = "kmt-matawi-dd-clear" as const;
export const MATAWI_DD_DATA_EVENT = "kmt-matawi-dd-data" as const;
export const MATAWI_DD_SAVED_EVENT = "kmt-matawi-dd-saved" as const;
export const MATAWI_DD_ERROR_EVENT = "kmt-matawi-dd-error" as const;
export const MATAWI_DD_KPIS_EVENT = "kmt-matawi-dd-kpis" as const;
export const MATAWI_DD_REFRESH_KPIS_EVENT = "kmt-matawi-dd-refresh-kpis" as const;
export const MATAWI_DD_UPLOAD_EVENT = "kmt-matawi-dd-upload" as const;
export const MATAWI_DD_UPLOADED_EVENT = "kmt-matawi-dd-uploaded" as const;
export const MATAWI_DD_ACK_EVENT = "kmt-matawi-dd-ack" as const;
