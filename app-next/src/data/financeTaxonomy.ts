import type { PortalCategoryItem } from "../types";

/** Makundi kuu ya Mapato / Income — kuendana na moduli ya portal (zaidi ya 10). */
export const INCOME_MAIN_CATEGORY_FILTERS: readonly string[] = [
  "Sadaka za Kawaida",
  "Michango ya Wajibu",
  "Matoleo ya Makusudi",
  "Mapato ya Idara na Vikundi",
  "Mapato ya Matukio / Events Income",
  "Mapato ya Miradi na Uwekezaji",
  "Ruzuku, Misaada na Donations",
  "Mapato Mengineyo",
  "Taarifa ya Msingi wa Ibada",
  "Mapato ya Kawaida",
  "Mapato ya Makusudi",
  "Mapato ya Vikundi na Idara",
  "Miradi na Uwekezaji",
  "Huduma za Kiufundi",
  "Mengineyo / Haijabainishwa",
] as const;

/** Kategoria za chanzo kwa miamala ya fedha (church_finance_entries) — defaults zinaweza kuunganishwa na za mfumo. */
export const DEFAULT_FINANCE_ENTRY_KATEGORIA: readonly string[] = [
  "Sadaka ya Jumapili",
  "Sadaka ya Kesha",
  "Zaka",
  "Meza ya Bwana",
  "Ahadi / Nadhiri",
  "Michango ya Ujenzi",
  "Michango ya Miradi",
  "Ada au ada za huduma",
  "Miradi ya Jamii",
  "Matumizi ya Ofisi",
  "Malipo ya Wafanyakazi",
  "Umeme / Maji",
  "Matengenezo",
  "Usafiri wa Huduma",
  "Ukarimu / Guest",
  "Ruzuku",
  "Mechi / Matukio",
  "Nyingine",
] as const;

/** Ngazi za kanisa kwa miamala — zaidi ya 10 ikiwa zimejumuisha ALL kwa filters. */
export const CHURCH_LEVEL_OPTIONS: readonly string[] = [
  "Makao Makuu",
  "Dayosisi",
  "Jimbo",
  "Tawi",
  "Kituo",
  "Idara",
  "Taasisi",
  "Ulimwengu / Outreach",
  "Onlaini",
  "Maeneo Maalum",
  "Nyingine",
] as const;

/** Hali za kiteknolojia za miamala */
export const FINANCE_WORKFLOW_STATUSES: readonly string[] = [
  "Active",
  "Pending",
  "Draft",
  "Submitted",
  "Verified",
  "Approved",
  "Posted to Ledger",
  "Locked",
  "Inactive",
  "Needs Review",
  "Reversed / Cancelled",
] as const;

export function mergeCategoryStrings(
  ...sources: (readonly string[] | string[] | PortalCategoryItem[] | undefined)[]
): string[] {
  const set = new Set<string>();
  for (const src of sources) {
    if (!src) continue;
    for (const item of src) {
      if (typeof item === "string") {
        const t = item.trim();
        if (t) set.add(t);
      } else if (item && typeof item === "object" && "name" in item) {
        const t = String(item.name ?? "").trim();
        if (t) set.add(t);
      }
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "sw"));
}

/** Vitufe vya filter vya mapato_income: ALL + makundi ya mfumo + za mtumiaji */
export function buildIncomeCategoryFilterTabs(siteCategories: PortalCategoryItem[]): string[] {
  const custom = siteCategories.map((c) => c.name.trim()).filter(Boolean);
  return mergeCategoryStrings(["ALL"], [...INCOME_MAIN_CATEGORY_FILTERS], custom);
}
