"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useZxing } from "react-zxing";

type FocusCapabilities = {
  focusMode?: string[];
};

type FocusCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => FocusCapabilities;
};

type FocusConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
};

export function ScanScreen() {
  const router = useRouter();
  const [scanError, setScanError] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const handleDetectedCode = (value: string) => {
    const fridgeCode = value.trim();
    if (!fridgeCode || isRouting) return;

    setScanError("");
    setIsPaused(true);
    setIsRouting(true);

    router.push(`/auth?${new URLSearchParams({ fridgeCode }).toString()}`);
  };

  const applyPreferredTrackSettings = async (videoElement: HTMLVideoElement) => {
    const stream = videoElement.srcObject;
    if (!(stream instanceof MediaStream)) return;

    const [track] = stream.getVideoTracks();
    if (!track) return;

    const capableTrack = track as FocusCapableTrack;
    const capabilities =
      (typeof capableTrack.getCapabilities === "function" ? capableTrack.getCapabilities() : null) as
        | FocusCapabilities
        | null;
    const advancedConstraints: FocusConstraintSet = {};

    if (Array.isArray(capabilities?.focusMode) && capabilities.focusMode.includes("continuous")) {
      advancedConstraints.focusMode = "continuous";
    }

    if (Object.keys(advancedConstraints).length === 0) return;

    try {
      await track.applyConstraints({ advanced: [advancedConstraints] });
    } catch {
      // Ignore focus upgrades on browsers that expose capabilities but reject runtime changes.
    }
  };

  const { ref: scannerRef } = useZxing({
    paused: isPaused || isRouting,
    constraints: {
      audio: false,
      video: {
        width: { ideal: 1080 },
        height: { ideal: 1920 },
        aspectRatio: { ideal: 9 / 16 },
        facingMode: { ideal: "environment" },
      },
    },
    onDecodeResult(result) {
      handleDetectedCode(result.getText());
    },
    onError(error) {
      const errorName = error instanceof Error ? error.name : "";

      if (errorName === "NotAllowedError") {
        setScanError("Camera access is blocked. Allow camera access and try again.");
        return;
      }

      if (errorName === "NotFoundError") {
        setScanError("No camera was found on this device.");
      }
    },
  });

  return (
    <div className="fixed inset-0 z-50 h-[100svh] overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        muted
        onLoadedMetadata={(event) => {
          setScanError("");
          void event.currentTarget.play().catch(() => {});
          void applyPreferredTrackSettings(event.currentTarget);
        }}
        playsInline
        ref={scannerRef}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[400px] max-h-[921px] flex-col items-center justify-center px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center">
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Scan QR
            </h1>
            <p className="text-sm text-white/75">Align the fridge QR within the frame.</p>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
            <div className="absolute inset-0 rounded-[2.6rem] bg-black/30" />
            <div className="scan-frame-corner scan-frame-corner-tl" />
            <div className="scan-frame-corner scan-frame-corner-tr" />
            <div className="scan-frame-corner scan-frame-corner-bl" />
            <div className="scan-frame-corner scan-frame-corner-br" />
          </div>

          {scanError ? (
            <p className="text-xs font-medium text-red-300">{scanError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
