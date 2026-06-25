"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { ConsumedItemList } from "@/components/shared/ConsumedItemList";
import { guestTypography } from "@/components/shared/guestTypography";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function formatCheckoutStatusLabel(status: string) {
  if (status === "completed" || status === "checked_out") return "Closed";
  if (status === "top_up_required") return "Top-up";
  if (status === "checkout_pending") return "Pending";
  return status.replaceAll("_", " ");
}

function formatCheckoutOutcome(authorizedTotal: number, consumedTotal: number) {
  const balance = authorizedTotal - consumedTotal;

  if (balance > 0) return `${formatCurrency(balance)} back`;
  if (balance < 0) return `${formatCurrency(Math.abs(balance))} top-up`;
  return "Even";
}

export function CheckoutScreen() {
  const {
    requiredTopUp,
    consumption,
    authorizedTotal,
    consumedTotal,
    requestCheckout,
    topUpDeposit,
    logout,
    activeRestockRequest,
    activeAddOnRequest,
    activeCheckoutRequest,
    latestReconciliationRequest,
    sessionStatus,
    sessionHistory,
  } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExitingAfterStay, setIsExitingAfterStay] = useState(false);
  const [error, setError] = useState("");
  const [exitError, setExitError] = useState("");
  const checkoutRequest =
    activeCheckoutRequest
      ? activeCheckoutRequest
      : latestReconciliationRequest?.type === "checkout"
        ? latestReconciliationRequest
        : null;
  const inventoryRequestBlocking = Boolean(activeRestockRequest || activeAddOnRequest);
  const checkoutPending =
    checkoutRequest?.status === "requested" ||
    checkoutRequest?.status === "enroute" ||
    checkoutRequest?.status === "reconciled";
  const topUpRequired = checkoutRequest?.status === "top_up_required";
  const isComplete = sessionStatus === "checked_out";
  const hasSettlement =
    Boolean(checkoutRequest) &&
    (topUpRequired || checkoutRequest?.status === "completed" || isComplete);
  const settlementBalance = authorizedTotal - consumedTotal;
  const topUpOutcome = Math.max(0, topUpRequired ? requiredTopUp : -settlementBalance);
  const refundOutcome = Math.max(0, settlementBalance);
  const currentOpenSession = sessionHistory.find((entry) => entry.status !== "checked_out") ?? null;
  const previousSessions = sessionHistory.filter((entry) => entry.sessionId !== currentOpenSession?.sessionId);
  const isInteractionLocked = isProcessing || isLoggingOut || isExitingAfterStay;

  const handleCheckoutRequest = async () => {
    if (isInteractionLocked) return;
    setIsProcessing(true);
    setError("");
    try {
      await requestCheckout();
    } catch {
      setError("Finish the open minibar request before checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalTopUp = async () => {
    if (isInteractionLocked) return;
    setIsProcessing(true);
    setError("");
    try {
      await topUpDeposit();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setError("");
    setExitError("");
    setIsExitingAfterStay(true);
    setIsLoggingOut(true);
    try {
      await logout();
      window.location.replace("/");
    } catch (logoutError) {
      console.error("Failed to log out guest", logoutError);
      setExitError("We couldn't log out yet. Please try again.");
      setIsLoggingOut(false);
    }
  };

  if (isExitingAfterStay) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 py-10 text-slate-950">
        <div className="w-full max-w-md rounded-[2.4rem] border border-white/60 bg-white/62 p-7 text-center shadow-[0_28px_72px_rgba(108,123,153,0.18)] backdrop-blur-[20px]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-white/70 bg-teal-50 text-teal-700 shadow-[0_16px_34px_rgba(20,184,166,0.16)]">
            <Icon name={exitError ? "alert" : "check-circle"} size={30} strokeWidth={1.6} />
          </div>
          <div className="mt-5 space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
              Thanks for staying with us
            </h1>
            <p className={guestTypography.bodyMuted}>
              {exitError ||
                "We hope you had a good time. We're signing you out and closing this device session."}
            </p>
          </div>
          <div className="mt-6 flex items-center justify-center">
            {exitError ? (
              <Button className="w-full" disabled={isLoggingOut} onClick={handleLogout}>
                {isLoggingOut ? "Trying again..." : "Try logging out again"}
              </Button>
            ) : (
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-4xl flex-1 content-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:items-center">
        <ScreenHeader
          description={
            isComplete
              ? "Your stay is settled."
              : "Request checkout and we&apos;ll confirm the final balance."
          }
          icon="receipt"
          title={isComplete ? "Checked Out" : "Final Reconciliation"}
        />

        <div className="space-y-5">
          {isComplete ? (
            <>
              <div className="flex flex-col items-center justify-center space-y-4 rounded-[2.4rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(224,252,242,0.72))] px-6 py-14 text-center shadow-[0_24px_56px_rgba(108,123,153,0.15)] backdrop-blur-[18px]">
                <Icon name="check-circle" size={56} className="text-teal-600" strokeWidth={1.5} />
                <h2 className="font-display text-[1.375rem] font-bold tracking-tight text-teal-900 sm:text-[1.5rem]">
                  Tab Closed
                </h2>
                <p className="max-w-sm text-sm leading-6 text-teal-700/70">
                  {refundOutcome > 0
                    ? `${formatCurrency(refundOutcome)} will be released to your card.`
                    : "No refund is due."}
                </p>
              </div>
              {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
              <Button className="w-full" disabled={isInteractionLocked} onClick={handleLogout}>
                {isLoggingOut ? (
                  "Logging out..."
                ) : (
                  <>
                    <Icon name="log-out" size={18} />
                    <span>Log out</span>
                  </>
                )}
              </Button>
            </>
          ) : checkoutPending ? (
            <div className="rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(224,252,242,0.54))] p-5 text-center shadow-[0_24px_56px_rgba(108,123,153,0.15)] backdrop-blur-[18px]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/78 text-teal-700 shadow-[0_10px_24px_rgba(108,123,153,0.12)]">
                <Icon name="truck" size={24} />
              </div>
              <h2 className={cn(guestTypography.cardTitle, "mt-4")}>Waiting for restocker</h2>
              <p className={cn(guestTypography.bodyMuted, "mt-2")}>
                Final charges will show here after the fridge is checked.
              </p>
            </div>
          ) : topUpRequired ? (
            <div className="rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(255,241,216,0.54))] p-5 shadow-[0_24px_56px_rgba(108,123,153,0.15)] backdrop-blur-[18px]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/78 text-amber-700 shadow-[0_10px_24px_rgba(108,123,153,0.12)]">
                  <Icon name="alert" size={20} />
                </div>
                <div>
                  <h2 className={guestTypography.cardTitle}>Final top-up required</h2>
                  <p className={cn(guestTypography.body, "mt-1")}>
                    Pay {formatCurrency(requiredTopUp)} to close your tab.
                  </p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={isInteractionLocked} onClick={handleFinalTopUp}>
                {isProcessing ? "Processing..." : `Pay ${formatCurrency(requiredTopUp)}`}
              </Button>
            </div>
          ) : (
            <>
              {inventoryRequestBlocking && (
                <p className="text-center text-sm font-semibold text-amber-600">
                  Finish the open minibar request first.
                </p>
              )}
              {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}

              <Button
                className="w-full"
                disabled={isInteractionLocked || inventoryRequestBlocking}
                onClick={handleCheckoutRequest}
              >
                {isProcessing ? (
                  <span className="animate-pulse">Requesting...</span>
                ) : (
                  <>
                    <span>Request Final Reconciliation</span>
                    <Icon name="arrow-right" size={18} />
                  </>
                )}
              </Button>
            </>
          )}

          {hasSettlement && (
            <Card>
              <p className={guestTypography.eyebrowMuted}>Settlement</p>
              <h2 className={cn(guestTypography.sectionTitle, "mt-2")}>This stay</h2>

              <div className="mt-5 space-y-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Consumed</span>
                  <span className="font-semibold text-slate-950">
                    {formatCurrency(consumedTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Authorized</span>
                  <span className="font-semibold text-slate-950">
                    {formatCurrency(authorizedTotal)}
                  </span>
                </div>
                <div className="h-px w-full bg-slate-100" />
                {topUpOutcome > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-amber-700">Top-up</span>
                    <span className="font-semibold text-amber-800">
                      {formatCurrency(topUpOutcome)}
                    </span>
                  </div>
                ) : refundOutcome > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-emerald-700">Refund</span>
                    <span className="font-semibold text-emerald-800">
                      {formatCurrency(refundOutcome)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">Outcome</span>
                    <span className="font-semibold text-slate-900">No refund due</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card>
            <p className={guestTypography.eyebrowMuted}>This stay</p>
            <h2 className={cn(guestTypography.sectionTitle, "mt-2")}>Logged items</h2>
            <div className="mt-5">
              <ConsumedItemList
                emptyMessage="No consumed items have been logged by a restocker yet."
                items={consumption}
              />
            </div>
          </Card>

          <Card>
            <p className={guestTypography.eyebrowMuted}>Previous checkouts</p>
            <h2 className={cn(guestTypography.sectionTitle, "mt-2")}>History</h2>

            {previousSessions.length === 0 ? (
              <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No previous checkout history is available yet.
              </div>
            ) : (
              <div className="mt-5 max-h-[18rem] overflow-y-auto pr-1">
                <div className="space-y-2.5">
                {previousSessions.map((session) => {
                  const sessionStatusLabel =
                    session.checkoutRequest?.status === "completed" || session.status === "checked_out"
                      ? "Closed"
                      : formatCheckoutStatusLabel(
                          session.checkoutRequest?.status ?? session.status,
                        );

                  return (
                    <div
                      className="rounded-[1.35rem] border border-white/70 bg-white/72 px-3.5 py-3 shadow-[0_14px_28px_rgba(108,123,153,0.1)]"
                      key={session.sessionId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {session.hotelName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {formatTimestamp(session.createdAt)}
                            {session.location ? ` · ${session.location}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          {sessionStatusLabel}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-white/70 bg-white/76 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Auth
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCurrency(session.totalAuthorized)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/76 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Used
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCurrency(session.totalConsumed)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/76 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            Outcome
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCheckoutOutcome(
                              session.totalAuthorized,
                              session.totalConsumed,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
