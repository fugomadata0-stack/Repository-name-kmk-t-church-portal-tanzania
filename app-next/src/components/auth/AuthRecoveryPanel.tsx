import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { PORTAL_SUPPORT_EMAIL } from "../../config/contactConfig";
import { AuthSupportStrip } from "./AuthSupportStrip";
import { WhatsAppSupportButton } from "./WhatsAppSupportButton";

type Props = {
  defaultEmail?: string;
  onBack: () => void;
};

export function AuthRecoveryPanel({ defaultEmail = "", onBack }: Props) {
  const { requestPasswordReset, authBusy } = usePortal();
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    const em = email.trim();
    if (!em) {
      setStatus("error");
      setMessage("Ingiza barua pepe iliyosajiliwa.");
      return;
    }
    const err = await requestPasswordReset(em);
    if (err) {
      setStatus("error");
      setMessage(err);
      return;
    }
    setStatus("sent");
    setMessage(`Kiungo cha kuweka upya nenosiri kimetumwa kwa ${em}. Angalia barua pepe (na folda ya spam).`);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-[#0B1F3A]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Rudi kwenye kuingia / Back to sign in
      </button>

      <div>
        <h3 className="text-base font-bold text-[#0a1628]">Umesahau nenosiri? / Forgot password</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Tutakutumia kiungo salama cha kuweka upya nenosiri kupitia barua pepe.
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-3 text-sm text-emerald-900" role="status">
          {message}
        </div>
      ) : (
        <form className="space-y-3" onSubmit={onSendReset}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            <span>
              Barua Pepe <span className="font-normal text-slate-500">/ Email</span>
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              disabled={authBusy}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:border-[#123C69] focus:outline-none focus:ring-2 focus:ring-[#123C69]/30"
            />
          </label>
          {status === "error" && message ? (
            <p className="rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={authBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] py-2.5 text-sm font-semibold text-white transition hover:bg-[#123C69] disabled:opacity-60"
          >
            <Mail className="h-4 w-4" aria-hidden />
            {authBusy ? "Inatuma…" : "Tuma kiungo cha urejeshaji / Send reset link"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
        <p className="font-medium text-slate-700">Barua haijafika? / Email not received?</p>
        <p className="mt-1">
          Unaweza kuwasiliana na support kupitia WhatsApp au barua pepe{" "}
          <a className="font-semibold text-[#0B1F3A] underline" href={`mailto:${PORTAL_SUPPORT_EMAIL}`}>
            {PORTAL_SUPPORT_EMAIL}
          </a>
          .
        </p>
        <div className="mt-2">
          <WhatsAppSupportButton
            context="password_reset_failed"
            label="WhatsApp Recovery Help"
            labelEn="Msaada WhatsApp"
            variant="link"
          />
        </div>
      </div>

      <AuthSupportStrip context="account_recovery" compact />
    </div>
  );
}
