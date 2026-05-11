import type { PortalDirectoryProfile, UserRole } from "../types";

/** Ujumbe wa tooltip / toast wakati uhariri/hatua ziko nje ya eneo lililowekwa */
export const SCOPE_TOOLTIP_SW =
  "Unaweza kuona taarifa hii, lakini huna ruhusa ya kuibadilisha nje ya eneo lako.";

/** @deprecated Tumia SCOPE_TOOLTIP_SW — maana ni sawa */
export const SCOPE_DENIED_MESSAGE_SW = SCOPE_TOOLTIP_SW;

export type ScopeMutationOp = "create" | "edit" | "delete";

/** Vitambulisho vya ngazi vya rekodi (UUID kwenye DB) */
export type ScopeTriple = {
  dayosisi_id?: string | null;
  jimbo_id?: string | null;
  tawi_id?: string | null;
};

export type ScopeHierarchy = {
  majimbo?: Array<{ id: string; dayosisi_id?: string | null }>;
  matawi?: Array<{ id: string; jimbo_id?: string | null }>;
};

function normUuid(s: string | null | undefined): string | null {
  const t = String(s ?? "").trim();
  if (!t || t === "undefined" || t === "null") return null;
  return t;
}

function hasAnyScopeSet(profile: PortalDirectoryProfile | null): boolean {
  if (!profile) return false;
  return Boolean(normUuid(profile.dayosisi_scope) || normUuid(profile.jimbo_scope) || normUuid(profile.tawi_scope));
}

/**
 * Je, jukumu ni la kimataifa / kamili (hakuna mipaka ya kihesabu ya dayosisi/jimbo/tawi)?
 * chief_admin + super_admin: ona zote, hariri zote.
 */
export function roleBypassesGeoScope(role: UserRole): boolean {
  return role === "super_admin" || role === "chief_admin";
}

/**
 * Mipaka ya “taifa” kwa national_admin, office_admin, secretary:
 * - hakuna dayosisi/jimbo/tawi kwenye wasifu → hariri taarifa za taifa zote (scope tupu);
 * - scope imewekwa → hariri rekodi zilizo ndani ya eneo hilo pekee (dayosisi + watoto, nk.).
 */
function rowMatchesNationalScopedAssignment(
  profile: PortalDirectoryProfile,
  row: ScopeTriple,
  hierarchy: ScopeHierarchy
): boolean {
  const D = normUuid(profile.dayosisi_scope);
  const J = normUuid(profile.jimbo_scope);
  const T = normUuid(profile.tawi_scope);

  const rd = normUuid(row.dayosisi_id);
  const rj = normUuid(row.jimbo_id);
  const rt = normUuid(row.tawi_id);

  const inferredD = rd || (rj ? jimboDayosisiId(rj, hierarchy) : null) || (rt ? tawiDayosisiId(rt, hierarchy) : null);
  const inferredJ = rj || (rt ? tawiJimboId(rt, hierarchy) : null);

  if (!hasAnyScopeSet(profile)) return true;
  if (D && inferredD && inferredD === D) return true;
  if (D && !inferredD) return false;
  if (J && inferredJ && inferredJ === J) return true;
  if (T && rt && rt === T) return true;
  return !D && !J && !T;
}

/**
 * Ripoti fupi ya beji ya upeo wa uhariri (UI).
 */
export function describeScopeEditBadge(role: UserRole, profile: PortalDirectoryProfile | null): string {
  if (!profile) return "—";
  if (role === "viewer" || role === "member_user") return "Read Only";
  if (roleBypassesGeoScope(role)) return "View All · Hariri zote";

  const d = normUuid(profile.dayosisi_scope);
  const j = normUuid(profile.jimbo_scope);
  const t = normUuid(profile.tawi_scope);

  if (role === "national_admin" && (d || j || t)) return "View All · Edit: Eneo la taifa lililowekwa";
  if (role === "dayosisi_admin" && d) return "View All · Edit: Dayosisi yako tu";
  if (role === "jimbo_admin" && j) return "View All · Edit: Jimbo lako tu";
  if (role === "tawi_admin" && t) return "View All · Edit: Tawi/Kituo chako tu";
  if ((role === "finance_admin" || role === "editor" || role === "reviewer" || role === "approver") && (d || j || t)) {
    if (t) return "View All · Edit: Eneo lililowekwa";
    if (j) return "View All · Edit: Jimbo + vituo vyake";
    if (d) return "View All · Edit: Dayosisi + majimbo yake";
  }
  if (!hasAnyScopeSet(profile)) return "View All · Hariri (kipaumbele cha taifa)";
  return "View All · Edit: Eneo lililowekwa";
}

function jimboDayosisiId(jimboId: string | null, hierarchy: ScopeHierarchy): string | null {
  if (!jimboId) return null;
  const row = hierarchy.majimbo?.find((x) => x.id === jimboId);
  return normUuid(row?.dayosisi_id ?? null);
}

function tawiJimboId(tawiId: string | null, hierarchy: ScopeHierarchy): string | null {
  if (!tawiId) return null;
  const row = hierarchy.matawi?.find((x) => x.id === tawiId);
  return normUuid(row?.jimbo_id ?? null);
}

function tawiDayosisiId(tawiId: string | null, hierarchy: ScopeHierarchy): string | null {
  const jid = tawiJimboId(tawiId, hierarchy);
  return jid ? jimboDayosisiId(jid, hierarchy) : null;
}

/**
 * Hakiki kama rekodi iko ndani ya eneo la uhariri la mtumiaji wa kidiplomasia (geo scope).
 */
export function rowWithinAssignedScope(
  role: UserRole,
  profile: PortalDirectoryProfile | null,
  row: ScopeTriple,
  hierarchy: ScopeHierarchy
): boolean {
  if (!profile) return false;
  if (roleBypassesGeoScope(role)) return true;

  const D = normUuid(profile.dayosisi_scope);
  const J = normUuid(profile.jimbo_scope);
  const T = normUuid(profile.tawi_scope);

  const rd = normUuid(row.dayosisi_id);
  const rj = normUuid(row.jimbo_id);
  const rt = normUuid(row.tawi_id);

  const inferredD = rd || (rj ? jimboDayosisiId(rj, hierarchy) : null) || (rt ? tawiDayosisiId(rt, hierarchy) : null);
  const inferredJ = rj || (rt ? tawiJimboId(rt, hierarchy) : null);

  switch (role) {
    case "national_admin":
    case "office_admin":
    case "secretary":
      return rowMatchesNationalScopedAssignment(profile, row, hierarchy);

    case "finance_admin":
    case "editor":
    case "approver":
    case "reviewer":
      if (!hasAnyScopeSet(profile)) return true;
      if (T && rt) return rt === T;
      if (T && !rt) return false;
      if (J && inferredJ) return inferredJ === J;
      if (J && !inferredJ && rd) return rd === D;
      if (D && inferredD) return inferredD === D;
      return false;

    case "dayosisi_admin":
      if (!D) return false;
      if (rd && rd === D) return true;
      if (rj && jimboDayosisiId(rj, hierarchy) === D) return true;
      if (rt && tawiDayosisiId(rt, hierarchy) === D) return true;
      return false;

    case "jimbo_admin":
      if (!J) return false;
      if (rj && rj === J) return true;
      if (rt && tawiJimboId(rt, hierarchy) === J) return true;
      return false;

    case "tawi_admin":
      if (!T) return false;
      return Boolean(rt && rt === T);

    case "viewer":
    case "member_user":
      return false;

    default:
      if (!hasAnyScopeSet(profile)) return true;
      if (D && inferredD) return inferredD === D;
      if (J && inferredJ) return inferredJ === J;
      if (T && rt) return rt === T;
      return false;
  }
}

/**
 * Je, ruhusa ya INSERT/UPDATE/DELETE kwenye rekodi hii (mwisho wa mipaka + jukumu)?
 */
export function recordAllowsScopeMutation(
  role: UserRole,
  profile: PortalDirectoryProfile | null,
  _op: ScopeMutationOp,
  row: ScopeTriple | null,
  hierarchy: ScopeHierarchy
): boolean {
  if (!profile) return false;
  /** viewer + member_user: ona tu — hakuna uhariri/oondoaji/idhini kwa mipaka */
  if (role === "viewer" || role === "member_user") return false;

  if (roleBypassesGeoScope(role)) return true;

  const triple = row ?? {};
  return rowWithinAssignedScope(role, profile, triple, hierarchy);
}

/** Zuia uumbaji wa ngazi kuu ya muundo (Dayosisi mpya) isiyokuwa na chief/national kamili */
export function structuralCreateAllowedDayosisi(role: UserRole, profile: PortalDirectoryProfile | null): boolean {
  if (roleBypassesGeoScope(role)) return true;
  if (role === "national_admin" && profile && !hasAnyScopeSet(profile)) return true;
  return false;
}

export function structuralCreateAllowedJimbo(role: UserRole, profile: PortalDirectoryProfile | null): boolean {
  if (structuralCreateAllowedDayosisi(role, profile)) return true;
  if (role === "national_admin" && profile) return true;
  return role === "dayosisi_admin" && Boolean(normUuid(profile?.dayosisi_scope));
}

export function structuralCreateAllowedTawi(role: UserRole, profile: PortalDirectoryProfile | null): boolean {
  if (structuralCreateAllowedJimbo(role, profile)) return true;
  return role === "jimbo_admin" && Boolean(normUuid(profile?.jimbo_scope));
}
