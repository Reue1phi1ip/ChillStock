import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-[linear-gradient(135deg,#145e56_0%,#19786c_54%,#1f8a79_100%)] text-white shadow-[0_18px_44px_rgba(25,120,108,0.22),0_10px_24px_rgba(47,122,98,0.12)] hover:brightness-[1.03] disabled:brightness-95",
  secondary:
    "border border-[rgba(23,29,25,0.08)] bg-white/84 text-slate-900 shadow-[0_14px_34px_rgba(44,72,59,0.08)] backdrop-blur-[18px] hover:bg-white",
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
