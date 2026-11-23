import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  prefix?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export default function Field({ label, icon, prefix, hint, error, className = "", id, type, ...props }: FieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${fieldId}-error`;
  const inputType = type === "password" && passwordVisible ? "text" : type;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="label">{label}</label>
      <div className="input-wrap">
        {icon}
        {prefix && <span className="text-sm font-medium text-ink">{prefix}</span>}
        <input id={fieldId} className="input" {...props} type={inputType} aria-invalid={error ? true : props["aria-invalid"]} aria-describedby={error ? errorId : props["aria-describedby"]} />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
            className="grid size-9 shrink-0 place-items-center rounded-md text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
