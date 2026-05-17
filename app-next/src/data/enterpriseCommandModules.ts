import type { ModuleItem } from "../types";
import { getDashboardDefaultSubmodule } from "../lib/dashboardSubmodules";
import { ENTERPRISE_VIONGOZI_SUBMODULE } from "./portalModules";

export type EnterpriseCommandModule = {
  id: string;
  icon: string;
  label: string;
  description: string;
  portalModuleKey: string;
  defaultSubmodule?: string;
  submodules: string[];
  gradient: string;
  /** Grid span class for responsive layout (matches HTML step5) */
  gridClass: string;
};

/** Moduli za kifungo cha amri — zinapatana na portalModules (RBAC inatumika kwenye UI). */
export const ENTERPRISE_COMMAND_MODULES: EnterpriseCommandModule[] = [
  {
    id: "dashboard",
    icon: "📊",
    label: "Dashibodi Kuu",
    description: "Command center ya mfumo mzima: KPIs, alerts, approvals na shughuli za hivi karibuni.",
    portalModuleKey: "dashboard",
    defaultSubmodule: getDashboardDefaultSubmodule(),
    submodules: ["Injini ya Ngazi — Executive"],
    gradient: "linear-gradient(135deg,#061633,#2563eb)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "hierarchy",
    icon: "⛪",
    label: "Muundo wa Kanisa",
    description: "KMK(T) → Dayosisi → Jimbo → Tawi → Vituo; mti wa muundo na usajili wa ngazi.",
    portalModuleKey: "muundo",
    defaultSubmodule: "Injini ya Ngazi — Executive",
    submodules: [
      "Injini ya Ngazi — Executive",
      "KMK(T)",
      "Dayosisi",
      "Majimbo",
      "Matawi / Vituo",
      "Orodha ya Matawi / Vituo",
      "Orodha ya Dayosisi",
      "Orodha ya Majimbo",
      "Dashboard ya Tawi",
      "Hierarchy View",
    ],
    gradient: "linear-gradient(135deg,#064e3b,#10b981)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "members",
    icon: "👥",
    label: "Waumini & Familia",
    description: "Usajili wa waumini, familia, ubatizo, katekumeni, wageni na takwimu za KE/ME.",
    portalModuleKey: "waumini",
    defaultSubmodule: "Orodha ya Waumini",
    submodules: ["Members", "Families", "KE/ME", "Vijana", "Watoto"],
    gradient: "linear-gradient(135deg,#581c87,#7c3aed)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "leadership",
    icon: "👔",
    label: "Viongozi",
    description: "Profiles, CV, cheti, ripoti za viongozi kwa ngazi zote za kanisa.",
    portalModuleKey: "viongozi",
    defaultSubmodule: ENTERPRISE_VIONGOZI_SUBMODULE,
    submodules: ["Profiles", "CV", "Reports", "Status"],
    gradient: "linear-gradient(135deg,#7c2d12,#f59e0b)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "attendance",
    icon: "🙌",
    label: "Mahudhurio",
    description: "Mahudhurio ya wiki, mwezi na mwaka; wageni na ukuaji wa ibada.",
    portalModuleKey: "attendance",
    defaultSubmodule: "Sessions",
    submodules: ["Sessions", "Reports"],
    gradient: "linear-gradient(135deg,#0f766e,#06b6d4)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "finance",
    icon: "💰",
    label: "Fedha & Michango",
    description: "Zaka, sadaka, michango, bajeti, transfers na ripoti za fedha.",
    portalModuleKey: "fedha",
    defaultSubmodule: "Sadaka",
    submodules: ["Zaka", "Sadaka", "Michango", "Budget", "Reports"],
    gradient: "linear-gradient(135deg,#14532d,#22c55e)",
    gridClass: "col-span-2 md:col-span-4 xl:col-span-3",
  },
  {
    id: "jumuiya",
    icon: "🧩",
    label: "Jumuiya & Idara",
    description: "Idara 10 rasmi, JVKMK(T), JWKMK(T), kwaya na makundi ya huduma.",
    portalModuleKey: "jumuiya",
    defaultSubmodule: "Idara",
    submodules: ["Idara", "Maombi", "KE/ME", "Vijana", "Sunday School"],
    gradient: "linear-gradient(135deg,#991b1b,#f97316)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "trustees",
    icon: "🏛️",
    label: "Trustees & Legal",
    description: "Bodi ya wadhamini, utambulisho wa kisheria, sahihi na compliance.",
    portalModuleKey: "mipangilio",
    defaultSubmodule: "Church Identity",
    submodules: ["Trustees", "Legal Identity", "Seals", "Compliance"],
    gradient: "linear-gradient(135deg,#1e293b,#64748b)",
    gridClass: "col-span-2 md:col-span-4 xl:col-span-3",
  },
  {
    id: "assets",
    icon: "🏢",
    label: "Assets Registry",
    description: "Ardhi, majengo, magari, akaunti za benki na miradi ya mali.",
    portalModuleKey: "file_manager",
    defaultSubmodule: "Faili Zote",
    submodules: ["Land", "Buildings", "Bank", "Investments"],
    gradient: "linear-gradient(135deg,#312e81,#6366f1)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "reports",
    icon: "📑",
    label: "Ripoti & Analytics",
    description: "PDF, Excel, chati, trends na ripoti za uongozi na fedha.",
    portalModuleKey: "ripoti",
    defaultSubmodule: "Finance Reports",
    submodules: ["PDF", "Excel", "Charts", "Analytics"],
    gradient: "linear-gradient(135deg,#075985,#0ea5e9)",
    gridClass: "col-span-2 md:col-span-4 xl:col-span-3",
  },
  {
    id: "notifications",
    icon: "🔔",
    label: "Notifications",
    description: "Alerts, SMS, WhatsApp, barua pepe na workflow ya taarifa.",
    portalModuleKey: "notifications",
    defaultSubmodule: "Zote",
    submodules: ["Alerts", "SMS", "WhatsApp", "Workflow"],
    gradient: "linear-gradient(135deg,#92400e,#eab308)",
    gridClass: "col-span-2 md:col-span-3 xl:col-span-2",
  },
  {
    id: "security",
    icon: "🔐",
    label: "Usalama & Ruhusa",
    description: "RBAC, audit logs, roles, sessions na backup.",
    portalModuleKey: "usalama",
    defaultSubmodule: "Audit Logs",
    submodules: ["RBAC", "Audit", "Roles", "Backup"],
    gradient: "linear-gradient(135deg,#7f1d1d,#ef4444)",
    gridClass: "col-span-2 md:col-span-4 xl:col-span-3",
  },
];

export function resolveEnterpriseModulePortal(
  mod: EnterpriseCommandModule,
  modules: ModuleItem[]
): { moduleKey: string; submodule: string } | null {
  const item = modules.find((m) => m.key === mod.portalModuleKey);
  if (!item) return null;
  const sub =
    mod.defaultSubmodule && item.submodules.includes(mod.defaultSubmodule)
      ? mod.defaultSubmodule
      : item.submodules.find((s) => mod.submodules.includes(s)) ?? item.submodules[0] ?? getDashboardDefaultSubmodule();
  return { moduleKey: item.key, submodule: sub };
}
