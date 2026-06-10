import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-[linear-gradient(135deg,#0f847f_0%,#16988f_56%,#19a89f_100%)] text-white shadow-[0_18px_44px_rgba(16,150,138,0.28),0_14px_28px_rgba(145,170,102,0.12)] hover:brightness-[1.03] disabled:brightness-95",
  secondary:
    "border border-white/60 bg-white/52 text-slate-900 shadow-[0_18px_38px_rgba(108,123,153,0.13)] backdrop-blur-[18px] hover:bg-white/72",
  ghost: "text-slate-600 hover:bg-white/46 hover:text-slate-950 hover:backdrop-blur-[18px]",
  danger:
    "bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] text-white shadow-[0_16px_40px_rgba(239,68,68,0.24)] hover:brightness-[1.03]",
};

const sizes = {
  sm: "rounded-full px-3.5 py-2 text-xs",
  md: "rounded-2xl px-5 py-3 text-sm",
  lg: "rounded-[1.9rem] px-6 py-4 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "lg",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70",
        variants[variant],
        sizes[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
