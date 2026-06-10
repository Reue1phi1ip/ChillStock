"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DepositScreen() {
  const router = useRouter();
  const { addDeposit, canAuthorizeDeposit, deposit, isSessionPreparing, sessionStatus } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setError("");
    setLoading(true);
    try {
      await addDeposit(40);
    } catch (paymentError) {
      console.error("Failed to authorize deposit hold", paymentError);
      setError("We couldn't authorize the hold yet. Please try again in a moment.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((sessionStatus === "active" || sessionStatus === "checkout_pending") && deposit > 0) {
      router.push(sessionStatus === "checkout_pending" ? "/checkout" : "/unlock");
    }
  }, [deposit, router, sessionStatus]);

  if (sessionStatus === "checked_out") {
    return (
      <AppShell>
        <div className="mx-auto grid w-full max-w-4xl flex-1 content-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:items-center">
          <ScreenHeader
            description="Your session has already been settled. View the checkout summary for final details."
            icon="check-circle"
            title="Session Settled"
            tone="emerald"
          />

          <Card className="space-y-4">
            <p className={guestTypography.body}>
              You do not need to authorize a new deposit hold right now.
            </p>
            <Button className="w-full" onClick={() => router.push("/checkout")}>
              <Icon name="receipt" size={18} />
              <span>View Checkout Summary</span>
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-4xl flex-1 content-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 lg:items-center">
        <ScreenHeader
          description="A temporary €40.00 hold secures your access. You only pay for what you take."
          icon="lock"
          title="Secure Hold"
          tone="emerald"
        />

        <div className="space-y-5">
          {isSessionPreparing && (
            <Card className="border-teal-200 bg-teal-50">
              <div className="flex items-center gap-3 text-sm text-teal-800">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300 border-t-teal-700" />
                <span>Preparing your secure hold...</span>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className={guestTypography.metric}>Hold Amount</span>
              <span className="font-display text-3xl font-bold tracking-tight text-slate-950">
                €40.00
              </span>
            </div>
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-2.5 text-sm text-slate-600">
                <Icon name="check-circle" size={16} className="mt-0.5 shrink-0 text-teal-600" />
                <span>Unused funds released instantly at checkout</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-slate-600">
                <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-amber-500" />
                <span>We&apos;ll notify you near your limit</span>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3 rounded-[2rem] border-2 border-teal-300/80 bg-white/56 p-4 shadow-[0_22px_50px_rgba(111,128,156,0.14)] backdrop-blur-[18px]">
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <span className="text-xs font-bold italic tracking-tighter">VISA</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">
                •••• •••• •••• 4242
              </span>
              <span className="text-xs text-slate-500">Expires 12/28</span>
            </div>
            <div className="h-5 w-5 rounded-full border-[5px] border-teal-600 bg-white/90" />
          </div>

          {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}

          <Button
            className="w-full"
            disabled={loading || !canAuthorizeDeposit}
            onClick={handlePayment}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Processing...</span>
              </>
            ) : isSessionPreparing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Preparing Hold...</span>
              </>
            ) : (
              <>
                <Icon name="card" size={18} />
                <span>Authorize €40.00</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
