import type { LeadershipRoleCatalogRow } from "../../services/leadershipCredentialsEngineService";

export type ExecutiveHierarchyLevel = "tawi" | "jimbo" | "dayosisi" | "national";

export const EXECUTIVE_HIERARCHY_LEVELS: { id: ExecutiveHierarchyLevel | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "Wote", emoji: "📋" },
  { id: "national", label: "KMK(T) Kitaifa", emoji: "👑" },
  { id: "dayosisi", label: "Dayosisi", emoji: "🏛️" },
  { id: "jimbo", label: "Jimbo", emoji: "⛪" },
  { id: "tawi", label: "Tawi", emoji: "🌿" },
];

export const JIMBO_LEADER_VARIANTS = ["Mchungaji", "Shemasi"] as const;

export function rolesForLevel(
  catalog: LeadershipRoleCatalogRow[],
  level: ExecutiveHierarchyLevel,
): LeadershipRoleCatalogRow[] {
  return catalog.filter((r) => r.level_key === level).sort((a, b) => a.sort_order - b.sort_order);
}

export function roleTitleForSlot(
  role: LeadershipRoleCatalogRow,
  jimboVariant?: string | null,
): string {
  if (role.role_key === "mkuu_wa_jimbo" && jimboVariant?.trim()) {
    return `${role.title_sw} (${jimboVariant.trim()})`;
  }
  return role.title_sw;
}
