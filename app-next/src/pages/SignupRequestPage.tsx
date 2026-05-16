import { useCallback, useEffect, useMemo, useState } from "react";
import { SignupDynamicFields } from "../components/registration/SignupDynamicFields";
import { usePortal } from "../context/PortalContext";
import { formatCaughtError } from "../lib/supabaseErrors";
import { analyzePasswordStrength, validateEmail, validatePassword, validatePhone } from "../lib/phase33Password";
import { needsVerificationFlag, requestedScopeFromPayload, unitFromPayload } from "../lib/phase33FormUtils";
import { PHASE33_PUBLIC_ROLES } from "../lib/phase33ReferenceData";
import {
  clearPortalDraft,
  readPortalDraft,
  writePortalDraft,
  type PortalDraftField,
  type PortalDraftScope,
} from "../lib/portalDraftRecovery";
import {
  insertPhase33SignupRequest,
  validatePasswordRemote,
} from "../services/phase33SignupService";
import { logAuditAction } from "../services/auditLogService";
import type { SignupReferencePayload } from "../services/signupReferenceFromSupabase";
import { enrichSignupPayloadWithStructureIds, fetchSignupReferenceFromSupabase } from "../services/signupReferenceFromSupabase";

const RULE_ROWS: { key: keyof ReturnType<typeof analyzePasswordStrength>["checks"]; sw: string }[] = [
  { key: "firstUpper", sw: "Herufi ya kwanza ni kubwa (A–Z)." },
  { key: "hasLower", sw: "Kuna herufi ndogo." },
  { key: "hasSpecial", sw: "Kuna alama maalum (@, #, $, !)." },
  { key: "fourDigits", sw: "Kuna angalau nambari nne (4)." },
  { key: "length", sw: "Urefu angalau herufi 8." },
];

interface FormState {
  fullName: string;
  gender: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  requestedRole: string;
  requestReason: string;
  previousResponsibility: string;
  dynamicPayload: Record<string, string>;
  termsAccepted: boolean;
  responsibilityDeclaration: boolean;
}

const initialForm: FormState = {
  fullName: "",
  gender: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  requestedRole: "",
  requestReason: "",
  previousResponsibility: "",
  dynamicPayload: {},
  termsAccepted: false,
  responsibilityDeclaration: false,
};

const signupDraftScope: PortalDraftScope = {
  userId: null,
  moduleKey: "registration_requests",
  submodule: "Phase33 signup",
  pageKey: "phase33-signup",
};

function signupFormToDraftFields(step: number, form: FormState): PortalDraftField[] {
  const dynamicPayload = Object.keys(form.dynamicPayload).length > 0 ? JSON.stringify(form.dynamicPayload) : "";
  const safeForm = {
    ...form,
    password: "",
    confirmPassword: "",
    dynamicPayload,
  };
  const fields: PortalDraftField[] = Object.entries(safeForm).map(([key, value]) => ({
    key: `signup:${key}`,
    selector: `[data-signup-field="${key}"]`,
    kind: typeof value === "boolean" ? ("checkbox" as const) : ("input" as const),
    value: typeof value === "boolean" ? undefined : String(value ?? ""),
    checked: typeof value === "boolean" ? value : undefined,
  }));
  const hasMeaningfulDraft = fields.some((field) => Boolean(field.checked || field.value?.trim()));
  return hasMeaningfulDraft
    ? [{ key: "signup:step", selector: "[data-signup-step]", kind: "input", value: String(step) }, ...fields]
    : [];
}

function signupDraftFieldsToForm(fields: PortalDraftField[]): { step: number; form: FormState } | null {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const rawStep = Number(byKey.get("signup:step")?.value ?? 1);
  const nextForm: FormState = { ...initialForm };
  for (const key of Object.keys(initialForm) as Array<keyof FormState>) {
    if (key === "password" || key === "confirmPassword") continue;
    const field = byKey.get(`signup:${key}`);
    if (!field) continue;
    if (typeof initialForm[key] === "boolean") {
      (nextForm[key] as boolean) = Boolean(field.checked);
    } else if (key === "dynamicPayload") {
      try {
        nextForm.dynamicPayload = JSON.parse(field.value || "{}") as Record<string, string>;
      } catch {
        nextForm.dynamicPayload = {};
      }
    } else {
      (nextForm[key] as string) = field.value ?? "";
    }
  }
  return {
    step: Number.isFinite(rawStep) ? Math.min(4, Math.max(1, rawStep)) : 1,
    form: nextForm,
  };
}

export function SignupRequestPage() {
  const { supabaseReady, session, pushToast, reportError } = usePortal();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [requestRef, setRequestRef] = useState<string | null>(null);
  const [signupRef, setSignupRef] = useState<SignupReferencePayload | null>(null);
  const [signupRefLoading, setSignupRefLoading] = useState(false);
  const [signupRefError, setSignupRefError] = useState<string | null>(null);

  const pwdAnalysis = useMemo(() => analyzePasswordStrength(form.password), [form.password]);
  const pwdMatch = Boolean(form.password && form.password === form.confirmPassword);

  useEffect(() => {
    const draft = readPortalDraft(signupDraftScope);
    if (!draft) return;
    const restored = signupDraftFieldsToForm(draft.fields);
    if (!restored) return;
    setForm(restored.form);
    setStep(restored.step);
    pushToast("Rasimu imerejeshwa. Tafadhali weka tena nenosiri kwa usalama.", "info");
  }, [pushToast]);

  useEffect(() => {
    if (step >= 5) return;
    const save = () => {
      return writePortalDraft(signupDraftScope, signupFormToDraftFields(step, form), {
        scrollTop: window.scrollY || document.documentElement.scrollTop || 0,
        activeElementKey: null,
        openDetails: [],
      });
    };
    const timer = window.setTimeout(save, 1400);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (!save()) return;
      ev.preventDefault();
      ev.returnValue = "Una mabadiliko ambayo hayajahifadhiwa. Unataka kuondoka?";
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [form, step]);

  const setField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const setDyn = useCallback((name: string, next: string) => {
    setForm((f) => ({
      ...f,
      dynamicPayload: { ...f.dynamicPayload, [name]: next },
    }));
  }, []);

  useEffect(() => {
    if (!supabaseReady) return;
    let cancelled = false;
    setSignupRefLoading(true);
    setSignupRefError(null);
    void fetchSignupReferenceFromSupabase()
      .then((payload) => {
        if (!cancelled) setSignupRef(payload);
      })
      .catch((err) => {
        if (!cancelled) setSignupRefError(formatCaughtError(err));
      })
      .finally(() => {
        if (!cancelled) setSignupRefLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabaseReady]);

  const validateStep = useCallback((): boolean => {
    if (step === 1) {
      if (!form.fullName.trim() || !form.gender) {
        pushToast("Jaza jina na jinsia.", "error");
        return false;
      }
      if (!validateEmail(form.email)) {
        pushToast("Barua pepe si sahihi.", "error");
        return false;
      }
      if (!validatePhone(form.phone)) {
        pushToast("Nambari ya simu si sahihi.", "error");
        return false;
      }
      if (!validatePassword(form.password)) {
        pushToast(pwdAnalysis.errors[0] || "Nenosiri halikidhi vigezo.", "error");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        pushToast("Nenosiri hazifanani.", "error");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!form.requestedRole || !form.requestReason.trim()) {
        pushToast("Chagua role na eleza sababu.", "error");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (signupRefLoading) {
        pushToast("Subiri data ya mfumo ipakike kutoka Supabase.", "error");
        return false;
      }
      if (signupRefError) {
        pushToast("Imeshindikana kupakia data ya mfumo. Jaribu tena baada ya muda mfupi.", "error");
        return false;
      }
      if (!signupRef) {
        pushToast("Data ya mfumo haijapatikana.", "error");
        return false;
      }
      const role = form.requestedRole;
      const dyn = form.dynamicPayload;
      if (role === "Diocese Data Officer" && !dyn.diocese) {
        pushToast("Chagua dayosisi.", "error");
        return false;
      }
      if (role === "Jimbo Data Officer" && (!dyn.diocese || !dyn.jimbo)) {
        pushToast("Chagua dayosisi na jimbo.", "error");
        return false;
      }
      if (role === "Branch Data Officer" && (!dyn.diocese || !dyn.jimbo || !dyn.branch)) {
        pushToast("Chagua dayosisi, jimbo na tawi.", "error");
        return false;
      }
      if (role === "Viewer / Mtazamaji" && !dyn.viewerReason?.trim()) {
        pushToast("Eleza sababu ya kutaka ufikiaji.", "error");
        return false;
      }
      return true;
    }
    if (step === 4) {
      if (!form.termsAccepted || !form.responsibilityDeclaration) {
        pushToast("Thibitisha masharti na tamko.", "error");
        return false;
      }
      if (!validatePassword(form.password)) {
        pushToast("Thibitisha tena nenosiri (hatua 1).", "error");
        return false;
      }
      return true;
    }
    return true;
  }, [form, pwdAnalysis.errors, pushToast, signupRef, signupRefError, signupRefLoading, step]);

  const goNext = useCallback(() => {
    if (!validateStep()) return;
    if (step < 4) setStep((s) => s + 1);
  }, [step, validateStep]);

  const goPrev = useCallback(() => {
    if (step > 1 && step < 5) setStep((s) => s - 1);
  }, [step]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setBusy(true);
    try {
      const remoteOk = await validatePasswordRemote(form.password);
      if (!remoteOk) {
        pushToast("Nenosiri halikubaliwi na seva.", "error");
        setBusy(false);
        return;
      }
      const dyn = form.dynamicPayload;
      let submitPayload = dyn;
      try {
        submitPayload = enrichSignupPayloadWithStructureIds(dyn, signupRef);
      } catch {
        // Fallback: usizuie submit kama lookup ya structure imeshindikana.
        submitPayload = dyn;
      }
      const scope = requestedScopeFromPayload(form.requestedRole, dyn);
      const unit = unitFromPayload(dyn);
      const vf = needsVerificationFlag(dyn);
      const row = await insertPhase33SignupRequest({
        fullName: form.fullName.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim(),
        requestedRole: form.requestedRole,
        requestReason: form.requestReason.trim(),
        previousResponsibility: form.previousResponsibility.trim(),
        requestedScope: scope,
        unitName: unit,
        dynamicPayload: submitPayload,
        verificationFlag: vf,
      });
      clearPortalDraft(signupDraftScope);
      setRequestRef(row.id);
      setStep(5);
      pushToast("Maombi yako yametumwa kwa mafanikio. Subiri kuthibitishwa na msimamizi.", "success");
      await logAuditAction({
        module: "auth",
        action: "signup_request",
        entity_type: "signup_request",
        entity_id: row.id,
        entity_name: form.fullName.trim(),
        status: "success",
        message: "Ombi la akaunti limewasilishwa.",
        new_values: {
          requested_role: form.requestedRole,
          email: form.email.trim(),
        },
      });
    } catch (err) {
      reportError(err, "Phase33 signup");
      const msg = formatCaughtError(err).toLowerCase();
      if (msg.includes("phase33 insert") || msg.includes("phase33_signup_requests")) {
        pushToast("Imeshindikana kutuma maombi. Tafadhali jaribu tena au wasiliana na msimamizi.", "error");
      } else if (msg.includes("permission denied") || msg.includes("42501") || msg.includes("rls")) {
        pushToast("Huna ruhusa ya kusoma taarifa za muundo wa kanisa.", "error");
      } else if (
        msg.includes("dayosisi") ||
        msg.includes("jimbo") ||
        msg.includes("tawi") ||
        msg.includes("structure") ||
        msg.includes("scope")
      ) {
        pushToast("Chagua ngazi sahihi ya kanisa.", "error");
      } else {
        pushToast("Imeshindikana kutuma maombi ya akaunti.", "error");
      }
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-amber-50 px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-lg font-bold text-[#0f1e46]">Tayari umeingia</h1>
          <p className="mt-2 text-sm text-slate-600">Akaunti yako imewezeshwa. Tumia dashibodi kuendelea.</p>
          <a
            className="mt-6 inline-block rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white"
            href="/"
          >
            Fungua portal
          </a>
        </div>
      </div>
    );
  }

  const progress = step <= 4 ? (step / 4) * 100 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-amber-50/40 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">KMK(T) National Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-[#0f1e46]">Omba ufikiaji wa mfumo</h1>
          <p className="mt-2 text-sm text-slate-600">
            Usajili unategemea idhini ya msimamizi. Ukiidhinishwa utapokea taarifa kwa barua pepe au njia nyingine.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                n === step ? "bg-blue-900 text-white" : n < step ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              Hatua {n}
            </span>
          ))}
        </div>
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-blue-900 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg" onSubmit={step === 4 ? onSubmit : (e) => e.preventDefault()}>
          {step === 1 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0f1e46]">Hatua 1 — Taarifa binafsi</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Jina kamili
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Jinsia
                  <select
                    required
                    value={form.gender}
                    onChange={(e) => setField("gender", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="">Chagua</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Simu
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+255..."
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Barua pepe
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Nenosiri
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Rudia nenosiri
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2"
                  />
                </label>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Vigezo vya nenosiri</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {RULE_ROWS.map((row) => {
                    const ok = pwdAnalysis.checks[row.key];
                    return (
                      <li key={row.key} className={ok ? "text-emerald-700" : "text-rose-700"}>
                        {ok ? "✓" : "○"} {row.sw}
                      </li>
                    );
                  })}
                  <li className={pwdMatch ? "text-emerald-700" : "text-rose-700"}>{pwdMatch ? "✓" : "○"} Rudia linafanana.</li>
                </ul>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0f1e46]">Hatua 2 — Role na sababu</h2>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Role unayoomba
                <select
                  required
                  value={form.requestedRole}
                  onChange={(e) => setField("requestedRole", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">Chagua</option>
                  {PHASE33_PUBLIC_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Sababu ya kuomba ufikiaji
                <textarea
                  required
                  rows={3}
                  value={form.requestReason}
                  onChange={(e) => setField("requestReason", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Uwajibikaji wa awali (si lazima)
                <textarea
                  rows={2}
                  value={form.previousResponsibility}
                  onChange={(e) => setField("previousResponsibility", e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0f1e46]">Hatua 3 — Eneo la huduma</h2>
              {signupRefLoading ? (
                <p className="text-sm font-medium text-slate-600" role="status">
                  Inapakia orodha kutoka Supabase…
                </p>
              ) : null}
              {signupRefError ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
                  Imeshindikana kuwasiliana na seva (Supabase). {signupRefError}
                </p>
              ) : null}
              {signupRef && !signupRefLoading ? (
                <SignupDynamicFields
                  hierarchy={signupRef}
                  role={form.requestedRole}
                  value={form.dynamicPayload}
                  onChange={setDyn}
                />
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[#0f1e46]">Hatua 4 — Uhakiki</h2>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-800">
                <p>
                  <b>Jina:</b> {form.fullName}
                </p>
                <p>
                  <b>Barua pepe:</b> {form.email}
                </p>
                <p>
                  <b>Role:</b> {form.requestedRole}
                </p>
                <p>
                  <b>Scope:</b> {requestedScopeFromPayload(form.requestedRole, form.dynamicPayload)}
                </p>
                <p>
                  <b>Kitengo:</b> {unitFromPayload(form.dynamicPayload)}
                </p>
                <p className="mt-2 inline-block rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                  Inasubiri kuidhinishwa
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => setField("termsAccepted", e.target.checked)}
                  className="mt-1"
                  required
                />
                Nimekubali masharti ya mfumo na sera ya faragha.
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.responsibilityDeclaration}
                  onChange={(e) => setField("responsibilityDeclaration", e.target.checked)}
                  className="mt-1"
                  required
                />
                Nathibitisha taarifa hizi ni sahihi na nitatumia mfumo kwa uwajibikaji.
              </label>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4 text-center">
              <h2 className="text-lg font-semibold text-emerald-800">Ombi limepokelewa</h2>
              <p className="text-sm text-slate-600">Namba ya rejea:</p>
              <p className="font-mono text-xl font-bold text-blue-900">{requestRef}</p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <a className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800" href="/">
                  Mwanzo
                </a>
                <a className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white" href="/">
                  Ingia kwenye mfumo
                </a>
              </div>
            </div>
          ) : null}

          {step < 5 ? (
            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 disabled:opacity-40"
                disabled={step === 1}
              >
                Rudi nyuma
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={step === 1 && (!pwdAnalysis.valid || !pwdMatch)}
                  className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Endelea
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy || !pwdAnalysis.valid || !pwdMatch}
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Inawasilisha…" : "Wasilisha ombi"}
                </button>
              )}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
