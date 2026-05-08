import { useCallback, useEffect, useMemo, useState } from "react";
import { SupabaseEnvMissing } from "../../components/auth/SupabaseEnvMissing";
import { usePublicPath } from "../../hooks/usePublicPath";
import { isSupabaseConfigured } from "../../lib/supabaseClient";
import { safeJsonParseObject } from "../../lib/security";
import { acceptInvite, validateInviteToken } from "../../services/phase35InviteEmailService";
import { usePortal } from "../../context/PortalContext";

const gradientHeader = "rounded-2xl border border-[#1e3a6e]/40 bg-gradient-to-r from-[#0a1628] via-[#132952] to-[#1e3a6e] p-8 text-white shadow-xl";

function messageForCode(code: string | undefined): { sw: string; en: string } {
  switch (code) {
    case "no_client":
      return { sw: "Mipangilio ya Supabase haipo.", en: "Supabase is not configured." };
    case "rpc_error":
      return { sw: "Seva haiwezi kuthibitisha mwaliko (RPC).", en: "Could not validate invite (database)." };
    case "expired":
      return { sw: "Mwaliko umeisha muda.", en: "This invite has expired." };
    case "revoked":
      return { sw: "Mwaliko umebatilishwa.", en: "This invite was revoked." };
    case "already_accepted":
      return { sw: "Mwaliko tayari umekubaliwa.", en: "This invite was already accepted." };
    case "not_found":
    case "invalid_format":
      return { sw: "Mwaliko si halali au haupo.", en: "Invalid or unknown invite." };
    default:
      return { sw: "Mwaliko hauwezi kuthibitishwa.", en: "Invite could not be validated." };
  }
}

export function AcceptInvitePage() {
  const { pushToast, reportError, supabaseReady, session } = usePortal();
  const { navigate } = usePublicPath();
  const [token, setToken] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [validationCode, setValidationCode] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [scopeType, setScopeType] = useState<string | null>(null);
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("invite");
    setToken(t && t.trim() ? t.trim() : null);
  }, []);

  const runValidate = useCallback(async () => {
    if (!token) {
      setValidating(false);
      setValid(false);
      setValidationCode("invalid_format");
      return;
    }
    if (!isSupabaseConfigured()) {
      setValidating(false);
      setValid(false);
      setValidationCode("no_client");
      return;
    }
    setValidating(true);
    try {
      const res = await validateInviteToken(token);
      if (res.valid && res.email) {
        setValid(true);
        setEmail(res.email);
        setRoleKey(res.role_key ?? "");
        setScopeType(res.scope_type ?? null);
        setScopeId(res.scope_id ?? null);
        setExpiresAt(res.expires_at);
        setInviteMessage(res.message ?? null);
        setValidationCode(undefined);
      } else {
        setValid(false);
        setValidationCode(res.code ?? "not_found");
      }
    } catch (e) {
      reportError(e, "validate-invite");
      setValid(false);
      setValidationCode("not_found");
    } finally {
      setValidating(false);
    }
  }, [token, reportError]);

  useEffect(() => {
    void runValidate();
  }, [runValidate]);

  const scopeSummary = useMemo(() => {
    if (!scopeType || scopeType === "national") return "National / Taifa";
    if (!scopeId || scopeId === "{}") return scopeType;
    const o = safeJsonParseObject(scopeId, {}) as Record<string, string>;
    const parts = [o.dayosisi, o.jimbo, o.tawi].filter(Boolean);
    return parts.length ? `${scopeType}: ${parts.join(" · ")}` : scopeType;
  }, [scopeType, scopeId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !valid) return;
    if (password.length < 8) {
      pushToast("Nenosiri lazima liwe angalau herufi 8 (password min 8 characters).", "error");
      return;
    }
    if (password !== password2) {
      pushToast("Nenosiri hazifanani — passwords do not match.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await acceptInvite({ token, password, email: email.trim().toLowerCase() });
      if (!res.ok) {
        if (res.code === "expired" || res.error?.includes("muda")) {
          pushToast("Mwaliko umeisha muda.", "error");
        } else if (res.code === "revoked") {
          pushToast("Mwaliko umebatilishwa.", "error");
        } else if (res.code === "already_accepted") {
          pushToast("Mwaliko tayari umekubaliwa.", "info");
        } else if (res.code === "user_exists") {
          pushToast("Akaunti tayari ipo — ingia / Account exists — sign in.", "info");
        } else {
          pushToast(res.error ?? "Imeshindwa.", "error");
        }
        return;
      }
      pushToast("Mwaliko umethibitishwa — Karibu kwenye KMT Portal! Welcome.", "success");
      navigate("/");
    } catch (err) {
      reportError(err, "accept-invite");
      pushToast("Hitilafu — jaribu tena.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseReady) {
    return <SupabaseEnvMissing />;
  }

  if (session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50 px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-lg font-bold text-[#0f1e46]">Tayari umeingia / You are signed in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Toka kwenye akaunti ili kumaliza mwaliko kwa barua nyingine, au fungua dashibodi.
          </p>
          <a className="mt-6 inline-block rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white" href="/">
            Fungua portal / Open portal
          </a>
        </div>
      </div>
    );
  }

  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 px-4 py-12">
        <div className="mx-auto max-w-lg">
          <div className={gradientHeader}>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">KMT Portal</p>
            <h1 className="mt-2 text-2xl font-bold">Kukubali mwaliko / Accept invite</h1>
          </div>
          <p className="mt-6 text-center text-slate-600">Inathibitisha kiungo… / Validating invite…</p>
        </div>
      </div>
    );
  }

  if (!valid || !token) {
    const m = messageForCode(validationCode);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 px-4 py-12">
        <div className="mx-auto max-w-lg space-y-6">
          <div className={gradientHeader}>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">KMT Portal</p>
            <h1 className="mt-2 text-2xl font-bold">Mwaliko / Invite</h1>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
            <p className="font-semibold">{m.sw}</p>
            <p className="mt-2 text-sm text-rose-800">{m.en}</p>
            <a className="mt-4 inline-block text-sm font-semibold text-blue-900 underline" href="/">
              Rudi kwenye kuingia / Back to login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <header className={gradientHeader}>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Phase 35 · Mwaliko</p>
          <h1 className="mt-2 text-2xl font-bold">Karibu kwenye KMT Portal</h1>
          <p className="mt-2 text-sm text-blue-100">Welcome — complete your account below.</p>
        </header>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm">
          <p className="font-semibold">Mwaliko umethibitishwa / Invite verified</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <span className="text-emerald-800">Barua pepe / Email:</span> {email}
            </li>
            <li>
              <span className="text-emerald-800">Jukumu / Role:</span> {roleKey}
            </li>
            <li>
              <span className="text-emerald-800">Eneo / Scope:</span> {scopeSummary}
            </li>
            {expiresAt ? (
              <li>
                <span className="text-emerald-800">Mwisho / Expires:</span> {new Date(expiresAt).toLocaleString()}
              </li>
            ) : null}
          </ul>
          {inviteMessage ? <p className="mt-2 border-t border-emerald-200 pt-2 text-sm italic">{inviteMessage}</p> : null}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-[#0f1e46]">Tengeneza nenosiri lako / Set your password</h2>
          <label className="grid gap-1 text-sm font-medium text-slate-800">
            Nenosiri (password) — angalau 8
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              required
              minLength={8}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-800">
            Rudia nenosiri / Confirm password
            <input
              type="password"
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
              required
              minLength={8}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {busy ? "Inachakata… / Processing…" : "Thibitisha na unda akaunti / Confirm & create account"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Baada ya mafanikio utaelekezwa kwenye ukurasa wa kuingia. After success you will go to the login page.
        </p>
      </div>
    </div>
  );
}
