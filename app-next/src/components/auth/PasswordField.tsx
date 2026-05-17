import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type Props = {
  label: string;
  labelEn?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
};

export function PasswordField({
  label,
  labelEn = "Password",
  value,
  onChange,
  autoComplete = "current-password",
  placeholder,
  disabled,
  id: idProp,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={id}>
      <span>
        {label}
        <span className="ml-1 font-normal text-slate-500">/ {labelEn}</span>
      </span>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-3 pr-11 text-slate-900 shadow-inner shadow-slate-200/50 focus:border-[#123C69] focus:outline-none focus:ring-2 focus:ring-[#123C69]/30 disabled:opacity-60"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800"
          aria-label={visible ? "Ficha nenosiri" : "Onyesha nenosiri"}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </label>
  );
}
