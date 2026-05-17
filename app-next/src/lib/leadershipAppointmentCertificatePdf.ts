/**
 * Cheti cha uteuzi — wrapper juu ya Advanced PDF Engine (chanzo kimoja).
 */
import { downloadAdvancedLeadershipPdf } from "./leadershipPdfEngine/buildAdvancedPdf";
import type { KiongoziRecord } from "../types";

export type LeadershipAppointmentCertificateOpts = {
  portalBaseUrl?: string;
  logoDataUrl?: string | null;
  photoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  institutionalLines?: string[] | null;
  officialSealText?: string;
};

export async function downloadLeadershipAppointmentCertificate(
  leader: KiongoziRecord,
  opts?: LeadershipAppointmentCertificateOpts,
) {
  await downloadAdvancedLeadershipPdf({
    kind: "leadership_certificate",
    leader,
    portalBaseUrl: opts?.portalBaseUrl,
    logoDataUrl: opts?.logoDataUrl,
    photoDataUrl: opts?.photoDataUrl,
    signatureDataUrl: opts?.signatureDataUrl,
    institutionalLines: opts?.institutionalLines ?? undefined,
  });
}
