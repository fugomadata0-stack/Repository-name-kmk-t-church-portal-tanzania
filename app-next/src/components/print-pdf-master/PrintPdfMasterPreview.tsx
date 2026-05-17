import { useMemo } from "react";
import { KMKT_OFFICIAL_NAME, KMKT_SHORT_NAME } from "../../data/kmktCanonicalContent";
import { KMK_PREMIUM_HEX, PREMIUM_PREVIEW_CSS } from "../../lib/leadershipPdfEngine/premiumDesignSystem";
import type { GovernanceExplainer } from "../../lib/leadershipPdfEngine/governanceCopy";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";

export type PrintPdfMasterPreviewProps = {
  fullName: string;
  certTitleSw: string;
  certTitleEn?: string;
  hierarchy: string;
  cheo?: string;
  biography?: string;
  logoUrl?: string | null;
  photoUrl?: string | null;
  verifyUrl?: string | null;
  certificateNumber?: string;
  verificationId?: string;
  governance?: GovernanceExplainer | null;
  headerGradient?: string;
  className?: string;
};

function qrSrc(verifyUrl: string | null | undefined): string | null {
  const u = String(verifyUrl ?? "").trim();
  if (!u) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(u)}`;
}

export function PrintPdfMasterPreview({
  fullName,
  certTitleSw,
  certTitleEn,
  hierarchy,
  cheo,
  biography,
  logoUrl,
  photoUrl,
  verifyUrl,
  certificateNumber,
  verificationId,
  governance,
  headerGradient,
  className = "",
}: PrintPdfMasterPreviewProps) {
  const qr = useMemo(() => qrSrc(verifyUrl), [verifyUrl]);

  return (
    <article
      className={`print-pdf-master-doc leadership-doc-print mx-auto w-full max-w-[210mm] overflow-hidden rounded-sm bg-white shadow-xl ${className}`.trim()}
      style={{
        aspectRatio: "210 / 297",
        border: PREMIUM_PREVIEW_CSS.goldBorder,
        background: PREMIUM_PREVIEW_CSS.paperBg,
      }}
    >
      <header
        className="relative px-4 pb-3 pt-4 text-center text-white sm:px-6"
        style={{ background: headerGradient ?? PREMIUM_PREVIEW_CSS.headerGradient }}
      >
        {logoUrl ? (
          <ResponsiveLazyImage
            src={logoUrl}
            alt=""
            className="mx-auto mb-2 h-14 w-14 rounded-full border-2 border-amber-300/80 object-cover"
          />
        ) : null}
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/90">{KMKT_SHORT_NAME}</p>
        <p className="text-xs font-semibold leading-tight">{KMKT_OFFICIAL_NAME}</p>
        <h2 className="mt-2 text-base font-bold uppercase tracking-wide text-amber-100 sm:text-lg">{certTitleSw}</h2>
        {certTitleEn ? <p className="text-xs italic text-amber-200/90">{certTitleEn}</p> : null}
        <p className="mt-1 text-[10px] text-slate-200">{hierarchy}</p>
        {qr ? (
          <img
            src={qr}
            alt="QR uhakiki"
            className="absolute right-3 top-3 h-16 w-16 rounded border border-amber-300/60 bg-white p-0.5"
          />
        ) : null}
      </header>

      <section className="relative border-y-4 border-double border-amber-400/90 px-4 py-4 sm:px-6">
        <span
          className="pointer-events-none absolute inset-y-6 left-2 w-1 rounded-full bg-gradient-to-b from-amber-400 via-[#123C69] to-emerald-500 opacity-80"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-y-6 right-2 w-1 rounded-full bg-gradient-to-b from-amber-400 via-[#123C69] to-emerald-500 opacity-80"
          aria-hidden
        />

        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hii hati inatolewa kwa</p>
        <h3
          className="mt-1 text-center text-xl font-bold sm:text-2xl"
          style={{ color: KMK_PREMIUM_HEX.navy, fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {fullName}
        </h3>
        {cheo ? (
          <p className="mt-1 text-center text-sm font-bold uppercase" style={{ color: KMK_PREMIUM_HEX.royal }}>
            {cheo}
          </p>
        ) : null}

        {photoUrl ? (
          <ResponsiveLazyImage
            src={photoUrl}
            alt=""
            className="float-right ml-3 mb-2 mt-2 h-24 w-20 rounded border-2 border-amber-400/70 object-cover sm:h-28 sm:w-[5.5rem]"
          />
        ) : null}

        {biography ? (
          <p className="mt-3 clear-both text-justify text-xs leading-relaxed text-slate-700" style={{ fontFamily: "Georgia, serif" }}>
            {biography}
          </p>
        ) : null}

        {governance ? (
          <div className="mt-4 grid gap-2 border border-amber-200/80 bg-amber-50/40 p-2 text-[9px] leading-snug text-slate-700 sm:grid-cols-3 sm:text-[10px]">
            <div>
              <p className="font-bold text-[#0B1F3A]">HATI / DOCUMENT</p>
              <p>{governance.documentPurposeSw}</p>
            </div>
            <div>
              <p className="font-bold text-[#0B1F3A]">NGAZI / LEVEL</p>
              <p>{governance.levelExplainerSw}</p>
            </div>
            <div>
              <p className="font-bold text-[#0B1F3A]">IDHINI / AUTHORITY</p>
              <p>{governance.approvalAuthoritySw}</p>
            </div>
            <p className="col-span-full text-center text-[9px] italic text-slate-500">{governance.hierarchyChain}</p>
          </div>
        ) : null}
      </section>

      <footer className="flex flex-wrap items-end justify-between gap-2 border-t border-amber-300/50 px-4 py-3 text-[9px] text-slate-600 sm:px-6">
        <div>
          {certificateNumber ? <p>Nambari: {certificateNumber}</p> : null}
          {verificationId ? <p>Uhakiki: {verificationId}</p> : null}
        </div>
        {qr ? <img src={qr} alt="" className="h-14 w-14 border border-amber-200 bg-white p-0.5" /> : <span className="italic">QR</span>}
        <p className="text-right">A4 · Print & PDF Master · {KMKT_SHORT_NAME}</p>
      </footer>
    </article>
  );
}
