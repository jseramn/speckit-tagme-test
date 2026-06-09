import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-tagme-ink text-tagme-cream hover:bg-tagme-slate disabled:opacity-50",
  secondary:
    "border border-tagme-slate/20 bg-white text-tagme-ink hover:border-tagme-gold/50",
  ghost: "text-tagme-slate hover:bg-tagme-cream/80",
  danger:
    "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {loading ? "Cargando…" : children}
    </button>
  );
}