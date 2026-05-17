import type { InstitutionalCertificatePreviewProps } from "../components/executive/ExecutiveInstitutionalCertificatePreview";
import type { LeadershipGalleryItem } from "../components/executive/LeadershipDocumentGallery";
import {
  buildOfficialCertificateVerificationUrl,
  formatLeadershipCredentialSerial,
} from "./kmktExecutiveInstitution";
import type { OfficialCertificateRow } from "../services/leadershipOfficialCertificateService";
import { OFFICIAL_CERT_STATUS_LABELS } from "../services/leadershipOfficialCertificateService";
import type { NationalLeadershipProfileRow } from "../services/nationalLeadershipService";
import { nationalLeadershipDisplayTitle } from "../services/nationalLeadershipService";
import type { LeadershipCredentialAutoFill } from "./certificateEngine/autoFill";
import type { KiongoziRecord } from "../types";
import {
  hierarchyPreviewTitles,
  resolveCertificateHierarchyLevel,
} from "./leadershipPdfEngine/hierarchyCertificateDesign";
import { resolveHierarchyLevelFromLeader } from "./certificateEngine/resolveLevel";

export function enrichPreviewWithOfficialCertificate(
  base: InstitutionalCertificatePreviewProps,
  cert: OfficialCertificateRow | null | undefined,
  portalBaseUrl?: string,
): InstitutionalCertificatePreviewProps {
  if (!cert) return base;
  const origin =
    portalBaseUrl?.trim() ||
    (typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "");
  const verifyUrl =
    cert.verify_url?.trim() ||
    buildOfficialCertificateVerificationUrl(origin, cert.verification_id);
  const statusLabel = OFFICIAL_CERT_STATUS_LABELS[cert.status]?.sw;
  return {
    ...base,
    certificateNumber: cert.certificate_number || base.certificateNumber,
    verificationId: cert.verification_id || base.verificationId,
    verifyUrl: verifyUrl || base.verifyUrl,
    issuedAtLabel: cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString("sw-TZ", { dateStyle: "medium" })
      : base.issuedAtLabel,
    workflowStatusLabel: statusLabel || base.workflowStatusLabel,
  };
}

export function nationalRowToPreviewProps(
  row: NationalLeadershipProfileRow,
  opts?: { logoUrl?: string | null; kind?: "certificate" | "cv"; autoFill?: LeadershipCredentialAutoFill | null }
): InstitutionalCertificatePreviewProps {
  const r = opts?.autoFill?.enrichedNational ?? row;
  const titleSw = nationalLeadershipDisplayTitle(r, "sw");
  const titleEn = nationalLeadershipDisplayTitle(r, "en");
  const kind = opts?.kind ?? "certificate";
  const certLevel = resolveCertificateHierarchyLevel({ isNationalLeadership: true, roleKey: row.role_key });
  const titles = hierarchyPreviewTitles({ documentKind: kind, level: certLevel });
  return {
    fullName: r.full_name.trim() || "—",
    titleSw,
    titleEn,
    subtitle: opts?.autoFill?.hierarchyLabel ?? `${titleSw} · Uongozi wa Kitaifa`,
    biography: opts?.autoFill?.biography?.trim() || r.leadership_quote?.trim() || r.biography?.trim() || undefined,
    photoUrl: opts?.autoFill?.photoUrl ?? r.profile_photo_url,
    logoUrl: opts?.logoUrl,
    serial: formatLeadershipCredentialSerial("NAT", row.role_key),
    roleKey: row.role_key,
    cheo: titleSw,
    leadershipLevel: "national",
    documentKind: kind,
    certTitleSw: titles.certTitleSw,
    certTitleEn: titles.certTitleEn,
    watermarkLine2: titles.watermarkLine2,
    localSealText: titles.localSealText,
    certificateHierarchyLevel: certLevel,
  };
}

export function nationalRowToGalleryItem(row: NationalLeadershipProfileRow): LeadershipGalleryItem {
  const titleSw = nationalLeadershipDisplayTitle(row, "sw");
  return {
    id: `nat-${row.role_key}`,
    fullName: row.full_name.trim() || titleSw,
    titleSw,
    hierarchy: "Uongozi wa Kitaifa",
    roleKey: row.role_key,
    cheo: titleSw,
    leadershipLevel: "national",
    updatedAt: row.updated_at ?? null,
    kind: "certificate",
  };
}

export function kiongoziToPreviewProps(
  leader: KiongoziRecord,
  opts?: {
    logoUrl?: string | null;
    photoUrl?: string | null;
    biography?: string | null;
    kind?: "certificate" | "cv";
    autoFill?: LeadershipCredentialAutoFill | null;
  }
): InstitutionalCertificatePreviewProps {
  const L = opts?.autoFill?.enrichedLeader ?? leader;
  const level = L.leadership_level ?? L.ngazi ?? "";
  const kind = opts?.kind ?? "cv";
  const certLevel = resolveCertificateHierarchyLevel({
    leader,
    hierarchyLevel: resolveHierarchyLevelFromLeader(leader),
    cheo: L.cheo,
    leadershipLevel: level,
  });
  const titles = hierarchyPreviewTitles({ documentKind: kind, level: certLevel });
  const hierarchy =
    opts?.autoFill?.hierarchyLabel ||
    [L.dayosisi, L.jimbo, L.tawi].filter(Boolean).join(" · ") ||
    level ||
    "KMK(T)";
  return {
    fullName: L.jina?.trim() || L.full_name?.trim() || "—",
    titleSw: L.cheo?.trim() || "—",
    titleEn: L.cheo?.trim() || undefined,
    subtitle: hierarchy,
    biography:
      opts?.biography?.trim() ||
      opts?.autoFill?.biography?.trim() ||
      L.biography?.trim() ||
      L.notes?.trim() ||
      undefined,
    photoUrl: opts?.photoUrl ?? opts?.autoFill?.photoUrl ?? L.photo_url,
    logoUrl: opts?.logoUrl,
    serial: formatLeadershipCredentialSerial("CV", leader.id),
    cheo: leader.cheo,
    leadershipLevel: level,
    documentKind: kind,
    certTitleSw: titles.certTitleSw,
    certTitleEn: titles.certTitleEn,
    watermarkLine2: titles.watermarkLine2,
    localSealText: titles.localSealText,
    certificateHierarchyLevel: certLevel,
  };
}

export function kiongoziToGalleryItem(leader: KiongoziRecord): LeadershipGalleryItem {
  const level = leader.leadership_level ?? leader.ngazi ?? "KMK(T)";
  return {
    id: leader.id,
    fullName: leader.jina?.trim() || leader.full_name?.trim() || "—",
    titleSw: leader.cheo?.trim() || "—",
    hierarchy: level,
    cheo: leader.cheo,
    leadershipLevel: level,
    kind: "cv",
  };
}
