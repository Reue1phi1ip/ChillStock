"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";

export function UnlockScreen() {
  const router = useRouter();
  const { guestDisplayName, isLoading, isReturningUser, unlockCode } = useAppContext();
  const [copied, setCopied] = useState(false);
  const code = unlockCode ?? "----";
  const welcomeBackCopy = isReturningUser
    ? guestDisplayName
      ? `Welcome back, ${guestDisplayName}`
      : "Welcome back"
    : null;

  const handleCopy = async () => {
    if (!unlockCode) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-2xl flex-col items-center justify-center space-y-8 py-6 text-center sm:space-y-10 sm:py-8">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-[28px] bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-xl shadow-teal-600/30">
          <Icon name="lock-open" size={48} strokeWidth={1.5} />
          <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-md">
            <Icon name="sparkles" size={14} />
          </div>
        </div>

        <div className="w-full space-y-5">
          <div className="space-y-2">
            {welcomeBackCopy ? (
              <p className={guestTypography.eyebrowAccent}>{welcomeBackCopy}</p>
            ) : null}
            <h1 className={guestTypography.pageTitle}>
              {isLoading ? "Preparing Access..." : "Your access code"}
            </h1>
            <p className={guestTypography.bodyMuted}>
              Use this code on the fridge keypad. Enjoy your stay!
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-[300px] items-center justify-between rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 p-2 pl-7 shadow-2xl shadow-slate-900/20">
            <div className="flex items-center gap-3">
              {code.split("").map((digit, index) => (
                <span className="font-display text-3xl font-bold text-white" key={`${digit}-${index}`}>
                  {digit}
                </span>
              ))}
            </div>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-500 active:scale-95"
              onClick={handleCopy}
              type="button"
            >
              {copied ? <Icon name="check" size={18} /> : <span className="text-xs font-bold">COPY</span>}
            </button>
          </div>
        </div>

        <Button className="w-full max-w-md" onClick={() => router.push("/dashboard")} variant="secondary">
          View Your Tab
        </Button>
      </div>
    </AppShell>
  );
}
