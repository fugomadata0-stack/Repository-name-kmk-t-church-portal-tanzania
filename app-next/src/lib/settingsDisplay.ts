import type { AboutKmktState } from "../types";
import type { ChurchIdentityRow, SystemSettingsRow } from "../services/settingsTablesService";

/** Jina la kuonyesha kwenye hero ya dashibodi — kiwango cha kipaumbele bila mock */
export function resolvePortalDisplayName(
  about: AboutKmktState,
  identity: ChurchIdentityRow | null,
  system: SystemSettingsRow | null
): string {
  const a = about.church_name?.trim();
  if (a) return a;
  const i = identity?.official_church_name?.trim();
  if (i) return i;
  const s = system?.system_name?.trim() || system?.short_name?.trim();
  if (s) return s;
  return "";
}

export function resolvePortalSubtitle(about: AboutKmktState, identity: ChurchIdentityRow | null): string {
  const ab = about.abbreviation?.trim();
  if (ab) return ab;
  return identity?.headquarters?.trim() || identity?.country?.trim() || "";
}
