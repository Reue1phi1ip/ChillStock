"use client";

import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose?: () => void;
};

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 px-6 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[360px] rounded-[2rem] border border-white/65 bg-white/66 p-6 shadow-[0_30px_68px_rgba(71,86,118,0.2)] backdrop-blur-[22px]"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
