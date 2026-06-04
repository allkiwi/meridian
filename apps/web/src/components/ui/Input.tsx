import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = "", ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-white/70">
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-amber-500 bg-white/5
            ${error ? "border-red-500 focus:ring-red-500" : "border-white/10 focus:border-amber-500"}
            ${className}`}
          {...props}
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
