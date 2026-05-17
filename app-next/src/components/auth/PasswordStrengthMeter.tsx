import { analyzePasswordStrength } from "../../lib/phase33Password";

type Props = {
  password: string;
  className?: string;
};

const LEVELS = [
  { min: 0, label: "Dhaifu", bar: "w-1/5 bg-rose-400" },
  { min: 2, label: "Wastani", bar: "w-2/5 bg-amber-400" },
  { min: 4, label: "Nzuri", bar: "w-4/5 bg-emerald-500" },
  { min: 5, label: "Imara", bar: "w-full bg-emerald-600" },
] as const;

export function PasswordStrengthMeter({ password, className = "" }: Props) {
  if (!password) return null;
  const { checks, valid } = analyzePasswordStrength(password);
  const passed = Object.values(checks).filter(Boolean).length;
  const level = LEVELS.filter((l) => passed >= l.min).pop() ?? LEVELS[0];

  return (
    <div className={`space-y-1.5 ${className}`} aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-slate-600">Nguvu ya nenosiri / Strength</span>
        <span className={valid ? "font-semibold text-emerald-700" : "text-slate-500"}>{level.label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full transition-all duration-300 ${level.bar}`} />
      </div>
    </div>
  );
}
