import type { AuthError } from "@supabase/supabase-js";
import { formatCaughtError } from "./supabaseErrors";

/** Ujumbe wa kirafiki — kamwe usionyeshe moja kwa moja ujumbe wa kiufundi wa Supabase. */
export function formatAuthLoginError(error: AuthError): string {
  const low = (error.message || "").toLowerCase();
  if (error.status === 400 && (low.includes("invalid login") || low.includes("invalid email or password"))) {
    return "Barua pepe au neno la siri si sahihi.";
  }
  if (low.includes("email not confirmed")) {
    return "Thibitisha barua pepe kabla ya kuendelea.";
  }
  if (low.includes("too many requests") || low.includes("rate limit")) {
    return "Jaribio limezidi. Subiri dakika chache kisha jaribu tena.";
  }
  if (low.includes("network") || low.includes("fetch")) {
    return "Muunganisho umeshindikana. Angalia intaneti yako kisha jaribu tena.";
  }
  return "Imeshindikana kuingia. Jaribu tena au wasiliana na msaada.";
}

export function formatPasswordResetError(error: unknown): string {
  const low = String((error as { message?: unknown } | null)?.message ?? error ?? "").toLowerCase();
  if (low.includes("rate limit") || low.includes("too many")) {
    return "Maombi mengi ya urejeshaji. Subiri kidogo kisha jaribu tena.";
  }
  if (low.includes("email") && low.includes("invalid")) {
    return "Barua pepe si sahihi. Angalia na ujaribu tena.";
  }
  if (low.includes("network") || low.includes("fetch")) {
    return "Muunganisho umeshindikana. Jaribu tena baada ya muda mfupi.";
  }
  return "Imeshindikana kutuma barua ya urejeshaji. Jaribu tena au wasiliana na msaada.";
}

export function formatPasswordUpdateError(error: unknown): string {
  const msg = formatCaughtError(error).toLowerCase();
  if (msg.includes("same") && msg.includes("password")) {
    return "Nenosiri jipya lazima litofautiane na la zamani.";
  }
  if (msg.includes("weak") || msg.includes("password")) {
    return "Nenosiri halikidhi vigezo vya usalama. Tumia nenosiri imara zaidi.";
  }
  return "Imeshindikana kusasisha nenosiri. Jaribu tena.";
}

export function formatAuthGenericError(error: unknown, fallback = "Hitilafu ya mfumo. Jaribu tena."): string {
  const raw = formatCaughtError(error);
  const low = raw.toLowerCase();
  if (low.includes("jwt") || low.includes("supabase") || low.includes("pgrst") || low.includes("postgres")) {
    return fallback;
  }
  if (raw.length > 120) return fallback;
  return raw || fallback;
}
