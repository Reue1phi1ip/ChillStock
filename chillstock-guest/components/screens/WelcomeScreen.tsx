"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { guestTypography } from "@/components/shared/guestTypography";
import { defaultPrototypeFridgeCode, prototypeModeEnabled } from "@/lib/prototype";

export function WelcomeScreen() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-3xl flex-1 flex-col items-center justify-between py-3 text-center sm:py-8">
        <section className="flex flex-col items-center space-y-6 pt-3 sm:space-y-8 sm:pt-8">
          <div className="relative animate-float-in">
            <div className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] border border-white/75 bg-white/58 shadow-[0_30px_70px_rgba(111,128,156,0.16)] backdrop-blur-[20px]">
              <Icon name="scan" size={58} className="text-teal-700" strokeWidth={1.5} />
            </div>
            <div className="absolute -right-4 -top-2 flex h-14 w-14 items-center justify-center rounded-[1.75rem] border border-orange-200/40 bg-[linear-gradient(135deg,rgba(255,180,112,0.92),rgba(255,153,94,0.92))] shadow-[0_22px_46px_rgba(255,167,112,0.24)] backdrop-blur-xl">
              <Icon name="wine" size={22} className="text-white" />
            </div>
            <div className="absolute -bottom-3 -left-4 flex h-14 w-14 items-center justify-center rounded-[1.75rem] border border-teal-200/40 bg-[linear-gradient(135deg,rgba(137,236,211,0.92),rgba(107,220,203,0.92))] shadow-[0_22px_46px_rgba(100,214,198,0.22)] backdrop-blur-xl">
              <Icon name="beer" size={20} className="text-teal-700" />
            </div>
          </div>

          <div className="max-w-xl space-y-3">
            <h1 className="font-display text-[2.75rem] font-bold tracking-tight text-slate-950 sm:text-6xl">
              Scan. Sip. Enjoy.
            </h1>
            <p className={guestTypography.body}>
              Point your camera at the fridge&apos;s QR code to unlock premium drinks and snacks.
              Pay only for what you take.
            </p>
          </div>
        </section>

        <section className="w-full max-w-xl space-y-5 pt-10">
          <Link
            className="inline-flex w-full items-center justify-center gap-3 rounded-[2rem] bg-[linear-gradient(135deg,#0f847f_0%,#16988f_56%,#19a89f_100%)] px-6 py-5 text-lg font-semibold text-white shadow-[0_20px_50px_rgba(16,150,138,0.28),0_18px_34px_rgba(145,170,102,0.12)] transition hover:brightness-[1.03] active:scale-[0.98]"
            href="/scan"
          >
            <Icon name="scan" size={20} />
            <span>Scan Fridge Code</span>
            <Icon name="arrow-right" size={20} />
          </Link>
          {prototypeModeEnabled ? (
            <Link
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              href={`/auth?fridgeCode=${encodeURIComponent(defaultPrototypeFridgeCode)}&prototype=1`}
            >
              <span>Run prototype workflow</span>
              <Icon name="arrow-right" size={14} />
            </Link>
          ) : null}
          <p className="text-center text-sm text-slate-500">No app download required</p>
        </section>
      </div>
    </AppShell>
  );
}
