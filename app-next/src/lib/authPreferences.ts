import { safeStorage } from "./security";

export const AUTH_REMEMBER_ME_KEY = "kmkt_remember_me_v1";
export const AUTH_REMEMBER_EMAIL_KEY = "kmkt_remember_email_v1";

/** Kikao kinadumu zaidi ikiwa “Nikumbuke” imewashwa. */
export const SESSION_IDLE_STANDARD_MS = 30 * 60 * 1000;
export const SESSION_IDLE_REMEMBER_MS = 7 * 24 * 60 * 60 * 1000;

export function isRememberMeEnabled(): boolean {
  const v = safeStorage.get(AUTH_REMEMBER_ME_KEY);
  return v !== "0";
}

export function setRememberMePreference(enabled: boolean): void {
  safeStorage.set(AUTH_REMEMBER_ME_KEY, enabled ? "1" : "0");
  if (!enabled) safeStorage.remove(AUTH_REMEMBER_EMAIL_KEY);
}

export function getRememberedEmail(): string {
  if (!isRememberMeEnabled()) return "";
  return safeStorage.get(AUTH_REMEMBER_EMAIL_KEY)?.trim() ?? "";
}

export function setRememberedEmail(email: string): void {
  if (!isRememberMeEnabled()) return;
  const em = email.trim().toLowerCase();
  if (em) safeStorage.set(AUTH_REMEMBER_EMAIL_KEY, em);
}

export function getSessionIdleLimitMs(): number {
  return isRememberMeEnabled() ? SESSION_IDLE_REMEMBER_MS : SESSION_IDLE_STANDARD_MS;
}
