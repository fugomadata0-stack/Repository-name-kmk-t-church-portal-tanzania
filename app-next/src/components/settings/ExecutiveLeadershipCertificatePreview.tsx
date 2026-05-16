import { useRef, useState } from "react";
import { ImageDown, Loader2 } from "lucide-react";
import { downloadDomAsPng } from "../../lib/certificatePreviewPng";
import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";
import { nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";

const ORG = [
  "KANISA LA MENNONITE LA KIINJILI TANZANIA KMK(T)",
  "S.L.P 317",
  "MUSOMA — MARA",
  "TANZANIA",
];

/**
 * Muonekano wa hakiki wa cheti (skrini) — hulingana na muundo wa PDF ya uongozi wa kitaifa.
 * Hamisho la PNG la hakiki (html2canvas, lazy).
 */
export function ExecutiveLeadershipCertificatePreview({ row }: { row: NationalLeadershipProfileRow }) {
  const certRef = useRef<HTMLDivElement>(null);
  const [pngBusy, setPngBusy] = useState(false);
  const titleSw = nationalLeadershipDisplayTitle(row, "sw");
  const titleEn = nationalLeadershipDisplayTitle(row, "en");

  async function onPngCertificate() {
    if (!certRef.current) return;
    setPngBusy(true);
    try {
      const base = `hakiki-cheti-${row.role_key}-${(row.full_name || "kmkt").replace(/\s+/g, "-").slice(0, 28)}`;
      await downloadDomAsPng(certRef.current, base);
    } finally {
      setPngBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-b from-slate-50 to-[#fffdf7] p-3 shadow-inner sm:p-4">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hakiki cheti / Print preview</p>
      <div
        ref={certRef}
        className="mx-auto max-w-lg overflow-hidden rounded-xl border-[3px] border-double border-[#D4AF37] bg-white shadow-[0_12px_40px_-20px_rgba(11,31,58,0.45)] ring-1 ring-[#0B1F3A]/10"
      >
        <div className="relative bg-gradient-to-br from-[#071832] via-[#0B1F3A] to-[#123C69] px-4 py-5 text-center text-white">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-22deg] select-none font-serif text-5xl font-bold text-white">
              KMK(T)
            </div>
          </div>
          <div className="relative space-y-1.5">
            {ORG.map((line) => (
              <p key={line} className="text-[10px] font-medium uppercase leading-snug tracking-wide text-amber-100/95">
                {line}
              </p>
            ))}
            <div className="mx-auto my-2 h-px w-24 bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
            <h4 className="font-kmkt-display text-lg font-bold leading-tight text-white sm:text-xl">WASIFU RASMI WA KIONGOZI</h4>
            <p className="text-xs italic text-amber-100/90">Executive Leadership Profile</p>
            <p className="text-[11px] font-medium text-blue-100/90">
              {titleSw}
              {titleEn && titleEn !== titleSw ? ` · ${titleEn}` : null}
            </p>
          </div>
        </div>

        <div className="relative border-t-2 border-[#D4AF37] px-4 py-5">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]" aria-hidden>
            <span className="rotate-[-18deg] text-6xl font-bold text-[#0B1F3A]">✠</span>
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0B1F3A]">Jina rasmi</p>
              <p className="font-kmkt-display text-xl font-bold text-[#0B1F3A]">{row.full_name.trim() || "—"}</p>
              <p className="text-sm font-semibold text-emerald-800">{titleSw}</p>
              <p className="text-xs leading-relaxed text-slate-600 line-clamp-4">{row.leadership_quote || row.biography || "—"}</p>
            </div>
            <div className="mx-auto shrink-0 sm:mx-0">
              <div className="relative rounded-lg border-2 border-[#D4AF37] bg-[#fffdf7] p-1 shadow-md ring-1 ring-[#0B1F3A]/15">
                <div className="h-28 w-24 overflow-hidden rounded bg-slate-100 sm:h-32 sm:w-28">
                  {row.profile_photo_url ? (
                    <ResponsiveLazyImage
                      src={row.profile_photo_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      width={224}
                      height={280}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] font-semibold uppercase text-slate-400">Picha</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-[11px] text-slate-700">
            <span className="font-semibold text-[#0B1F3A]">QR &amp; saini </span>
            zinaonyeshwa kwenye PDF iliyopakuliwa — thibitisho na idhini rasmi.
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          disabled={pngBusy}
          aria-busy={pngBusy}
          onClick={() => void onPngCertificate()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {pngBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImageDown className="h-3.5 w-3.5" aria-hidden />}
          Pakua hakiki (PNG)
        </button>
      </div>
    </div>
  );
}
