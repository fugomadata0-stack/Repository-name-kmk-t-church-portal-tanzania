import type { KiongoziRecord } from "../../types";
import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";

export type LeadershipHierarchyLevel = "national" | "dayosisi" | "jimbo" | "tawi" | "other";

export type CredentialDocumentKind =
  | "appointment_certificate"
  | "executive_cv"
  | "leadership_profile_pdf"
  | "appointment_letter"
  | "service_certificate"
  | "identity_card"
  | "promotion_certificate"
  | "recognition_certificate";

export type UnifiedLeaderSource = "church_viongozi" | "national_leadership";

export type UnifiedLeaderRef =
  | { source: "church_viongozi"; leader: KiongoziRecord }
  | { source: "national_leadership"; row: NationalLeadershipProfileRow };

export type CredentialGenerateOpts = {
  portalBaseUrl?: string;
  logoUrl?: string | null;
  logoDataUrl?: string | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  biography?: string | null;
  /** Data iliyojazwa kiotomatiki kutoka DB + CV Engine. */
  autoFill?: import("./autoFill").LeadershipCredentialAutoFill | null;
  recordIssue?: boolean;
  issuedByUserId?: string | null;
};

export const CREDENTIAL_DOCUMENT_LABELS: Record<
  CredentialDocumentKind,
  { sw: string; en: string }
> = {
  appointment_certificate: { sw: "Cheti cha Uteuzi", en: "Appointment Certificate" },
  executive_cv: { sw: "Wasifu wa Uongozi (CV)", en: "Executive CV" },
  leadership_profile_pdf: { sw: "Wasifu Rasmi (PDF)", en: "Leadership Profile PDF" },
  appointment_letter: { sw: "Barua ya Uteuzi", en: "Appointment Letter" },
  service_certificate: { sw: "Cheti cha Huduma", en: "Service Certificate" },
  identity_card: { sw: "Kadi ya Utambulisho", en: "Leadership ID Card" },
  promotion_certificate: { sw: "Cheti cha Kupandishwa", en: "Promotion Certificate" },
  recognition_certificate: { sw: "Cheti cha Kutambuliwa", en: "Recognition Certificate" },
};
