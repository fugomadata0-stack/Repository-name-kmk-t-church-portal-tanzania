import { jsPDF } from "jspdf";

import {

  buildLeadershipVerificationUrl,

  buildOfficialCertificateVerificationUrl,

  formatLeadershipCredentialSerial,

} from "../kmktExecutiveInstitution";

import { fetchUrlAsPdfImageDataUrl } from "../pdfInstitutional";

import { buildLeaderProfilePdfDocument } from "../leadershipPdf";

import { getDocumentCopy } from "./documentCopy";
import { buildGovernanceExplainer } from "./governanceCopy";
import {
  buildHierarchyCertificatePresentation,
  resolveCertificateHierarchyLevel,
} from "./hierarchyCertificateDesign";
import { resolveHierarchyLevelFromLeader } from "../certificateEngine/resolveLevel";

import { PREMIUM_A4 } from "./premiumDesignSystem";

import { renderUltraPremiumCertificatePage } from "./premiumCertificateRenderer";

import type { AdvancedLeadershipPdfInput, BuiltLeadershipPdf } from "./types";

function portalBase(input?: string): string {

  const o = input ?? (typeof window !== "undefined" ? window.location.origin : "");

  return String(o || "").replace(/\/$/, "") || "https://v0-church-portal-tanzania.vercel.app";

}



function hierarchyLabel(leader: AdvancedLeadershipPdfInput["leader"]): string {

  return (

    [leader.dayosisi, leader.jimbo, leader.tawi, leader.idara_name, leader.jumuiya_name]

      .map((s) => String(s ?? "").trim())

      .filter(Boolean)

      .join(" · ") ||

    leader.leadership_level ||

    leader.ngazi ||

    "KMK(T)"

  );

}



function detailRows(input: AdvancedLeadershipPdfInput, serial: string, issued: string): string[][] {

  const L = input.leader;

  const f = input.autoFill?.fields;

  const pick = (key: string, fallback: string) => {

    const cell = f?.[key];

    if (cell?.filled && cell.display !== "—") return cell.display;

    return fallback;

  };

  return [

    ["Jina kamili", pick("fullName", L.jina || L.full_name || "—")],

    ["Cheo / Nafasi", pick("positionTitle", L.cheo || "—")],

    ["Ngazi ya uongozi", pick("hierarchyLabel", hierarchyLabel(L))],

    ["Dayosisi", pick("dayosisi", L.dayosisi || "—")],

    ["Jimbo", pick("jimbo", L.jimbo || "—")],

    ["Tawi", pick("tawi", L.tawi || "—")],

    ["Simu / WhatsApp", pick("phone", [L.simu, L.whatsapp].filter(Boolean).join(" / ") || "—")],

    ["Barua pepe", pick("email", L.email || "—")],

    ["Mkoa / Wilaya", pick("mkoa", [L.mkoa, L.wilaya].filter(Boolean).join(" / ") || "—")],

    ["Nambari ya cheti", input.officialCertificateNumber || serial],

    ["ID ya uhakiki", input.verificationId || serial],

    ["Tarehe ya kutolewa", issued],

    ["Aliidhinisha", pick("approvedByName", L.pdf_issued_by_name || input.approverName || "—")],

    ["Cheo cha mhakiki", pick("approvedByTitle", L.pdf_issued_by_title || input.approverTitle || "—")],

  ];

}



/** PDF ya ukurasa mmoja — Ultra Premium KMK(T) design system (A4 print-perfect). */

export async function buildAdvancedLeadershipPdf(input: AdvancedLeadershipPdfInput): Promise<BuiltLeadershipPdf> {

  if (input.kind === "leadership_cv") {

    const base = portalBase(input.portalBaseUrl);

    const serial = input.verificationSerial ?? formatLeadershipCredentialSerial("CV", input.leader.id);

    const doc = await buildLeaderProfilePdfDocument(input.leader, {

      portalBaseUrl: base,

      logoDataUrl: input.logoDataUrl,

      photoDataUrl: input.photoDataUrl,

      signatureDataUrl: input.signatureDataUrl,

      bundle: input.autoFill?.cvBundle ?? null,

    });

    const safe = (input.leader.jina || "kiongozi").replace(/\s+/g, "-").slice(0, 40);

    return {

      doc,

      filename: `wasifu-kiongozi-${safe}.pdf`,

      verifyUrl: buildLeadershipVerificationUrl(base, "church", input.leader.id),

      displaySerial: serial,

    };

  }



  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const margin = PREMIUM_A4.margin;

  const baseCopy = getDocumentCopy(input.kind);

  const base = portalBase(input.portalBaseUrl);

  const verifyUrl =

    input.verificationId?.trim()

      ? buildOfficialCertificateVerificationUrl(base, input.verificationId)

      : buildLeadershipVerificationUrl(base, "church", input.leader.id);

  const serial = input.verificationSerial ?? formatLeadershipCredentialSerial("CHT", input.leader.id);

  const issued = new Date().toLocaleDateString("sw-TZ", { dateStyle: "long" });

  const name = input.leader.jina || input.leader.full_name || "—";

  const cheo = input.leader.cheo || "—";

  const hierarchy = hierarchyLabel(input.leader);

  const level = input.leader.leadership_level ?? input.leader.ngazi ?? undefined;



  const hierarchyLevel = resolveCertificateHierarchyLevel({
    leader: input.leader,
    hierarchyLevel: resolveHierarchyLevelFromLeader(input.leader),
    cheo: input.leader.cheo,
    leadershipLevel: level,
    roleKey: input.autoFill?.enrichedNational?.role_key,
  });

  const hierarchyPresentation = buildHierarchyCertificatePresentation({
    kind: input.kind,
    level: hierarchyLevel,
    baseCopy,
  });
  const copy = hierarchyPresentation.copy;
  const theme = hierarchyPresentation.theme;



  const qr = await fetchUrlAsPdfImageDataUrl(

    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(verifyUrl)}`,

  );



  const photo =

    input.photoDataUrl?.trim() ||

    (input.leader.photo_url ? await fetchUrlAsPdfImageDataUrl(input.leader.photo_url) : null);

  const sig =

    input.signatureDataUrl?.trim() ||

    (input.leader.signature_url ? await fetchUrlAsPdfImageDataUrl(input.leader.signature_url) : null);



  const bodyText = copy.bodyTemplate({ name, cheo, hierarchy });

  const governance = buildGovernanceExplainer({
    kind: input.kind,
    hierarchy,
    cheo,
    leadershipLevel: level,
    hierarchyLevelKey: hierarchyLevel,
    approverTitle: input.approverTitle || input.leader.pdf_issued_by_title || undefined,
  });

  renderUltraPremiumCertificatePage({
    doc,
    copy,
    kind: input.kind,
    margin,
    logoDataUrl: input.logoDataUrl?.trim() || null,
    qrDataUrl: qr,
    orgLines: input.institutionalLines,
    name,
    cheo,
    hierarchy,
    leadershipLevel: level,
    bodyText,
    detailRows: detailRows(input, serial, issued),
    photoDataUrl: photo,
    signatureDataUrl: sig,
    certificateNumber: input.officialCertificateNumber || serial,
    verificationId: input.verificationId || serial,
    approverName: input.approverName || input.leader.pdf_issued_by_name || undefined,
    approverTitle: input.approverTitle || input.leader.pdf_issued_by_title || undefined,
    governance,
    verifyUrl,
    theme,
    levelRibbon: hierarchyPresentation.levelRibbon,
    localSealText: hierarchyPresentation.localSealText,
    watermarkLine2: hierarchyPresentation.watermarkLine2,
  });



  const kindSlug = input.kind.replace(/_/g, "-");

  const safe = (input.leader.jina || "kiongozi").replace(/\s+/g, "-").slice(0, 32);

  return {

    doc,

    filename: `${kindSlug}-${safe}.pdf`,

    verifyUrl,

    displaySerial: input.officialCertificateNumber || input.verificationId || serial,

  };

}



/** Pakua moja kwa moja (legacy). */

export async function downloadAdvancedLeadershipPdf(input: AdvancedLeadershipPdfInput): Promise<BuiltLeadershipPdf> {

  const built = await buildAdvancedLeadershipPdf(input);

  built.doc.save(built.filename);

  return built;

}

