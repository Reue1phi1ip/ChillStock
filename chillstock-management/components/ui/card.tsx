import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-[rgba(23,29,25,0.08)] bg-[rgba(251,252,249,0.92)] p-5 shadow-[0_20px_56px_rgba(44,72,59,0.08)] backdrop-blur-[18px]",
        className,
      )}
      {...props}
    />
  );
}
