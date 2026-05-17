/**
 * Chanzo kimoja cha kutengeneza vyeti na PDF za uongozi.
 */
import { downloadNationalLeadershipExecutiveCertificate } from "../nationalLeadershipCertificatePdf";
import {
  buildLeadershipVerificationUrl,
  buildOfficialCertificateVerificationUrl,
  formatLeadershipCredentialSerial,
} from "../kmktExecutiveInstitution";
import { persistOfficialCertificatePdfOptional } from "../../services/leadershipCertificateStorageService";
import { nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import { recordCredentialIssueOptional } from "../../services/leadershipCredentialsEngineService";
import { buildAdvancedLeadershipPdf } from "../leadershipPdfEngine/buildAdvancedPdf";
import { credentialKindToAdvanced } from "../leadershipPdfEngine/types";
import { resolveChurchLogoDataUrl } from "../churchPdfBranding";
import { fetchUrlAsPdfImageDataUrl } from "../pdfInstitutional";
import { safeDownloadLeadershipPdf } from "../leadershipPdfEngine/exportActionsSafe";
import type { BuiltLeadershipPdf } from "../leadershipPdfEngine/types";
import type { CredentialDocumentKind, CredentialGenerateOpts, UnifiedLeaderRef } from "./types";
import { resolveHierarchyLevelFromLeader } from "./resolveLevel";

function portalOrigin(opts?: CredentialGenerateOpts): string {
  const o = opts?.portalBaseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return String(o || "").replace(/\/$/, "") || "https://v0-church-portal-tanzania.vercel.app";
}

function serialFor(ref: UnifiedLeaderRef, kind: CredentialDocumentKind): string {
  if (ref.source === "national_leadership") {
    const prefix = kind === "executive_cv" || kind === "leadership_profile_pdf" ? "NAT-CV" : "NAT";
    return formatLeadershipCredentialSerial(prefix, ref.row.role_key);
  }
  const prefix =
    kind === "executive_cv" || kind === "leadership_profile_pdf"
      ? "CV"
      : kind === "identity_card"
        ? "ID"
        : "CHT";
  return formatLeadershipCredentialSerial(prefix, ref.leader.id);
}

async function resolveCredentialLogoDataUrl(opts?: CredentialGenerateOpts): Promise<string | undefined> {
  const direct = opts?.logoDataUrl?.trim();
  if (direct?.startsWith("data:")) return direct;
  const url = direct || opts?.logoUrl?.trim() || opts?.autoFill?.logoUrl?.trim();
  if (url) {
    const fromUrl = await fetchUrlAsPdfImageDataUrl(url);
    if (fromUrl) return fromUrl;
  }
  return (await resolveChurchLogoDataUrl()) ?? undefined;
}

function metaFor(ref: UnifiedLeaderRef): { hierarchy: string; title: string; sourceId: string } {
  if (ref.source === "national_leadership") {
    const title = nationalLeadershipDisplayTitle(ref.row, "sw");
    return {
      hierarchy: "Uongozi wa Kitaifa — KMK(T)",
      title,
      sourceId: ref.row.role_key,
    };
  }
  const L = ref.leader;
  const hierarchy =
    [L.dayosisi, L.jimbo, L.tawi].filter(Boolean).join(" · ") ||
    L.leadership_level ||
    L.ngazi ||
    "KMK(T)";
  return {
    hierarchy: String(hierarchy),
    title: L.cheo?.trim() || L.jina?.trim() || "—",
    sourceId: L.id,
  };
}

/** Tengeneza PDF — rudisha doc bila kuhifadhi (export toolbar). */
export async function buildLeadershipCredentialPdf(
  ref: UnifiedLeaderRef,
  kind: CredentialDocumentKind,
  opts?: CredentialGenerateOpts,
): Promise<BuiltLeadershipPdf | null> {
  const fill = opts?.autoFill ?? null;
  const base = portalOrigin(opts);
  const serial = serialFor(ref, kind);
  const logoDataUrl = await resolveCredentialLogoDataUrl(opts);
  const photoDataUrl = opts?.photoDataUrl ?? fill?.photoDataUrl ?? undefined;
  const signatureDataUrl = opts?.signatureDataUrl ?? fill?.signatureDataUrl ?? undefined;

  if (ref.source === "national_leadership") {
    await downloadNationalLeadershipExecutiveCertificate(ref.row, {
      portalBaseUrl: base,
      logoDataUrl,
    });
    return null;
  }

  const leader = fill?.enrichedLeader ?? ref.leader;
  const advancedKind = credentialKindToAdvanced(kind);

  return buildAdvancedLeadershipPdf({
    kind: advancedKind,
    leader,
    portalBaseUrl: base,
    logoDataUrl,
    photoDataUrl,
    signatureDataUrl,
    autoFill: fill,
    verificationSerial: serial,
    approverName: leader.pdf_issued_by_name,
    approverTitle: leader.pdf_issued_by_title,
  });
}

/** Tengeneza, pakua, na usajili kwenye DB. */
export async function generateLeadershipCredential(
  ref: UnifiedLeaderRef,
  kind: CredentialDocumentKind,
  opts?: CredentialGenerateOpts,
): Promise<BuiltLeadershipPdf | null> {
  const base = portalOrigin(opts);
  const serial = serialFor(ref, kind);
  const { hierarchy, title, sourceId } = metaFor(ref);

  if (ref.source === "national_leadership") {
    const verifyUrl = `${base}/verify-leadership?national=${encodeURIComponent(ref.row.role_key)}`;
    const logoDataUrl = await resolveCredentialLogoDataUrl(opts);
    await downloadNationalLeadershipExecutiveCertificate(ref.row, {
      portalBaseUrl: base,
      logoDataUrl,
    });
    if (opts?.recordIssue !== false) {
      await recordCredentialIssueOptional({
        source_type: "national_leadership",
        source_id: sourceId,
        national_role_key: ref.row.role_key,
        document_kind: kind,
        verification_serial: serial,
        verify_url: verifyUrl,
        hierarchy_label: hierarchy,
        position_title: title,
        holder_full_name: ref.row.full_name?.trim() || title,
        issued_by: opts?.issuedByUserId ?? null,
        payload: { role_key: ref.row.role_key },
      });
    }
    return null;
  }

  const built = await buildLeadershipCredentialPdf(ref, kind, opts);
  if (built) {
    safeDownloadLeadershipPdf(built.doc, built.filename);
  }

  if (opts?.recordIssue !== false) {
    const leader = opts?.autoFill?.enrichedLeader ?? ref.leader;
    const verifyUrl = buildLeadershipVerificationUrl(base, "church", leader.id);
    const reg = await recordCredentialIssueOptional({
      source_type: "church_viongozi",
      source_id: sourceId,
      leader_id: leader.id,
      document_kind: kind,
      verification_serial: serial,
      verify_url: verifyUrl,
      hierarchy_label: hierarchy,
      position_title: title,
      holder_full_name: leader.jina?.trim() || leader.full_name?.trim() || title,
      issued_by: opts?.issuedByUserId ?? null,
      payload: {
        level: resolveHierarchyLevelFromLeader(leader),
        cheo: leader.cheo,
        advanced_kind: credentialKindToAdvanced(kind),
      },
    });
    if (built && reg.officialCertificateId) {
      const displaySerial = reg.certificateNumber || reg.verificationId || built.displaySerial;
      if (reg.verificationId) {
        const vrfUrl = buildOfficialCertificateVerificationUrl(base, reg.verificationId);
        void persistOfficialCertificatePdfOptional({
          officialCertificateId: reg.officialCertificateId,
          leaderId: leader.id,
          documentKind: kind,
          doc: built.doc,
          filename: built.filename,
          verifyUrl: vrfUrl,
        });
      }
      return { ...built, displaySerial };
    }
  }

  return built;
}
