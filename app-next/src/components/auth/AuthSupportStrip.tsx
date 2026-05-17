import { Mail, Phone } from "lucide-react";
import { organizationContact, PORTAL_SUPPORT_EMAIL, PORTAL_WHATSAPP_E164 } from "../../config/contactConfig";
import { WhatsAppSupportButton } from "./WhatsAppSupportButton";

type Props = {
  context?: "general_help" | "login_help" | "account_recovery" | "approval_support" | "login_failed" | "password_reset_failed";
  compact?: boolean;
  className?: string;
};

export function AuthSupportStrip({ context = "general_help", compact = false, className = "" }: Props) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white px-3 py-3 ${compact ? "text-xs" : "text-sm"} ${className}`}
    >
      <p className="font-semibold text-slate-800">Msaada wa KMK(T) / Support</p>
      {!compact ? (
        <p className="mt-0.5 text-xs text-slate-600">{organizationContact.name}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
        <a
          href={`mailto:${PORTAL_SUPPORT_EMAIL}?subject=KMK(T)%20Portal%20Support`}
          className="inline-flex items-center gap-1.5 transition hover:text-[#0B1F3A]"
        >
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {organizationContact.email}
        </a>
        <a
          href={`tel:+${PORTAL_WHATSAPP_E164}`}
          className="inline-flex items-center gap-1.5 transition hover:text-[#0B1F3A]"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {organizationContact.phoneDisplay}
        </a>
      </div>
      <div className="mt-3">
        <WhatsAppSupportButton context={context} label="Pata Msaada" labelEn="Get Help" variant="subtle" />
      </div>
    </div>
  );
}
