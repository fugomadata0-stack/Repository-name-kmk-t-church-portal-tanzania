import { useState } from "react";
import { usePortal } from "../../context/PortalContext";
import { validatePassword } from "../../lib/phase33Password";
import { PasswordField } from "./PasswordField";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

type Props = {
  onComplete: () => void;
};

export function PasswordRecoverySetPanel({ onComplete }: Props) {
  const { updatePasswordFromRecovery, authBusy, pushToast } = usePortal();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validatePassword(password)) {
      setError("Nenosiri halikidhi vigezo vya usalama.");
      return;
    }
    if (password !== confirm) {
      setError("Nenosiri hazifanani.");
      return;
    }
    const err = await updatePasswordFromRecovery(password);
    if (err) {
      setError(err);
      return;
    }
    pushToast("Nenosiri limesasishwa. Unaweza kuendelea.", "success");
    onComplete();
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div>
        <h3 className="text-base font-bold text-[#0a1628]">Weka nenosiri jipya / Set new password</h3>
        <p className="mt-1 text-xs text-slate-600">Thibitisha nenosiri imara kisha endelea.</p>
      </div>
      <PasswordField
        label="Neno la Siri"
        labelEn="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        disabled={authBusy}
      />
      <PasswordStrengthMeter password={password} />
      <PasswordField
        label="Thibitisha nenosiri"
        labelEn="Confirm password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        disabled={authBusy}
      />
      {error ? (
        <p className="rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={authBusy}
        className="w-full rounded-xl bg-[#0B1F3A] py-2.5 text-sm font-semibold text-white transition hover:bg-[#123C69] disabled:opacity-60"
      >
        {authBusy ? "Inahifadhi…" : "Hifadhi nenosiri / Save password"}
      </button>
    </form>
  );
}
