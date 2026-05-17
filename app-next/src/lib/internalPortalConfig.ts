/** Submodule identifiers — mfumo wa ndani (authenticated portal). */

export const DASHBOARD_EXECUTIVE_SUBMODULE = "Injini ya Ngazi — Executive";
export const DASHBOARD_COMMAND_CENTER_SUBMODULE = "Kituo cha Amri (Internal)";
export const DASHBOARD_PENDING_APPROVALS_SUBMODULE = "Vibali vinavyosubiri";

export const INTERNAL_RIPOTI_LINKS: Record<
  string,
  { moduleKey: string; submodule: string; description: string }
> = {
  "Leadership Reports": {
    moduleKey: "viongozi",
    submodule: "Cheti & CV — Injini ya Ngazi Kuu",
    description: "Cheti, CV na nyaraka za uongozi — PDF na uhakiki.",
  },
  "Membership Reports": {
    moduleKey: "waumini",
    submodule: "Takwimu za Uanachama",
    description: "Takwimu za waumini, familia na uanachama.",
  },
  "Finance Reports": {
    moduleKey: "fedha",
    submodule: "Financial Reports",
    description: "Mapato, matumizi na ripoti za fedha.",
  },
  "Events Reports": {
    moduleKey: "events",
    submodule: "Events",
    description: "Matukio, kalenda na ripoti za shughuli.",
  },
  "Export Center": {
    moduleKey: "ripoti",
    submodule: "Print & PDF Master",
    description: "Hamisha nje PDF/Excel — injini ya Print & PDF Master.",
  },
  "KPI Executive (Ngazi)": {
    moduleKey: "ripoti",
    submodule: "KPI Executive (Ngazi)",
    description: "KPI za ngazi zote — dashibodi ya uongozi.",
  },
};
