import { safeSessionStorage, safeStorage } from "./security";

export const PORTAL_DRAFT_EVENT_CLEAR_CURRENT = "kmt-portal-draft-clear-current";
export const PORTAL_DRAFT_EVENT_FLUSH = "kmt-portal-draft-flush";
export const PORTAL_DRAFT_EVENT_OFFICIAL_SAVE = "kmt-portal-official-save-success";

const STORAGE_PREFIX = "kmkt_portal_draft_v1";
const STORAGE_INDEX_KEY = `${STORAGE_PREFIX}:index`;
const PUBLIC_DRAFT_MAX_AGE_MS = 15 * 60 * 1000;
const AUTH_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MIN_FIELD_TEXT_LENGTH = 1;
const MAX_FIELD_VALUE_LENGTH = 4_000;
const MAX_DRAFT_JSON_LENGTH = 180_000;

export interface PortalDraftScope {
  userId: string | null | undefined;
  moduleKey: string;
  submodule: string;
  pageKey?: string;
}

export interface PortalDraftField {
  key: string;
  selector: string;
  kind: "input" | "textarea" | "select" | "checkbox" | "radio" | "contenteditable" | "file";
  value?: string;
  checked?: boolean;
  selectedValues?: string[];
  fileMeta?: Array<{ name: string; size: number; type: string; lastModified: number }>;
}

export interface PortalDraftUiState {
  scrollTop: number;
  activeElementKey: string | null;
  openDetails: string[];
}

export interface PortalDraftRecord {
  v: 1;
  scopeKey: string;
  userId: string | null;
  moduleKey: string;
  submodule: string;
  pageKey?: string;
  savedAt: number;
  expiresAt: number;
  fields: PortalDraftField[];
  ui: PortalDraftUiState;
}

function sanitizePart(value: string | null | undefined): string {
  return String(value ?? "anon")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-.]/g, "_")
    .slice(0, 120);
}

export function portalDraftScopeKey(scope: PortalDraftScope): string {
  return [
    STORAGE_PREFIX,
    sanitizePart(scope.userId || "public"),
    sanitizePart(scope.pageKey || scope.moduleKey),
    sanitizePart(scope.submodule || "default"),
  ].join(":");
}

function parseDraft(raw: string | null): PortalDraftRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PortalDraftRecord;
    if (parsed?.v !== 1 || typeof parsed.scopeKey !== "string" || !Array.isArray(parsed.fields)) return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(safeStorage.get(STORAGE_INDEX_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(keys: string[]): void {
  safeStorage.set(STORAGE_INDEX_KEY, JSON.stringify(Array.from(new Set(keys)).slice(-120)));
}

function rememberKey(key: string): void {
  writeIndex([...readIndex().filter((x) => x !== key), key]);
}

export function readPortalDraft(scope: PortalDraftScope): PortalDraftRecord | null {
  const key = portalDraftScopeKey(scope);
  const fromLocal = parseDraft(safeStorage.get(key));
  if (fromLocal) return fromLocal;
  const fromSession = parseDraft(safeSessionStorage.get(key));
  if (fromSession) return fromSession;
  clearPortalDraft(scope);
  return null;
}

export function hasFreshPortalDraft(scope: PortalDraftScope): boolean {
  const draft = readPortalDraft(scope);
  return Boolean(draft && draft.fields.length > 0);
}

export function writePortalDraft(scope: PortalDraftScope, fields: PortalDraftField[], ui: PortalDraftUiState): boolean {
  const meaningfulFields = fields.filter((field) => {
    if (field.kind === "checkbox" || field.kind === "radio") return Boolean(field.checked);
    if (field.kind === "file") return Boolean(field.fileMeta?.length);
    if (field.kind === "select") return Boolean(field.selectedValues?.some((v) => v.trim().length >= MIN_FIELD_TEXT_LENGTH));
    return Boolean(field.value && field.value.trim().length >= MIN_FIELD_TEXT_LENGTH);
  });
  const scopeKey = portalDraftScopeKey(scope);
  if (meaningfulFields.length === 0) {
    clearPortalDraft(scope);
    return false;
  }
  const now = Date.now();
  const authenticated = Boolean(scope.userId);
  const record: PortalDraftRecord = {
    v: 1,
    scopeKey,
    userId: scope.userId || null,
    moduleKey: scope.moduleKey,
    submodule: scope.submodule,
    pageKey: scope.pageKey,
    savedAt: now,
    expiresAt: now + (authenticated ? AUTH_DRAFT_MAX_AGE_MS : PUBLIC_DRAFT_MAX_AGE_MS),
    fields: meaningfulFields,
    ui,
  };
  const json = JSON.stringify(record);
  if (json.length > MAX_DRAFT_JSON_LENGTH) return false;
  safeStorage.set(scopeKey, json);
  safeSessionStorage.set(scopeKey, json);
  rememberKey(scopeKey);
  return true;
}

export function clearPortalDraft(scope: PortalDraftScope): void {
  const key = portalDraftScopeKey(scope);
  safeStorage.remove(key);
  safeSessionStorage.remove(key);
  writeIndex(readIndex().filter((x) => x !== key));
}

export function clearExpiredPortalDrafts(): void {
  const now = Date.now();
  const next: string[] = [];
  for (const key of readIndex()) {
    const raw = safeStorage.get(key) ?? safeSessionStorage.get(key);
    try {
      const parsed = raw ? (JSON.parse(raw) as PortalDraftRecord) : null;
      if (parsed?.v === 1 && typeof parsed.expiresAt === "number" && parsed.expiresAt > now) {
        next.push(key);
      } else {
        safeStorage.remove(key);
        safeSessionStorage.remove(key);
      }
    } catch {
      safeStorage.remove(key);
      safeSessionStorage.remove(key);
    }
  }
  writeIndex(next);
}

export function confirmPortalDraftNavigation(scope: PortalDraftScope): boolean {
  if (!hasFreshPortalDraft(scope)) return true;
  return window.confirm("Una mabadiliko ambayo hayajahifadhiwa. Unataka kuondoka?");
}

export function notifyOfficialPortalSave(): void {
  window.dispatchEvent(new CustomEvent(PORTAL_DRAFT_EVENT_OFFICIAL_SAVE));
}

export function isSensitiveDraftControl(el: HTMLElement): boolean {
  const input = el as HTMLInputElement;
  const haystack = [
    input.type,
    input.name,
    input.id,
    input.autocomplete,
    input.getAttribute("aria-label"),
    input.getAttribute("placeholder"),
    input.getAttribute("data-field"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /password|token|secret|session|jwt|authorization|auth|refresh|access[_\s-]?key|api[_\s-]?key|service[_\s-]?role|otp/.test(
    haystack
  );
}

export function truncateDraftValue(value: string): string {
  return value.length > MAX_FIELD_VALUE_LENGTH ? value.slice(0, MAX_FIELD_VALUE_LENGTH) : value;
}
