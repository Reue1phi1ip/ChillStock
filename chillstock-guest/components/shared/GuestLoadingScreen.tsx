"use client";

import { useState } from "react";
import { guestTypography } from "@/components/shared/guestTypography";
import { cn } from "@/lib/utils";

const loadingPhrases = [
  "Counting the cold ones...",
  "Waking up your minibar tab...",
  "Checking that the snacks are behaving...",
  "Polishing the payment button...",
] as const;

function pickLoadingPhrase() {
  return loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)];
}

type GuestLoadingScreenProps = {
  title?: string;
  className?: string;
};

export function GuestLoadingScreen({
  title = "Preparing your fridge access",
  className,
}: GuestLoadingScreenProps) {
  const [phrase] = useState(pickLoadingPhrase);

  return (
    <div
      className={cn(
        "mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-8 text-center",
        className,
      )}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/70 bg-white/58 shadow-[0_30px_70px_rgba(108,123,153,0.18)] backdrop-blur-[20px]">
        <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-700" />
      </div>
      <div className="mt-7 space-y-2">
        <h1 className={guestTypography.pageTitle}>{title}</h1>
        <p className={cn(guestTypography.bodyMuted, "mx-auto max-w-sm")}>{phrase}</p>
      </div>
    </div>
  );
}
