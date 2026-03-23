"use client";

import { CircleAlert } from "lucide-react";

const INPUT_BASE =
  "w-full rounded-xl border px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0";
const INPUT_OK = "border-slate-200/90 bg-white shadow-sm focus:border-orange-400 focus:ring-orange-400/30";
const INPUT_ERROR = "border-red-400 bg-red-50/60 focus:ring-red-200";

export function FormRow({
  label,
  name,
  form,
  fieldErrors,
  onChange,
  required,
  type = "text",
  maxLength,
  id,
  hint,
  ...inputProps
}) {
  const error = fieldErrors[name];
  const inputId = id || `referral-${name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="flex flex-wrap items-baseline gap-x-1 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {required && <span className="text-orange-500">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <input
        id={inputId}
        type={type}
        name={name}
        value={form[name] ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        className={`${INPUT_BASE} ${error ? INPUT_ERROR : INPUT_OK}`}
        aria-invalid={!!error}
        aria-required={required}
        aria-describedby={error ? `${inputId}-error` : undefined}
        maxLength={maxLength}
        {...inputProps}
      />
      {error && (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export { INPUT_BASE, INPUT_OK, INPUT_ERROR };
