/**
 * Uhifadhi wa hali ya portal kwenye sessionStorage (kipindi cha tab/pezi).
 * Hakuna tokeni wala siri — tu module, submodule, sidebar, scroll, na vipande vidogo vya moduli.
 */

import { coerceSubmoduleForModule, getDashboardDefaultSubmodule } from "./dashboardSubmodules";

export const PORTAL_UI_STORAGE_KEY = "kmkt_portal_ui_v1";

/** Muda wa kuwezesha kurejesha kiotomatiki baada ya kutoka kwa muda mfupi (ms). */
export const PORTAL_UI_MAX_AGE_MS = 5 * 60 * 1000;

export interface PortalUiSnapshotV1 {
  v: 1;
  savedAt: number;
  userId: string;
  activeModule: string;
  activeSubmodule: string;
  expanded: Record<string, boolean>;
  scrollTop: number;
  /** Data ya juu kwa moduli (filters, pagination, nk.) — haba tu */
  moduleSlices?: Record<string, unknown>;
}

function safeParse(raw: string | null): PortalUiSnapshotV1 | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as PortalUiSnapshotV1;
    if (o?.v !== 1 || typeof o.savedAt !== "number" || typeof o.userId !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function readPortalUiSnapshot(userId: string | undefined): PortalUiSnapshotV1 | null {
  if (!userId || typeof sessionStorage === "undefined") return null;
  const snap = safeParse(sessionStorage.getItem(PORTAL_UI_STORAGE_KEY));
  if (!snap || snap.userId !== userId) return null;
  if (Date.now() - snap.savedAt > PORTAL_UI_MAX_AGE_MS) return null;
  return snap;
}

export function clearPortalUiSnapshot(): void {
  try {
    sessionStorage.removeItem(PORTAL_UI_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function writePortalUiSnapshot(patch: Partial<PortalUiSnapshotV1> & Pick<PortalUiSnapshotV1, "userId">): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const prev = safeParse(sessionStorage.getItem(PORTAL_UI_STORAGE_KEY));
    const nextModule = patch.activeModule ?? prev?.activeModule ?? "dashboard";
    const nextSubRaw = patch.activeSubmodule ?? prev?.activeSubmodule ?? undefined;
    const next: PortalUiSnapshotV1 = {
      v: 1,
      savedAt: Date.now(),
      userId: patch.userId,
      activeModule: nextModule,
      activeSubmodule: coerceSubmoduleForModule(nextModule, nextSubRaw),
      expanded: patch.expanded ?? prev?.expanded ?? {},
      scrollTop: typeof patch.scrollTop === "number" ? patch.scrollTop : (prev?.scrollTop ?? 0),
      moduleSlices: patch.moduleSlices !== undefined ? patch.moduleSlices : (prev?.moduleSlices ?? {}),
    };
    sessionStorage.setItem(PORTAL_UI_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function mergeModuleSlice(userId: string, sliceKey: string, slice: unknown): void {
  if (!userId) return;
  try {
    const prev = safeParse(sessionStorage.getItem(PORTAL_UI_STORAGE_KEY));
    const base: PortalUiSnapshotV1 =
      prev && prev.userId === userId
        ? prev
        : {
            v: 1,
            savedAt: Date.now(),
            userId,
            activeModule: "dashboard",
            activeSubmodule: getDashboardDefaultSubmodule(),
            expanded: {},
            scrollTop: 0,
            moduleSlices: {},
          };
    const baseSlices = { ...(base.moduleSlices ?? {}) };
    baseSlices[sliceKey] = slice;
    writePortalUiSnapshot({
      userId,
      moduleSlices: baseSlices,
      activeModule: base.activeModule,
      activeSubmodule: base.activeSubmodule,
      expanded: base.expanded,
      scrollTop: base.scrollTop,
    });
  } catch {
    /* noop */
  }
}

export function readModuleSlice<T>(userId: string | undefined, moduleKey: string): T | null {
  const snap = readPortalUiSnapshot(userId);
  if (!snap?.moduleSlices || !(moduleKey in snap.moduleSlices)) return null;
  return snap.moduleSlices[moduleKey] as T;
}

/** Ufunguo mmoja kwa jedwali la PremiumTable (moduli + submodule + kitambulisho cha jedwali). */
export function portalPremiumTableScope(parts: (string | undefined)[]): string {
  return parts
    .map((p) => String(p ?? "").trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-.]/g, "_"))
    .join("__")
    .slice(0, 180);
}
