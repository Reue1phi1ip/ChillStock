import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-2 rounded-[1.35rem] border border-[rgba(23,29,25,0.08)] bg-white/80 p-1.5 shadow-[0_14px_34px_rgba(44,72,59,0.08)] backdrop-blur-[18px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  className,
  selected,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-[1rem] px-4 py-2.5 text-sm font-semibold transition",
        selected
          ? "bg-[linear-gradient(135deg,#edf7f2_0%,#d5ece1_100%)] text-slate-950 shadow-[0_10px_24px_rgba(25,120,108,0.14)]"
          : "text-slate-600 hover:bg-white/72 hover:text-slate-900",
        className,
      )}
      type="button"
      {...props}
    />
  );
}
