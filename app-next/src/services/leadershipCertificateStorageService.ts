import type { jsPDF } from "jspdf";
import { enterpriseStorageUpload, PORTAL_DOCUMENT_FILE_GUARD } from "../lib/enterpriseStorageUpload";
import { STORAGE_BUCKETS } from "../lib/storageBuckets";
import { buildSafeStoragePath } from "../lib/storageUpload";
import { formatPostgrestError } from "../lib/supabaseErrors";
import { getSupabase } from "../lib/supabaseClient";
import type { CredentialDocumentKind } from "../lib/certificateEngine";

export type PersistOfficialPdfInput = {
  officialCertificateId: string;
  leaderId?: string | null;
  nationalRoleKey?: string | null;
  documentKind: CredentialDocumentKind;
  doc: jsPDF;
  filename: string;
  verifyUrl?: string | null;
};

/** Pakia PDF ya cheti rasmi kwenye Storage na sasisha rekodi (si lazima — hitilafu hazivurugi pakua). */
export async function persistOfficialCertificatePdfOptional(
  input: PersistOfficialPdfInput,
): Promise<{ storagePath: string | null }> {
  const c = getSupabase();
  if (!c || !input.officialCertificateId.trim()) return { storagePath: null };

  try {
    const blob = input.doc.output("blob") as Blob;
    const safeName = String(input.filename || "cheti.pdf")
      .replace(/[^\w.-]+/g, "_")
      .slice(0, 120);
    const file = new File([blob], safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`, {
      type: "application/pdf",
    });
    const folder =
      input.leaderId?.trim() ||
      (input.nationalRoleKey?.trim() ? `national/${input.nationalRoleKey.trim()}` : "misc");
    const path = buildSafeStoragePath(
      `${folder}/${input.documentKind}/${input.officialCertificateId}`,
      file.name,
    );

    const uploaded = await enterpriseStorageUpload({
      bucket: STORAGE_BUCKETS.leadershipCertificateAssets,
      file,
      path,
      guard: PORTAL_DOCUMENT_FILE_GUARD,
      upsert: true,
      optimizeImage: false,
    });

    const patch: Record<string, unknown> = {
      pdf_storage_path: uploaded.path,
      pdf_file_name: file.name,
      pdf_mime_type: "application/pdf",
      pdf_bytes: uploaded.bytes,
    };
    if (input.verifyUrl?.trim()) {
      patch.verify_url = input.verifyUrl.trim();
      patch.qr_payload = input.verifyUrl.trim();
    }

    const upd = await c
      .from("leadership_official_certificates")
      .update(patch)
      .eq("id", input.officialCertificateId);
    if (upd.error) {
      console.warn(
        "[leadership_official_certificates.pdf]",
        formatPostgrestError(upd.error, "update pdf path"),
      );
    }

    return { storagePath: uploaded.path };
  } catch (e) {
    console.warn("[leadershipCertificateStorage]", e);
    return { storagePath: null };
  }
}
