/**
 * Kichwa cha taasisi kinachotumika na PDF za wasifu / vyeti vya uongozi (chanzo kimoja cha ukweli).
 */
import {
  KMKT_OFFICE_EMAIL,
  KMKT_OFFICE_PHONE_DISPLAY,
  KMKT_OFFICE_PHONE_RAW,
  buildKmktPdfHeaderText,
} from "../data/kmktCanonicalContent";
import { DEFAULT_MASTER_WEBSITE_URL } from "../services/masterSettingsService";

export const KMKT_PUBLIC_PORTAL_URL = DEFAULT_MASTER_WEBSITE_URL;

export { KMKT_OFFICE_EMAIL, KMKT_OFFICE_PHONE_DISPLAY, KMKT_OFFICE_PHONE_RAW };

/** Mistari ya kawaida ya kichwa cha cheti (Kiswahili / taasisi). */
export function defaultKmktExecutiveInstitutionLines(): string[] {
  return buildKmktPdfHeaderText().split("\n");
}

/**
 * Unganisha kichwa rasmi na mistari ya ziada (mf. anwani kutoka mipangilio mikuu).
 * `supplement` — mistari ya ziada pekee (sio kuchapisha tena jina kuu la kanisa likiweko tayari).
 */
export function mergeKmktInstitutionBlock(supplement?: string[] | null): string[] {
  const base = defaultKmktExecutiveInstitutionLines();
  const extra = (supplement ?? [])
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!extra.length) return base;
  return [...base, "—", ...extra];
}

export type LeadershipVerifyKind = "national" | "church";

/** URL ya uhakiki wa umma (hakuna kuingia). */
export function buildLeadershipVerificationUrl(baseUrl: string, kind: LeadershipVerifyKind, id: string): string {
  const b = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  if (!b) return "";
  const enc = encodeURIComponent(id);
  if (kind === "national") return `${b}/verify/leadership?nid=${enc}`;
  return `${b}/verify/leadership?vid=${enc}`;
}

/** URL ya uhakiki kwa cheti rasmi (verification_id ya DB). */
export function buildOfficialCertificateVerificationUrl(baseUrl: string, verificationId: string): string {
  const b = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  const id = String(verificationId ?? "").trim();
  if (!b || !id) return "";
  return `${b}/verify/leadership?vrf=${encodeURIComponent(id)}`;
}

/** Nambari fupi ya kumbukumbu inayoonekana kwenye cheti / QR. */
export type LeadershipCredentialSerialPrefix = "CV" | "NAT" | "NAT-CV" | "CHT" | "ID";

export function formatLeadershipCredentialSerial(prefix: LeadershipCredentialSerialPrefix, id: string): string {
  const raw = String(id ?? "").replace(/-/g, "").toUpperCase();
  const core = raw.slice(0, 12) || "UNKNOWN";
  return `KMK-${prefix}-${core}`;
}

/** Nambari ya mfululizo ya cheti cha tawi (thabiti kwa kila tawi). */
export function formatTawiBranchCredentialSerial(tawiId: string): string {
  const raw = String(tawiId ?? "").replace(/-/g, "").toUpperCase();
  const core = raw.slice(0, 12) || "UNKNOWN";
  return `KMKT-BR-${core}`;
}

/** URL ya uhakiki wa umma wa tawi (QR kwenye cheti). */
export function buildTawiCertificateVerificationUrl(baseUrl: string, tawiId: string): string {
  const b = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  if (!b) return "";
  return `${b}/verify/leadership?tid=${encodeURIComponent(String(tawiId).trim())}`;
}
