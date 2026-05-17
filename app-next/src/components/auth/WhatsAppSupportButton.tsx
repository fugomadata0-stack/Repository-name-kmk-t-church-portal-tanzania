import { MessageCircle } from "lucide-react";
import { buildTelSupportUrl, openWhatsAppSupport, type WhatsAppSupportContext } from "../../lib/whatsappSupport";

type Variant = "primary" | "subtle" | "link";

type Props = {
  context?: WhatsAppSupportContext;
  label?: string;
  labelEn?: string;
  variant?: Variant;
  className?: string;
  extraMessage?: string;
  showTelFallback?: boolean;
};

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700/30 bg-gradient-to-b from-emerald-800/95 to-emerald-950 px-4 py-2.5 text-sm font-semibold text-emerald-50 shadow-sm transition hover:border-emerald-600/50 hover:from-emerald-700/95 hover:to-emerald-900 active:scale-[0.99]",
  subtle:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-600/40 hover:bg-emerald-50/80 hover:text-emerald-900",
  link: "inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1F3A] underline decoration-emerald-600/40 underline-offset-2 transition hover:text-emerald-900",
};

export function WhatsAppSupportButton({
  context = "general_help",
  label = "Wasiliana WhatsApp",
  labelEn,
  variant = "subtle",
  className = "",
  extraMessage,
  showTelFallback = false,
}: Props) {
  const display =
    labelEn && labelEn !== label ? (
      <>
        {label}
        <span className="font-normal opacity-80"> / {labelEn}</span>
      </>
    ) : (
      label
    );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => openWhatsAppSupport(context, extraMessage)}
        className={VARIANT_CLASS[variant]}
      >
        <MessageCircle className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        {display}
      </button>
      {showTelFallback ? (
        <a href={buildTelSupportUrl()} className="text-xs font-medium text-slate-500 underline hover:text-slate-800">
          Simu
        </a>
      ) : null}
    </div>
  );
}
