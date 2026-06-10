"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Sheet({
  children,
  onClose,
  open,
}: {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(33,24,17,0.22)] backdrop-blur-[2px]">
      <button
        aria-label="Close ticket sidebar"
        className="flex-1 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "animate-panel-in h-full w-full max-w-[640px] border-l border-white/70 bg-[rgba(250,244,235,0.96)] shadow-[-24px_0_80px_rgba(71,47,31,0.12)] backdrop-blur-[18px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
