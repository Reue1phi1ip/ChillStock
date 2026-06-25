"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useAppContext } from "@/components/providers/AppProvider";
import { GuestLoadingScreen } from "@/components/shared/GuestLoadingScreen";
import { guestTypography } from "@/components/shared/guestTypography";
import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

const steps = ["/", "/scan", "/auth", "/deposit", "/unlock", "/dashboard"];
const tabPaths = ["/dashboard", "/items", "/restock"];
const publicPaths = new Set(["/", "/scan", "/auth"]);
const QR_REROUTE_PENDING_NOTICE_KEY = "chillstock:qr-reroute:pending";

const tabs: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/items", label: "Menu", icon: "items" },
  { href: "/restock", label: "Request", icon: "truck" },
];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const stripped = pathname.replace(/\/+$/, "");
  return stripped || "/";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = normalizePath(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isAuthenticated,
    isLoading,
    isSessionBootstrapping,
    deposit,
    sessionStatus,
    fridgeCode: currentFridgeCode,
    requiredTopUp,
    topUpRequest,
    showOverDepositModal,
    topUpDeposit,
  } = useAppContext();
  const [isPayingTopUp, setIsPayingTopUp] = useState(false);
  const [mismatchNotice, setMismatchNotice] = useState<string | null>(null);
  const isAuthRoute = normalizedPath === "/auth";
  const showBottomNav = tabPaths.includes(normalizedPath);
  const isCheckedOutCheckoutRoute =
    normalizedPath === "/checkout" && sessionStatus === "checked_out";
  const showBackButton =
    normalizedPath !== "/" && !showBottomNav && !isAuthRoute && !isCheckedOutCheckoutRoute;
  const currentStep = steps.indexOf(normalizedPath);
  const showProgress = currentStep > 0;
  const progress = showProgress ? (currentStep / (steps.length - 1)) * 100 : 0;
  const showGlobalTopUpModal = showOverDepositModal && requiredTopUp > 0 && Boolean(topUpRequest);
  const isQrAuthChoicePending =
    isAuthRoute &&
    Boolean(searchParams.get("fridgeCode")?.trim()) &&
    searchParams.get("authReady") !== "1";
  const scannedFridgeCode = searchParams.get("fridgeCode")?.trim() || null;
  const homeHref =
    normalizedPath === "/scan"
      ? "/scan"
      : isAuthRoute
        ? "/auth"
        : isCheckedOutCheckoutRoute
          ? "/checkout"
          : "/dashboard";
  const showSessionLoadingScreen =
    isAuthenticated && !isQrAuthChoicePending && (isLoading || isSessionBootstrapping);

  useEffect(() => {
    if (isLoading || isSessionBootstrapping) return;

    if (isQrAuthChoicePending) return;

    if (!isAuthenticated) {
      if (!publicPaths.has(normalizedPath)) {
        router.replace("/");
      }
      return;
    }

    if (!sessionStatus) {
      if (!publicPaths.has(normalizedPath)) {
        router.replace("/scan");
      }
      return;
    }

    if (sessionStatus === "deposit_pending") {
      if (normalizedPath !== "/deposit") {
        router.replace("/deposit");
      }
      return;
    }

    if (sessionStatus === "checked_out") {
      if (normalizedPath !== "/checkout") {
        router.replace("/checkout");
      }
      return;
    }

    if (
      (sessionStatus === "active" || sessionStatus === "checkout_pending") &&
      normalizedPath === "/deposit" &&
      deposit > 0
    ) {
      router.replace(sessionStatus === "checkout_pending" ? "/checkout" : "/unlock");
      return;
    }

    if (
      (sessionStatus === "active" || sessionStatus === "checkout_pending") &&
      (normalizedPath === "/" || normalizedPath === "/scan" || normalizedPath === "/auth")
    ) {
      router.replace(sessionStatus === "checkout_pending" ? "/checkout" : "/dashboard");
      return;
    }

  }, [
    deposit,
    isAuthenticated,
    isLoading,
    isSessionBootstrapping,
    isQrAuthChoicePending,
    normalizedPath,
    router,
    sessionStatus,
  ]);

  useEffect(() => {
    if (isLoading || isSessionBootstrapping || !isAuthenticated) return;
    if (!scannedFridgeCode || !currentFridgeCode || scannedFridgeCode === currentFridgeCode) return;

    const storageKey = `chillstock:qr-reroute:${scannedFridgeCode}:${currentFridgeCode}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey) === "1") return;

    const message = `You already have an active stay on fridge ${currentFridgeCode}. We returned you to that tab.`;
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
      window.sessionStorage.setItem(QR_REROUTE_PENDING_NOTICE_KEY, message);
    }
    if (!isAuthRoute) {
      queueMicrotask(() => setMismatchNotice(message));
    }
  }, [
    currentFridgeCode,
    isAuthenticated,
    isAuthRoute,
    isLoading,
    isSessionBootstrapping,
    scannedFridgeCode,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pendingNotice = window.sessionStorage.getItem(QR_REROUTE_PENDING_NOTICE_KEY);
    if (!pendingNotice) return;

    window.sessionStorage.removeItem(QR_REROUTE_PENDING_NOTICE_KEY);
    queueMicrotask(() => setMismatchNotice(pendingNotice));
  }, []);

  const handleTopUp = async () => {
    setIsPayingTopUp(true);
    try {
      await topUpDeposit();
    } finally {
      setIsPayingTopUp(false);
    }
  };

  return (
    <div className="min-h-dvh text-slate-950 lg:p-6">
      <div className="mx-auto flex min-h-dvh w-full flex-col lg:min-h-[calc(100dvh-3rem)] lg:max-w-6xl lg:overflow-hidden lg:rounded-[40px] lg:border lg:border-white/40 lg:bg-white/10 lg:shadow-[0_36px_96px_rgba(74,88,118,0.18)] lg:backdrop-blur-[24px]">
        <header className="sticky top-0 z-30 flex h-[4.35rem] shrink-0 items-center justify-between px-5 pt-2.5 sm:h-20 sm:px-8 sm:pt-4 lg:px-10">
          {showBackButton ? (
            <button
              aria-label="Go back"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/65 bg-white/48 text-slate-600 shadow-[0_14px_34px_rgba(106,120,150,0.16)] backdrop-blur-[18px] transition hover:bg-white/70 hover:text-slate-950"
              onClick={() => router.back()}
              type="button"
            >
              <Icon name="chevron-left" size={21} />
            </button>
          ) : (
            <span className="h-12 w-12" />
          )}
          <Link
            aria-label="ChilledStock home"
            className="inline-flex items-center justify-center rounded-full border border-white/65 bg-white/58 px-7 py-2 shadow-[0_18px_42px_rgba(117,131,160,0.18)] backdrop-blur-[22px] sm:px-6 sm:py-3"
            href={homeHref}
          >
            <BrandLogo size="md" />
          </Link>
          <span className="h-12 w-12" />
        </header>

        {showProgress && !showSessionLoadingScreen && (
          <div className="px-5 pb-3 pt-1 sm:px-8 sm:pt-0 lg:px-10">
            <div className="h-1.5 w-full rounded-full bg-white/36">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400 via-violet-500 to-orange-500 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <main
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden bg-transparent",
            showBottomNav && "pb-[6.5rem]",
          )}
        >
          {showSessionLoadingScreen ? (
            <GuestLoadingScreen />
          ) : (
            <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-4 sm:px-8 lg:px-10 lg:py-6">
              {mismatchNotice ? (
                <div className="mb-4 flex items-start gap-3 rounded-[1.35rem] border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-[0_14px_34px_rgba(108,123,153,0.12)]">
                  <Icon className="mt-0.5 shrink-0 text-amber-600" name="alert" size={16} />
                  <p className="min-w-0 flex-1">{mismatchNotice}</p>
                  <button
                    aria-label="Dismiss fridge notice"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-amber-700 transition hover:bg-white/60"
                    onClick={() => setMismatchNotice(null)}
                    type="button"
                  >
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ) : null}
              {children}
            </div>
          )}
        </main>

        {showBottomNav && !showSessionLoadingScreen && (
          <nav className="sticky bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            <div className="mx-auto flex max-w-xl items-stretch gap-2 rounded-[28px] border border-white/60 bg-white p-1.5 shadow-[0_20px_42px_rgba(105,120,150,0.16)]">
              {tabs.map((tab) => {
                const active = pathname === tab.href;

                return (
                  <Link
                    className={cn(
                      "flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-[1.1rem] px-2.5 text-[13px] font-semibold transition sm:gap-2 sm:px-3 sm:text-sm",
                      active
                        ? "bg-white/86 text-slate-950 shadow-[0_10px_22px_rgba(106,120,150,0.14)]"
                        : "text-slate-500 hover:bg-white/42 hover:text-slate-800",
                    )}
                    href={tab.href}
                    key={tab.href}
                  >
                    <Icon name={tab.icon} size={18} />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {showGlobalTopUpModal && topUpRequest && (
        <Modal>
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <Icon name="alert" size={24} />
            </div>
            <div className="space-y-2">
              <h2 className={guestTypography.cardTitle}>Top-Up Required</h2>
              <p className={guestTypography.bodyMuted}>
                {topUpRequest.type === "checkout"
                  ? `The restocker logged final usage above your balance. Pay ${formatCurrency(requiredTopUp)} to close your tab.`
                  : topUpRequest.type === "add_on"
                    ? `Your add-ons were logged above your current balance. Pay ${formatCurrency(requiredTopUp)} to confirm the delivery.`
                  : topUpRequest.restockChargeMode === "full_restock"
                    ? `The restocker marked this as a full fridge refresh. Pay ${formatCurrency(requiredTopUp)} to continue enjoying the restocked minibar.`
                    : `The restocker added items back into the fridge. Pay ${formatCurrency(requiredTopUp)} to cover the refresh and keep going.`}
              </p>
            </div>
            <div className="space-y-2.5">
              <Button className="w-full" disabled={isPayingTopUp} onClick={handleTopUp}>
                {isPayingTopUp ? "Processing..." : `Pay ${formatCurrency(requiredTopUp)}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
