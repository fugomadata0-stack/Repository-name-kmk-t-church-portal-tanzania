import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ModalScrollLayer } from "../common/ModalScrollLayer";
import {
  ExecutiveInstitutionalCertificatePreview,
  type InstitutionalCertificatePreviewProps,
} from "./ExecutiveInstitutionalCertificatePreview";

export type LeadershipDocumentPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  preview: InstitutionalCertificatePreviewProps;
  onDownloadPdf?: () => Promise<void> | void;
  pdfBusy?: boolean;
  onSaveDraft?: () => void;
};

export function LeadershipDocumentPreviewModal({
  open,
  onClose,
  title,
  preview,
  onDownloadPdf,
  pdfBusy = false,
  onSaveDraft,
}: LeadershipDocumentPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [paperMode, setPaperMode] = useState(true);

  const clampZoom = useCallback((z: number) => Math.min(1.6, Math.max(0.55, Math.round(z * 100) / 100)), []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(async () => {
    const text = `${preview.fullName} — ${preview.titleSw} · ${title}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      /* cancelled */
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch {
      /* ignore */
    }
  }, [preview.fullName, preview.titleSw, title]);

  if (!open) return null;

  return (
    <ModalScrollLayer
      onBackdropClick={onClose}
      maxWidthClass="max-w-6xl"
      overlayClassName="fixed inset-0 z-[60] overflow-y-auto bg-black/55 px-2 py-3 backdrop-blur-md sm:px-4 sm:py-8"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full rounded-2xl border border-amber-200/40 bg-gradient-to-b from-slate-50 to-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <motion.div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700/90">Hakiki ya hati · Live preview</p>
            <h2 className="font-kmkt-display mt-1 text-xl font-bold text-[#0B1F3A] sm:text-2xl">{title}</h2>
          </motion.div>
          <motion.div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z - 0.1))}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z + 0.1))}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPaperMode((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              {paperMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {paperMode ? "Karatasi" : "Kamili"}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 p-2 text-white hover:bg-slate-900" aria-label="Funga">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          ref={printRef}
          className={`leadership-doc-print mx-auto overflow-auto rounded-xl transition-all ${
            paperMode ? "max-h-[min(72vh,820px)] bg-slate-200/80 p-4 sm:p-8 shadow-inner" : "max-h-[min(85vh,900px)]"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${zoom}-${paperMode}`}
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 1 }}
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
              className="mx-auto w-full max-w-3xl origin-top"
            >
              <ExecutiveInstitutionalCertificatePreview {...preview} embedded />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div className="mt-5 flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 pt-4">
          {onDownloadPdf ? (
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void onDownloadPdf()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B1F3A] to-[#123C69] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0B1F3A]/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Pakua PDF
            </button>
          ) : null}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Chapisha
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-[#0B1F3A] shadow-sm hover:bg-amber-100"
          >
            <Share2 className="h-4 w-4" />
            Shiriki
          </button>
          {onSaveDraft ? (
            <button
              type="button"
              onClick={onSaveDraft}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hifadhi rasimu
            </button>
          ) : null}
        </motion.div>
      </motion.div>
    </ModalScrollLayer>
  );
}
