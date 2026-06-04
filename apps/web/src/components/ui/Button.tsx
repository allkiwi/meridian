import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, disabled, children, className = "", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-navy-900 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary: "bg-amber-500 text-navy-900 hover:bg-amber-400 active:bg-amber-600",
      ghost:
        "border border-white/20 bg-transparent text-white hover:bg-white/10 active:bg-white/5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
