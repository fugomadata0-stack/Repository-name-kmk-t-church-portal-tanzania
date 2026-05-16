import { useRef, useState } from "react";
import { ImageDown, Loader2 } from "lucide-react";
import { downloadDomAsPng } from "../../lib/certificatePreviewPng";
import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";
import { nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";

/**
 * Kadi fupi ya kiongozi (muonekano wa mtandao + hamisho la PNG).
 */
export function ExecutiveLeadershipProfileCard({ row }: { row: NationalLeadershipProfileRow }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const titleSw = nationalLeadershipDisplayTitle(row, "sw");

  async function onPng() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const base = `kadi-kiongozi-${row.role_key}-${(row.full_name || "kmkt").replace(/\s+/g, "-").slice(0, 24)}`;
      await downloadDomAsPng(cardRef.current, base);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Kadi ya kiongozi / Executive card</p>
      <div
        ref={cardRef}
        className="mx-auto flex w-full max-w-md overflow-hidden rounded-xl border-2 border-[#D4AF37] bg-gradient-to-r from-[#071832] via-[#0B1F3A] to-[#123C69] shadow-lg ring-1 ring-black/10"
      >
        <div className="relative w-[30%] min-w-[96px] shrink-0 border-r-2 border-[#D4AF37]/50 bg-[#0a1a33]">
          {row.profile_photo_url ? (
            <ResponsiveLazyImage
              src={row.profile_photo_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              width={200}
              height={260}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[112px] items-center justify-center p-2 text-center text-[9px] font-semibold uppercase text-slate-500">
              Picha
            </div>
          )}
        </div>
        <div className="relative min-w-0 flex-1 px-3 py-3 text-white">
          <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-full bg-amber-400/10" aria-hidden />
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/90">KMK(T)</p>
          <p className="mt-1 truncate font-kmkt-display text-base font-bold leading-tight sm:text-lg">{row.full_name.trim() || "—"}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-emerald-200">{titleSw}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-blue-100/90">
            {row.leadership_quote?.trim() || row.biography?.trim() || "—"}
          </p>
          <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-[10px] leading-tight text-blue-50/95">
            {row.phone.trim() ? <p className="truncate">Simu: {row.phone.trim()}</p> : null}
            {row.email.trim() ? <p className="truncate">Barua: {row.email.trim()}</p> : null}
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void onPng()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImageDown className="h-3.5 w-3.5" aria-hidden />}
          Pakua kadi (PNG)
        </button>
      </div>
    </div>
  );
}
