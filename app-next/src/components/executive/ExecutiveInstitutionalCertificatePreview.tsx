import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ImageDown, Loader2 } from "lucide-react";
import {
  KMKT_CORE_VALUES,
  KMKT_MISSION,
  KMKT_MOTTO,
  KMKT_OFFICIAL_NAME,
  KMKT_POSTAL_ADDRESS,
  KMKT_SHORT_NAME,
  KMKT_VISION,
} from "../../data/kmktCanonicalContent";
import { downloadDomAsPng } from "../../lib/certificatePreviewPng";
import { resolveLeadershipCertificateTheme } from "../../lib/leadershipCertificateTheme";
import { KMK_PREMIUM_HEX, PREMIUM_PREVIEW_CSS } from "../../lib/leadershipPdfEngine/premiumDesignSystem";
import { ResponsiveLazyImage } from "../common/ResponsiveLazyImage";

export type InstitutionalCertificatePreviewProps = {
  fullName: string;
  titleSw: string;
  titleEn?: string;
  subtitle?: string;
  biography?: string;
  photoUrl?: string | null;
  logoUrl?: string | null;
  serial?: string;
  certificateNumber?: string;
  verificationId?: string;
  verifyUrl?: string | null;
  issuedAtLabel?: string;
  workflowStatusLabel?: string;
  roleKey?: string | null;
  cheo?: string | null;
  leadershipLevel?: string | null;
  documentKind?: "certificate" | "cv";
  certTitleSw?: string;
  certTitleEn?: string;
  watermarkLine2?: string;
  localSealText?: string | null;
  certificateHierarchyLevel?: string | null;
  embedded?: boolean;
};

function qrImageUrl(verifyUrl: string | null | undefined): string | null {
  const u = String(verifyUrl ?? "").trim();
  if (!u) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(u)}`;
}

function CornerFlag({ className }: { className: string }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-16 w-16 sm:h-20 sm:w-20 ${className}`}
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.12 }}
    >
      <div className="absolute left-0 top-0 h-[3px] w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-sky-500 opacity-90" />
      <div className="absolute left-0 top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-emerald-500 via-amber-400 to-slate-900 opacity-90" />
      <div className="absolute left-1 top-1 h-[2px] w-[70%] rounded-full bg-amber-300/80" />
      <div className="absolute left-1 top-1 h-[70%] w-[2px] rounded-full bg-emerald-400/80" />
    </motion.div>
  );
}

export function ExecutiveInstitutionalCertificatePreview({
  fullName,
  titleSw,
  titleEn,
  subtitle,
  biography,
  photoUrl,
  logoUrl,
  serial,
  certificateNumber,
  verificationId,
  verifyUrl,
  issuedAtLabel,
  workflowStatusLabel,
  roleKey,
  cheo,
  leadershipLevel,
  documentKind = "certificate",
  certTitleSw = "CHETI RASMI YA UONGOZI",
  certTitleEn = "Executive Leadership Certificate",
  watermarkLine2,
  localSealText,
  certificateHierarchyLevel,
  embedded = false,
}: InstitutionalCertificatePreviewProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [pngBusy, setPngBusy] = useState(false);
  const qrSrc = useMemo(() => qrImageUrl(verifyUrl), [verifyUrl]);
  const theme = useMemo(
    () =>
      resolveLeadershipCertificateTheme({
        roleKey,
        cheo,
        leadershipLevel,
        hierarchyLevel:
          certificateHierarchyLevel === "tawi" ||
          certificateHierarchyLevel === "jimbo" ||
          certificateHierarchyLevel === "dayosisi" ||
          certificateHierarchyLevel === "national"
            ? certificateHierarchyLevel
            : undefined,
      }),
    [roleKey, cheo, leadershipLevel, certificateHierarchyLevel],
  );

  async function onPng() {
    if (!certRef.current) return;
    setPngBusy(true);
    try {
      await downloadDomAsPng(
        certRef.current,
        `hakiki-${documentKind}-${(fullName || "kmkt").replace(/\s+/g, "-").slice(0, 24)}`
      );
    } finally {
      setPngBusy(false);
    }
  }

  return (
    <div className={embedded ? "" : "space-y-3"}>
      {!embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {theme.label} · Hakiki {documentKind === "cv" ? "CV" : "Cheti"}
          </p>
          <button
            type="button"
            disabled={pngBusy}
            onClick={() => void onPng()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] shadow-sm transition hover:bg-amber-100"
          >
            {pngBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />}
            Pakua PNG
          </button>
        </div>
      ) : null}

        <motion.div
        ref={certRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-[0_24px_70px_-28px_rgba(11,31,58,0.55)] ring-1 ring-[#D4AF37]/30"
        style={{ border: PREMIUM_PREVIEW_CSS.goldBorder, background: PREMIUM_PREVIEW_CSS.paperBg }}
      >
        {watermarkLine2 ? (
          <p
            className="pointer-events-none absolute left-1/2 top-[42%] z-0 -translate-x-1/2 -translate-y-1/2 rotate-[-24deg] select-none text-center font-bold uppercase tracking-[0.35em] text-slate-200/40"
            style={{ fontSize: "clamp(0.55rem, 2vw, 0.7rem)" }}
            aria-hidden
          >
            {watermarkLine2}
          </p>
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(-22deg, transparent, transparent 40px, rgb(${theme.navy.join(",")}) 40px, rgb(${theme.navy.join(",")}) 41px)`,
          }}
          aria-hidden
        />
        <CornerFlag className="left-0 top-0" />
        <CornerFlag className="right-0 top-0 scale-x-[-1]" />
        <CornerFlag className="bottom-0 left-0 scale-y-[-1]" />
        <CornerFlag className="bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />

        <div
          className="relative border-b-2 border-[#D4AF37]/70 px-5 py-7 text-center text-white sm:px-8 sm:py-9"
          style={{ background: theme.headerGradient }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
          <div className="relative mx-auto mb-4 flex max-w-md flex-col items-center gap-3">
            {logoUrl ? (
              <div className="rounded-xl border-2 border-amber-200/50 bg-white/95 p-2 shadow-lg">
                <ResponsiveLazyImage src={logoUrl} alt="" className="h-14 w-14 object-contain" width={56} height={56} priority />
              </div>
            ) : (
              <motion.div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-200/40 bg-white/10 font-kmkt-display text-lg font-black text-amber-100">
                {KMKT_SHORT_NAME}
              </motion.div>
            )}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase leading-[1.65] tracking-[0.2em] text-amber-100/95">
                {KMKT_OFFICIAL_NAME}
              </p>
              <p className="text-[10px] leading-relaxed tracking-wide text-blue-100/90">{KMKT_POSTAL_ADDRESS}</p>
            </div>
          </div>
          <div className="mx-auto my-3 h-px w-28 bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
          <h4 className="font-kmkt-display text-xl font-black leading-[1.35] tracking-tight sm:text-2xl">{certTitleSw}</h4>
          <p className="mt-2 text-sm italic leading-relaxed text-amber-100/95">{certTitleEn}</p>
          {subtitle ? <p className="mt-2 text-xs leading-relaxed text-blue-100/90">{subtitle}</p> : null}
        </div>

        <div className="relative space-y-5 px-5 py-7 sm:px-8 sm:py-8">
          <div className="rounded-xl border border-white/60 bg-white/70 p-4 text-[11px] leading-[1.75] text-slate-600 shadow-inner backdrop-blur-sm">
            <p className="mb-2">
              <span className="font-bold text-[#0B1F3A]">Dhamira:</span> {KMKT_MISSION}
            </p>
            <p className="mb-2">
              <span className="font-bold text-[#0B1F3A]">Maono:</span> {KMKT_VISION}
            </p>
            <p className="mb-2">
              <span className="font-bold text-[#0B1F3A]">Maadili:</span> {KMKT_CORE_VALUES}
            </p>
            <p>
              <span className="font-bold text-[#0B1F3A]">Kauli:</span> {KMKT_MOTTO}
            </p>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-slate-500">Hii hati inatolewa kwa</p>
            <p
              className="mt-2 font-serif text-3xl font-bold leading-[1.25] tracking-tight sm:text-4xl"
              style={{ color: PREMIUM_PREVIEW_CSS.nameColor }}
            >
              {fullName}
            </p>
            <div
              className="mx-auto my-3 h-px w-28"
              style={{ background: `linear-gradient(90deg, transparent, ${KMK_PREMIUM_HEX.gold}, transparent)` }}
            />
            <p className="mt-3 text-base font-bold leading-snug" style={{ color: `rgb(${theme.accent.join(",")})` }}>
              {titleSw}
            </p>
            {titleEn && titleEn !== titleSw ? (
              <p className="mt-1 text-sm italic leading-relaxed text-slate-600">{titleEn}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="flex-1 text-sm leading-[1.75] text-slate-600">{biography?.trim() || "—"}</p>
            {photoUrl ? (
              <div
                className="mx-auto shrink-0 rounded-xl border-2 p-1 shadow-md sm:mx-0"
                style={{ borderColor: `rgb(${theme.gold.join(",")})` }}
              >
                <ResponsiveLazyImage
                  src={photoUrl}
                  alt=""
                  className="h-40 w-32 rounded-lg object-cover"
                  width={256}
                  height={320}
                  priority
                />
              </div>
            ) : null}
          </div>

          {(certificateNumber || serial || verificationId || issuedAtLabel) ? (
            <motion.div className="mx-auto max-w-md space-y-1 rounded-xl border border-amber-100/90 bg-amber-50/40 px-4 py-3 text-center text-[10px] leading-relaxed text-slate-600">
              {certificateNumber ? (
                <p>
                  <span className="font-bold uppercase tracking-wider text-slate-500">Nambari ya cheti</span>
                  <br />
                  <span className="font-mono text-xs font-semibold text-[#0B1F3A]">{certificateNumber}</span>
                </p>
              ) : null}
              {verificationId ? (
                <p className={certificateNumber ? "pt-1" : ""}>
                  <span className="font-bold uppercase tracking-wider text-slate-500">Uhakiki</span>
                  <br />
                  <span className="font-mono text-[10px] font-semibold text-[#0B1F3A]">{verificationId}</span>
                </p>
              ) : null}
              {serial && !certificateNumber ? (
                <p>
                  <span className="font-bold uppercase tracking-wider text-slate-500">Nambari</span>
                  <br />
                  <span className="font-mono text-xs font-semibold text-[#0B1F3A]">{serial}</span>
                </p>
              ) : null}
              {issuedAtLabel ? (
                <p className="text-[10px] text-slate-500">
                  Tarehe: <span className="font-semibold text-[#0B1F3A]">{issuedAtLabel}</span>
                </p>
              ) : null}
              {workflowStatusLabel ? (
                <p className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                  {workflowStatusLabel}
                </p>
              ) : null}
            </motion.div>
          ) : null}

          <motion.div className="flex flex-wrap items-end justify-center gap-6 border-t border-amber-100/80 pt-4 sm:justify-between sm:px-2">
            {qrSrc ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <img src={qrSrc} alt="" width={88} height={88} className="rounded-lg border border-slate-200 bg-white p-1 shadow-sm" />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Thibitisho QR</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">QR · Thibitisho</span>
            )}
            <div className="flex flex-col items-center gap-1 text-center text-[11px] text-slate-500">
              <div className="h-8 w-28 border-b border-slate-400" />
              <span>Saini rasmi</span>
            </div>
            {localSealText ? (
              <motion.div
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-double px-1 text-center text-[8px] font-bold uppercase leading-tight text-slate-500"
                style={{ borderColor: `rgb(${theme.accent.join(",")})` }}
              >
                {localSealText}
              </motion.div>
            ) : null}
            <motion.div
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-double px-1 text-center text-[8px] font-bold uppercase leading-tight text-slate-500"
              style={{ borderColor: `rgb(${theme.gold.join(",")})` }}
            >
              KMK(T)
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
