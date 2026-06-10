import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const tones = {
  normal: "border-[rgba(23,29,25,0.08)] bg-[rgba(243,247,244,0.96)] text-slate-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-teal-200 bg-teal-50 text-teal-700",
};

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        tones.normal,
        className,
      )}
      {...props}
    />
  );
}

export const badgeTones = tones;
