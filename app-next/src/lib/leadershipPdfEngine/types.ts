import type { CredentialDocumentKind } from "../certificateEngine/types";
import type { LeadershipCredentialAutoFill } from "../certificateEngine/autoFill";
import type { KiongoziRecord } from "../../types";
/** Aina 6 za PDF za uongozi (chanzo kimoja). */
export type AdvancedLeadershipPdfKind =
  | "leadership_certificate"
  | "appointment_letter"
  | "service_certificate"
  | "leadership_cv"
  | "promotion_certificate"
  | "recognition_certificate"
  | "executive_bishop_certificate";

export const ADVANCED_PDF_KINDS: AdvancedLeadershipPdfKind[] = [
  "leadership_certificate",
  "appointment_letter",
  "service_certificate",
  "executive_bishop_certificate",
  "leadership_cv",
  "promotion_certificate",
  "recognition_certificate",
];

export const ADVANCED_PDF_LABELS: Record<AdvancedLeadershipPdfKind, { sw: string; en: string }> = {
  leadership_certificate: { sw: "Cheti cha Uongozi", en: "Leadership Certificate" },
  appointment_letter: { sw: "Barua ya Uteuzi", en: "Appointment Letter" },
  service_certificate: { sw: "Cheti cha Huduma", en: "Service Certificate" },
  leadership_cv: { sw: "Wasifu wa Uongozi (CV)", en: "Leadership CV" },
  promotion_certificate: { sw: "Cheti cha Kupandishwa", en: "Promotion Certificate" },
  recognition_certificate: { sw: "Cheti cha Kutambuliwa", en: "Recognition Certificate" },
  executive_bishop_certificate: { sw: "Cheti cha Askofu Mkuu", en: "Executive Bishop Certificate" },
};

/** Ramani salama kwenye CredentialDocumentKind (DB + hub ya zamani). */
export function credentialKindToAdvanced(kind: CredentialDocumentKind): AdvancedLeadershipPdfKind {
  switch (kind) {
    case "appointment_certificate":
      return "leadership_certificate";
    case "appointment_letter":
      return "appointment_letter";
    case "service_certificate":
      return "service_certificate";
    case "executive_cv":
    case "leadership_profile_pdf":
    case "identity_card":
      return "leadership_cv";
    case "promotion_certificate":
      return "promotion_certificate";
    case "recognition_certificate":
      return "recognition_certificate";
    default:
      return "leadership_certificate";
  }
}

export function advancedKindToCredentialKind(kind: AdvancedLeadershipPdfKind): CredentialDocumentKind {
  switch (kind) {
    case "leadership_certificate":
      return "appointment_certificate";
    case "appointment_letter":
      return "appointment_letter";
    case "service_certificate":
      return "service_certificate";
    case "leadership_cv":
      return "executive_cv";
    case "promotion_certificate":
      return "promotion_certificate";
    case "recognition_certificate":
      return "recognition_certificate";
    case "executive_bishop_certificate":
      return "appointment_certificate";
    default:
      return "appointment_certificate";
  }
}

export type AdvancedLeadershipPdfInput = {
  kind: AdvancedLeadershipPdfKind;
  leader: KiongoziRecord;
  portalBaseUrl?: string;
  logoDataUrl?: string | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  sealDataUrl?: string | null;
  autoFill?: LeadershipCredentialAutoFill | null;
  verificationSerial?: string;
  officialCertificateNumber?: string | null;
  verificationId?: string | null;
  approverName?: string | null;
  approverTitle?: string | null;
  institutionalLines?: string[] | null;
};

export type BuiltLeadershipPdf = {
  doc: import("jspdf").jsPDF;
  filename: string;
  verifyUrl: string;
  displaySerial: string;
};
