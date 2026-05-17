import { STORAGE_BUCKETS } from "../../config/storageBuckets";
import type { FileGuardOptions } from "../fileUploadGuard";
import { mbToBytes, UPLOAD_LIMITS_MB } from "../fileUploadGuard";
import { PORTAL_DOCUMENT_FILE_GUARD, PORTAL_IMAGE_FILE_GUARD } from "../enterpriseStorageUpload";
import type { UploadCenterCategory, UploadCenterCategoryConfig } from "./types";

export const UPLOAD_CENTER_CATEGORIES: UploadCenterCategoryConfig[] = [
  { id: "receipt", labelSw: "Risiti / Receipts", labelEn: "Receipts", hint: "Fedha & mapato", moduleKey: "fedha" },
  { id: "report", labelSw: "Ripoti", labelEn: "Reports", hint: "PDF / Excel", moduleKey: "ripoti" },
  { id: "certificate", labelSw: "Vyeti", labelEn: "Certificates", hint: "PDF / picha", moduleKey: "viongozi" },
  { id: "signature", labelSw: "Saini", labelEn: "Signatures", hint: "Picha za saini", moduleKey: "viongozi" },
  { id: "project", labelSw: "Miradi", labelEn: "Projects", hint: "Nyaraka za mradi", moduleKey: "taasisi" },
  { id: "contribution", labelSw: "Fomu za Michango", labelEn: "Contributions", hint: "Excel / CSV / PDF", moduleKey: "mapato_income" },
];

const RECEIPT_GUARD: FileGuardOptions = {
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
  allowedMimePrefixes: ["application/pdf", "image/"],
  maxBytes: mbToBytes(UPLOAD_LIMITS_MB.documents),
  labelSw: "Risiti",
};

const CONTRIBUTION_GUARD: FileGuardOptions = {
  allowedExtensions: [".xlsx", ".xls", ".csv", ".pdf"],
  allowedMimePrefixes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/pdf",
  ],
  maxBytes: mbToBytes(15),
  labelSw: "Fomu ya michango",
};

export function uploadCategoryBucket(category: UploadCenterCategory): string {
  switch (category) {
    case "receipt":
      return STORAGE_BUCKETS.portalUploads;
    case "report":
      return STORAGE_BUCKETS.churchDocuments;
    case "certificate":
      return STORAGE_BUCKETS.certificates;
    case "signature":
      return STORAGE_BUCKETS.leadershipCvAttachments;
    case "project":
      return STORAGE_BUCKETS.churchDocuments;
    case "contribution":
      return STORAGE_BUCKETS.portalUploads;
    default:
      return STORAGE_BUCKETS.portalUploads;
  }
}

export function uploadCategoryPathPrefix(category: UploadCenterCategory, entityId?: string | null): string {
  const base: Record<UploadCenterCategory, string> = {
    receipt: "enterprise/receipts",
    report: "enterprise/reports",
    certificate: "enterprise/certificates",
    signature: "enterprise/signatures",
    project: entityId ? `institution-projects/${entityId}` : "enterprise/projects",
    contribution: "enterprise/contribution-forms",
  };
  return base[category];
}

export function uploadCategoryGuard(category: UploadCenterCategory): FileGuardOptions {
  switch (category) {
    case "receipt":
      return RECEIPT_GUARD;
    case "signature":
      return PORTAL_IMAGE_FILE_GUARD;
    case "certificate":
      return {
        ...PORTAL_DOCUMENT_FILE_GUARD,
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
        labelSw: "Cheti",
      };
    case "contribution":
      return CONTRIBUTION_GUARD;
    case "project":
    case "report":
    default:
      return PORTAL_DOCUMENT_FILE_GUARD;
  }
}

export function isPrivateUploadBucket(bucket: string): boolean {
  return bucket === STORAGE_BUCKETS.leadershipCvAttachments
    || bucket === STORAGE_BUCKETS.leadershipCertificateAssets
    || bucket === STORAGE_BUCKETS.structureLeaders;
}
