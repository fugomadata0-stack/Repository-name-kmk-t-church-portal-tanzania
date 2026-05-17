import type { jsPDF } from "jspdf";
import {
  downloadLeadershipPdf,
  downloadLeadershipPdfHiRes,
  leadershipPdfBlobUrl,
  openLeadershipPdfPreview,
  printHtmlMasterPreview,
  printLeadershipPdf,
  revokePdfBlobUrl,
  shareLeadershipPdf,
  suggestedFilename,
} from "./exportActions";

export type PdfExportResult = { ok: true } | { ok: false; message: string };

function fail(action: string, e: unknown): PdfExportResult {
  const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
  console.error(`[pdf-export:${action}]`, e);
  return { ok: false, message: msg };
}

export function safeDownloadLeadershipPdf(doc: jsPDF, filename: string): PdfExportResult {
  try {
    downloadLeadershipPdf(doc, filename);
    return { ok: true };
  } catch (e) {
    return fail("download", e);
  }
}

export function safePrintLeadershipPdf(doc: jsPDF): PdfExportResult {
  try {
    if (!printLeadershipPdf(doc)) {
      return { ok: false, message: "Dirisha la chapisho limezuiwa. Ruhusu popups au pakua PDF kisha chapisha." };
    }
    return { ok: true };
  } catch (e) {
    return fail("print", e);
  }
}

export async function safeShareLeadershipPdf(doc: jsPDF, filename: string): Promise<PdfExportResult> {
  try {
    await shareLeadershipPdf(doc, filename);
    return { ok: true };
  } catch (e) {
    return fail("share", e);
  }
}

export function safeDownloadLeadershipPdfHiRes(doc: jsPDF, filename: string): PdfExportResult {
  try {
    downloadLeadershipPdfHiRes(doc, filename);
    return { ok: true };
  } catch (e) {
    return fail("hires", e);
  }
}

export function safeOpenLeadershipPdfPreview(doc: jsPDF): PdfExportResult & { url?: string } {
  try {
    const url = openLeadershipPdfPreview(doc);
    return { ok: true, url };
  } catch (e) {
    return fail("preview", e);
  }
}

export function safePrintHtmlMasterPreview(root: HTMLElement): PdfExportResult {
  try {
    printHtmlMasterPreview(root);
    return { ok: true };
  } catch (e) {
    return fail("print-html", e);
  }
}

export function safeLeadershipPdfBlobUrl(doc: jsPDF): PdfExportResult & { url?: string } {
  try {
    return { ok: true, url: leadershipPdfBlobUrl(doc) };
  } catch (e) {
    return fail("blob-url", e);
  }
}

export function safeRevokePdfBlobUrl(url: string): void {
  try {
    revokePdfBlobUrl(url);
  } catch {
    /* ignore */
  }
}

export function safeSuggestedFilename(base: string, ext = "pdf"): string {
  try {
    return suggestedFilename(base, ext);
  } catch {
    return `kmkt-document.${ext}`;
  }
}
