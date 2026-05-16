import { ModalScrollLayer } from "./ModalScrollLayer";
import { ResponsiveLazyImage } from "./ResponsiveLazyImage";
import { safeLower } from "../../lib/safe";

export type DocumentPreviewModalProps = {
  open: boolean;
  title: string;
  fileUrl: string;
  mimeType?: string | null;
  onClose: () => void;
};

function isPdf(url: string, mime?: string | null): boolean {
  const low = safeLower(url);
  return safeLower(mime ?? "").includes("pdf") || low.endsWith(".pdf");
}

function isImage(url: string, mime?: string | null): boolean {
  const low = safeLower(url);
  if (safeLower(mime ?? "").startsWith("image/")) return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) => low.endsWith(ext));
}

export function DocumentPreviewModal({ open, title, fileUrl, mimeType, onClose }: DocumentPreviewModalProps) {
  if (!open || !fileUrl.trim()) return null;

  return (
    <ModalScrollLayer onBackdropClick={onClose} maxWidthClass="max-w-4xl">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#0B1F3A]">{title || "Onyesho la nyaraka"}</h3>
          <div className="flex gap-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] hover:bg-slate-50"
            >
              Pakua
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Funga
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] min-h-[240px] overflow-auto rounded-xl border border-slate-200 bg-slate-50">
          {isPdf(fileUrl, mimeType) ? (
            <iframe title={title} src={fileUrl} className="h-[min(70vh,720px)] w-full min-h-[400px]" />
          ) : isImage(fileUrl, mimeType) ? (
            <div className="relative mx-auto aspect-[4/3] max-w-2xl p-2">
              <ResponsiveLazyImage src={fileUrl} alt={title} className="rounded-lg" loading="eager" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-slate-600">
              <p>Hakuna onyesho la ndani kwa aina hii ya faili.</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">
                Fungua kwenye kichupo kipya
              </a>
            </div>
          )}
        </div>
      </div>
    </ModalScrollLayer>
  );
}
