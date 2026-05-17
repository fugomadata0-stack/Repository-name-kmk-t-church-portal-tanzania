import { useCallback, useState, type RefObject } from "react";
import { Download, ExternalLink, ImageDown, Printer, Share2, Sparkles } from "lucide-react";
import type { BuiltLeadershipPdf } from "../../lib/leadershipPdfEngine/types";
import {
  safeDownloadLeadershipPdf,
  safeDownloadLeadershipPdfHiRes,
  safeOpenLeadershipPdfPreview,
  safePrintHtmlMasterPreview,
  safePrintLeadershipPdf,
  safeShareLeadershipPdf,
} from "../../lib/leadershipPdfEngine/exportActionsSafe";
import { downloadDomAsPng } from "../../lib/certificatePreviewPng";

type Props = {
  built: BuiltLeadershipPdf | null;
  previewRef?: RefObject<HTMLElement | null>;
  previewFilename?: string;
  busy?: boolean;
  disabled?: boolean;
  onDone?: () => void;
  onError?: (message: string) => void;
};

export function PrintPdfMasterToolbar({
  built,
  previewRef,
  previewFilename = "kmkt-document",
  busy,
  disabled,
  onDone,
  onError,
}: Props) {
  const [localBusy, setLocalBusy] = useState(false);
  const isBusy = busy || localBusy;

  const run = useCallback(
    async (action: "download" | "hires" | "print" | "printHtml" | "share" | "preview" | "png") => {
      if (disabled) return;
      setLocalBusy(true);
      try {
        let result: { ok: boolean; message?: string } = { ok: true };
        if (action === "printHtml") {
          const el = previewRef?.current;
          if (!el) return;
          result = safePrintHtmlMasterPreview(el);
        } else if (!built) {
          return;
        } else if (action === "download") {
          result = safeDownloadLeadershipPdf(built.doc, built.filename);
        } else if (action === "hires") {
          result = safeDownloadLeadershipPdfHiRes(built.doc, built.filename);
        } else if (action === "print") {
          result = safePrintLeadershipPdf(built.doc);
        } else if (action === "share") {
          result = await safeShareLeadershipPdf(built.doc, built.filename);
        } else if (action === "preview") {
          result = safeOpenLeadershipPdfPreview(built.doc);
        } else if (action === "png") {
          const el = previewRef?.current;
          if (el) await downloadDomAsPng(el, previewFilename, 3);
        }
        if (!result.ok) {
          onError?.(result.message ?? "Imeshindwa kutoa PDF.");
          return;
        }
        onDone?.();
      } catch (e) {
        onError?.(e instanceof Error ? e.message : "Imeshindwa kutoa PDF.");
      } finally {
        setLocalBusy(false);
      }
    },
    [built, disabled, onDone, onError, previewFilename, previewRef],
  );

  const btn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold disabled:opacity-50 sm:flex-none sm:px-3";

  return (
    <div className="space-y-2 rounded-xl border border-[#0B1F3A]/10 bg-gradient-to-br from-slate-50 to-amber-50/30 p-2">
      <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#0B1F3A]">
        Print & PDF Master Engine
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!built || isBusy || disabled}
          onClick={() => void run("print")}
          className={`${btn} border-[#0B1F3A]/15 bg-white text-[#0B1F3A] hover:border-amber-400/50`}
        >
          <Printer className="h-4 w-4 shrink-0" aria-hidden />
          Chapisha
        </button>
        <button
          type="button"
          disabled={!previewRef?.current || isBusy || disabled}
          onClick={() => void run("printHtml")}
          className={`${btn} border-[#0B1F3A]/15 bg-white text-[#0B1F3A] hover:border-amber-400/50`}
          title="Chapisha hakiki ya HTML (A4)"
        >
          <Printer className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          Chapisha HTML
        </button>
        <button
          type="button"
          disabled={!built || isBusy || disabled}
          onClick={() => void run("download")}
          className={`${btn} border-[#0B1F3A]/15 bg-white text-[#0B1F3A] hover:border-amber-400/50`}
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          Pakua PDF
        </button>
        <button
          type="button"
          disabled={!built || isBusy || disabled}
          onClick={() => void run("hires")}
          className={`${btn} border-amber-300/60 bg-amber-50 text-amber-950 hover:bg-amber-100`}
          title="PDF bila compression"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          PDF Hi-Res
        </button>
        <button
          type="button"
          disabled={!previewRef?.current || isBusy || disabled}
          onClick={() => void run("png")}
          className={`${btn} border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100`}
        >
          <ImageDown className="h-4 w-4 shrink-0" aria-hidden />
          PNG Hi-Res
        </button>
        <button
          type="button"
          disabled={!built || isBusy || disabled}
          onClick={() => void run("preview")}
          className={`${btn} border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100`}
        >
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          Hakiki
        </button>
        <button
          type="button"
          disabled={!built || isBusy || disabled}
          onClick={() => void run("share")}
          className={`${btn} border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100`}
        >
          <Share2 className="h-4 w-4 shrink-0" aria-hidden />
          Shiriki
        </button>
      </div>
      {built?.verifyUrl ? (
        <p className="truncate px-1 text-[10px] text-slate-500" title={built.verifyUrl}>
          Uhakiki: {built.displaySerial}
        </p>
      ) : null}
    </div>
  );
}
