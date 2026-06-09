import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
          {label}
        </span>
      )}
      <input
        id={inputId}
        className={[
          "w-full rounded-xl border border-tagme-slate/15 bg-white px-3.5 py-2.5 text-sm text-tagme-ink",
          "placeholder:text-tagme-slate/40 focus:border-tagme-gold/60 focus:outline-none focus:ring-2 focus:ring-tagme-gold/20",
          error ? "border-red-300" : "",
          className,
        ].join(" ")}
        {...props}
      />
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}