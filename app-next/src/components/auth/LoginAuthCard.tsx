import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import {
  getRememberedEmail,
  isRememberMeEnabled,
  setRememberedEmail,
  setRememberMePreference,
} from "../../lib/authPreferences";
import { getSupabase } from "../../lib/supabaseClient";
import { AuthRecoveryPanel } from "./AuthRecoveryPanel";
import { AuthSupportStrip } from "./AuthSupportStrip";
import { PasswordField } from "./PasswordField";
import { PasswordRecoverySetPanel } from "./PasswordRecoverySetPanel";
import { WhatsAppSupportButton } from "./WhatsAppSupportButton";

type Theme = { primary: string; secondary: string };

type Props = {
  theme: Theme;
  className?: string;
};

function isPasswordRecoveryUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return hash.includes("type=recovery") || search.includes("type=recovery");
}

export function LoginAuthCard({ theme, className = "" }: Props) {
  const { signInWithEmailPassword, authBusy, supabaseReady } = usePortal();
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => isRememberMeEnabled());
  const [localError, setLocalError] = useState("");
  const [loginFailCount, setLoginFailCount] = useState(0);
  const [view, setView] = useState<"signin" | "recovery" | "set-password">("signin");

  useEffect(() => {
    if (!isPasswordRecoveryUrl()) return;
    setView("set-password");
    const client = getSupabase();
    if (!client) return;
    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("set-password");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError("");
      const em = email.trim();
      if (!em || !password) {
        setLocalError("Ingiza barua pepe na neno la siri.");
        return;
      }
      setRememberMePreference(rememberMe);
      if (rememberMe) setRememberedEmail(em);
      const err = await signInWithEmailPassword(em, password);
      if (err) {
        setLocalError(err);
        setLoginFailCount((c) => c + 1);
        return;
      }
      setLoginFailCount(0);
    },
    [email, password, rememberMe, signInWithEmailPassword],
  );

  if (view === "set-password") {
    return (
      <div className={`auth-enterprise-card ${className}`}>
        <PasswordRecoverySetPanel
          onComplete={() => {
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", window.location.pathname);
            }
            setView("signin");
          }}
        />
      </div>
    );
  }

  if (view === "recovery") {
    return (
      <div className={`auth-enterprise-card ${className}`}>
        <AuthRecoveryPanel defaultEmail={email} onBack={() => setView("signin")} />
      </div>
    );
  }

  return (
    <div className={`auth-enterprise-card ${className}`}>
      <form className="space-y-3" onSubmit={onSubmit} noValidate>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          <span>
            Barua Pepe <span className="font-normal text-slate-500">/ Email</span>
          </span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            disabled={authBusy}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-inner shadow-slate-200/50 focus:border-[#123C69] focus:outline-none focus:ring-2 focus:ring-[#123C69]/30 disabled:opacity-60"
          />
        </label>

        <PasswordField
          label="Neno la Siri"
          labelEn="Password"
          value={password}
          onChange={setPassword}
          disabled={authBusy}
        />

        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={rememberMe}
            disabled={authBusy}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#0B1F3A] focus:ring-[#123C69]/40"
          />
          <span>
            Nikumbuke kwenye kifaa hiki <span className="text-slate-400">/ Remember me</span>
          </span>
        </label>

        {localError ? (
          <p className="rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
            {localError}
          </p>
        ) : null}

        {!supabaseReady ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Mfumo haupatikani kwa sasa. Jaribu tena baadaye.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={authBusy || !supabaseReady}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}
        >
          {authBusy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>Inaingia…</span>
            </>
          ) : (
            "Ingia / Sign in"
          )}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <a
            className="font-semibold text-[#0B1F3A] underline decoration-[#D4AF37]/70 underline-offset-2"
            href="/auth/signup-request"
          >
            Omba Akaunti / Request account
          </a>
          <button
            type="button"
            className="font-medium text-slate-600 underline transition hover:text-[#0B1F3A]"
            onClick={() => setView("recovery")}
          >
            Umesahau nenosiri? / Forgot password
          </button>
        </div>
      </form>

      {loginFailCount >= 2 ? (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-3">
          <p className="text-xs text-slate-600">Jaribio nyingi? Wasiliana na timu ya msaada.</p>
          <WhatsAppSupportButton context="login_failed" label="Wasiliana WhatsApp" labelEn="Contact Support" variant="subtle" />
        </div>
      ) : null}

      <div className="mt-4">
        <AuthSupportStrip context="login_help" compact />
      </div>
    </div>
  );
}
