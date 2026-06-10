"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function AppShell({
  children,
  eyebrow = "Restocker Console",
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-dvh px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] max-w-7xl flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white/75 shadow-[0_24px_80px_rgba(37,55,43,0.12)] backdrop-blur sm:min-h-[calc(100dvh-2rem)] sm:rounded-[28px]">
        <header className="border-b border-slate-200/80 bg-white/75 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Link aria-label="ChillStock restocker home" href="/">
                <BrandLogo size="md" />
              </Link>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
