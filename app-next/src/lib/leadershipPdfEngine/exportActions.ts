import type { jsPDF } from "jspdf";

export function suggestedFilename(base: string, ext = "pdf"): string {
  const safe = base.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").slice(0, 48);
  return `${safe || "kmkt-document"}.${ext}`;
}

/** Pakua PDF (save). */
export function downloadLeadershipPdf(doc: jsPDF, filename: string): void {
  doc.save(suggestedFilename(filename.replace(/\.pdf$/i, "")));
}

/** Chapisha — dirisha jipya na print (print-perfect A4). Rudisha false ikiwa popup imezuiwa. */
export function printLeadershipPdf(doc: jsPDF): boolean {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  w.addEventListener("load", () => {
    try {
      w.focus();
      w.print();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  });
  return true;
}

/** Shiriki (Web Share API) au pakua kama fallback. */
export async function shareLeadershipPdf(doc: jsPDF, filename: string): Promise<boolean> {
  const name = suggestedFilename(filename.replace(/\.pdf$/i, ""));
  const blob = doc.output("blob");
  const file = new File([blob], name, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: name, files: [file] });
      return true;
    } catch {
      /* user cancelled */
    }
  }
  downloadLeadershipPdf(doc, name);
  return false;
}

export function leadershipPdfBlobUrl(doc: jsPDF): string {
  return URL.createObjectURL(doc.output("blob"));
}

export function revokePdfBlobUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

/** Pakua PDF bila compression ili kuboresha ubora (production export). */
export function downloadLeadershipPdfHiRes(doc: jsPDF, filename: string): void {
  const name = suggestedFilename(filename.replace(/\.pdf$/i, ""), "pdf");
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Fungua PDF katika kichupo kipya (hakiki kabla ya kupakua). */
export function openLeadershipPdfPreview(doc: jsPDF): string {
  const url = leadershipPdfBlobUrl(doc);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) revokePdfBlobUrl(url);
  return url;
}

/** Chapisha HTML preview (A4) — print-perfect bila layout shift. */
export function printHtmlMasterPreview(root: HTMLElement): void {
  const prev = root.className;
  root.classList.add("print-pdf-master-doc", "leadership-doc-print");
  const cleanup = () => {
    root.classList.remove("print-pdf-master-doc");
    if (!prev.includes("leadership-doc-print")) root.classList.remove("leadership-doc-print");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
