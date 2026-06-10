import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-white/60 bg-white/50 p-5 shadow-[0_24px_56px_rgba(108,123,153,0.15)] backdrop-blur-[18px]",
        className,
      )}
      {...props}
    />
  );
}
