import type { KiongoziRecord } from "../../types";
import type { LeadershipHierarchyLevel } from "./types";

export function resolveHierarchyLevelFromLeader(leader: KiongoziRecord): LeadershipHierarchyLevel {
  const hay = `${leader.leadership_level ?? ""} ${leader.ngazi ?? ""} ${leader.assigned_entity ?? ""}`.toLowerCase();
  if (/\b(kitaifa|national|mkuu wa kanisa|makao makuu)\b/.test(hay)) return "national";
  if (/\bdayosisi\b/.test(hay) || Boolean(leader.dayosisi?.trim())) return "dayosisi";
  if (/\bjimbo\b/.test(hay) || Boolean(leader.jimbo?.trim())) return "jimbo";
  if (/\b(tawi|kituo)\b/.test(hay) || Boolean(leader.tawi?.trim())) return "tawi";
  return "other";
}

export function levelMatchesFilter(level: LeadershipHierarchyLevel, filter: LeadershipHierarchyLevel | "all"): boolean {
  if (filter === "all") return true;
  if (filter === "other") return level === "other";
  return level === filter;
}
