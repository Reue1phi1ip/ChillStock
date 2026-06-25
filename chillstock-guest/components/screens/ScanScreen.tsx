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

const DEFAULT_DEMO_FRIDGE_CODE = "7429";

function hasCameraAccessApi() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function buildAuthPath(fridgeCode: string) {
  const normalizedCode = fridgeCode.trim();
  if (!normalizedCode) return null;

  const params = new URLSearchParams({ fridgeCode: normalizedCode });
  return `/auth?${params.toString()}`;
}

function getFridgeCodeFromParams(params: URLSearchParams) {
  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, "");
    if (
      normalizedKey === "fridgecode" ||
      normalizedKey === "code" ||
      normalizedKey === "fridge"
    ) {
      const normalizedValue = value.trim();
      if (normalizedValue) return normalizedValue;
    }
  }

  return null;
}

function getFridgeCodeFromPath(pathname: string) {
  const segments = pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment).trim();
      } catch {
        return segment.trim();
      }
    })
    .filter(Boolean);
  const numericSegment = segments.find((segment) => /^\d{4,}$/.test(segment));

  return numericSegment ?? null;
}

function extractFridgeCodeFromQrValue(value: string) {
  const scannedValue = value.trim();
  if (!scannedValue) return null;

  if (/^\d{4,}$/.test(scannedValue)) {
    return scannedValue;
  }

  try {
    const url = new URL(scannedValue);
    return getFridgeCodeFromParams(url.searchParams) ?? getFridgeCodeFromPath(url.pathname);
  } catch {
    // Continue with partial URL/query parsing below.
  }

  if (scannedValue.startsWith("?")) {
    return getFridgeCodeFromParams(new URLSearchParams(scannedValue.slice(1)));
  }

  const queryStart = scannedValue.indexOf("?");
  if (queryStart !== -1) {
    const hashStart = scannedValue.indexOf("#", queryStart);
    const query =
      hashStart === -1
        ? scannedValue.slice(queryStart + 1)
        : scannedValue.slice(queryStart + 1, hashStart);
    const fridgeCode = getFridgeCodeFromParams(new URLSearchParams(query));
    if (fridgeCode) return fridgeCode;
  }

  return getFridgeCodeFromPath(scannedValue);
}

function normalizeQrValueToAuthPath(value: string) {
  const fridgeCode = extractFridgeCodeFromQrValue(value);
  return fridgeCode ? buildAuthPath(fridgeCode) : null;
}

export function ScanScreen() {
  const router = useRouter();
  const [scanError, setScanError] = useState(() =>
    hasCameraAccessApi()
      ? ""
      : "This browser is not exposing camera access. Enter 7429 below or open the QR link directly.",
  );
  const [scanStatus, setScanStatus] = useState(() =>
    hasCameraAccessApi()
      ? "Starting camera..."
      : "Camera scanning is unavailable in this browser.",
  );
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(hasCameraAccessApi);
  const [isPaused, setIsPaused] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [manualCode, setManualCode] = useState(DEFAULT_DEMO_FRIDGE_CODE);
  const [lastRejectedQrValue, setLastRejectedQrValue] = useState("");

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

  useEffect(() => {
    if (!isCameraSupported || isCameraReady || scanError) return;

    const timeoutId = window.setTimeout(() => {
      setScanStatus("Still waiting for camera access. If no prompt appears, check browser camera permissions.");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [isCameraReady, isCameraSupported, scanError]);

  const routeToAuthPath = (authPath: string | null) => {
    if (isRouting) return;

    if (!authPath) {
      setScanError(
        "QR scanned, but no fridge code was found. Use a QR with fridgeCode=7429 or raw code 7429.",
      );
      return;
    }

    setScanError("");
    setLastRejectedQrValue("");
    setIsPaused(true);
    setIsRouting(true);

    router.push(authPath);
  };

  const handleDetectedCode = (value: string) => {
    const authPath = normalizeQrValueToAuthPath(value);
    if (!authPath) {
      console.warn("Rejected fridge QR payload", value);
      setLastRejectedQrValue(value.trim());
    }
    routeToAuthPath(authPath);
  };

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    routeToAuthPath(buildAuthPath(manualCode || DEFAULT_DEMO_FRIDGE_CODE));
  };

  const handleDemoContinue = () => {
    routeToAuthPath(buildAuthPath(DEFAULT_DEMO_FRIDGE_CODE));
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
    paused: !isCameraSupported || isPaused || isRouting,
    constraints: {
      audio: false,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
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
        return;
      }

      if (error instanceof Error) {
        const isMissingMediaDevices =
          error.message.includes("mediaDevices") || error.message.includes("getUserMedia");

        if (isMissingMediaDevices) {
          setIsCameraSupported(false);
          setScanStatus("Camera scanning is unavailable in this browser.");
          setScanError(
            "This browser is not exposing camera access. Enter 7429 below or open the QR link directly.",
          );
          return;
        }

        setScanError(`Camera could not start: ${error.message}`);
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
          setIsCameraReady(true);
          setScanStatus("Camera ready. Align the fridge QR within the frame.");
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
            <p className="text-sm text-white/75">{scanStatus}</p>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
            <div className="absolute inset-0 rounded-[2.6rem] bg-black/30" />
            <div className="scan-frame-corner scan-frame-corner-tl" />
            <div className="scan-frame-corner scan-frame-corner-tr" />
            <div className="scan-frame-corner scan-frame-corner-bl" />
            <div className="scan-frame-corner scan-frame-corner-br" />
          </div>

          {scanError ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-300">{scanError}</p>
              {lastRejectedQrValue ? (
                <p className="break-all rounded-xl bg-black/35 px-3 py-2 text-[0.68rem] leading-snug text-white/70">
                  Decoded: {lastRejectedQrValue}
                </p>
              ) : null}
            </div>
          ) : null}

          <form
            className="mx-auto flex w-full max-w-[18rem] gap-2 rounded-[1.5rem] border border-white/20 bg-white/10 p-2 backdrop-blur-md"
            onSubmit={handleManualSubmit}
          >
            <input
              aria-label="Fridge code"
              className="min-w-0 flex-1 rounded-[1rem] border border-white/20 bg-black/25 px-4 py-3 text-center text-base font-semibold tracking-[0.18em] text-white outline-none placeholder:text-white/40"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => {
                setManualCode(event.target.value.replace(/\D/g, "").slice(0, 4));
              }}
              placeholder={DEFAULT_DEMO_FRIDGE_CODE}
              value={manualCode}
            />
            <button
              className="rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition active:scale-[0.98]"
              disabled={isRouting}
              type="submit"
            >
              Go
            </button>
          </form>

          <button
            className="mx-auto block w-full max-w-[18rem] rounded-[1.25rem] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 active:scale-[0.98]"
            disabled={isRouting}
            onClick={handleDemoContinue}
            type="button"
          >
            Continue with 7429
          </button>
        </div>
      </div>
    </div>
  );
}
