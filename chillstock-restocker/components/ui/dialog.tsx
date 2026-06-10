"use client";

import type { ReactNode } from "react";

export function Dialog({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(23,29,25,0.22)] px-4 py-8 backdrop-blur-[5px]">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/70 bg-[rgba(249,252,249,0.98)] p-6 shadow-[0_28px_80px_rgba(39,67,55,0.16)]">
        {children}
      </div>
    </div>
  );
}
