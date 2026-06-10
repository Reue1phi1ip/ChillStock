import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-2xl border border-[rgba(23,29,25,0.1)] bg-[rgba(255,255,255,0.92)] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[rgba(24,104,95,0.12)]",
        className,
      )}
      {...props}
    />
  );
}
