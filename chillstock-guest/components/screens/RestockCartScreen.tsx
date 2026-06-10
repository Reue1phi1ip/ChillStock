"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

export function RestockCartScreen() {
  const router = useRouter();
  const {
    mainMenuInventory,
    cartItems,
    setCartQuantity,
    generalRefreshSelection,
    setGeneralRefreshSelection,
    requestRestock,
    activeRestockRequest,
    activeCheckoutRequest,
    sessionStatus,
    isLoading,
  } = useAppContext();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutInProgress = Boolean(activeCheckoutRequest);
  const hasRequestIntent = cartItems.length > 0 || generalRefreshSelection;
  const cartDetails = cartItems
    .map((item) => {
      const product = mainMenuInventory.find((entry) => entry.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const canSubmit =
    hasRequestIntent &&
    !activeRestockRequest &&
    !checkoutInProgress &&
    !isLoading &&
    sessionStatus === "active";

  const handleSubmit = async () => {
    if (!hasRequestIntent) {
      setError("Add items or select general refresh.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await requestRestock({
        requestedItems: cartItems,
        generalRefresh: generalRefreshSelection,
      });
      router.push("/restock");
    } catch (requestError) {
      console.error(requestError);
      setError("Could not submit right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <Card className="p-5 sm:p-6">
          <div className="space-y-2">
            <p className={guestTypography.eyebrowAccent}>Main menu</p>
            <h1 className={guestTypography.pageTitle}>Restock cart</h1>
          </div>

          <div className="mt-5 rounded-[1.4rem] border border-teal-200 bg-teal-50 p-4">
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-teal-950">General refresh</p>
              </div>
              <input
                checked={generalRefreshSelection}
                className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                onChange={(event) => setGeneralRefreshSelection(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>

          {checkoutInProgress ? (
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Checkout is in progress</p>
            </div>
          ) : null}

          {activeRestockRequest ? (
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">A restock request is already open</p>
              <Link className="mt-3 inline-block text-sm font-semibold text-teal-700" href="/restock">
                View request
              </Link>
            </div>
          ) : null}
        </Card>

        {cartDetails.length === 0 ? (
          <Card className="rounded-[1.8rem] border-dashed">
            <div className="space-y-4 py-4 text-center">
              <h2 className={guestTypography.sectionTitle}>Cart is empty</h2>
              <Link href="/items">
                <Button variant="secondary">Browse Menu</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="rounded-[1.8rem]">
            <h2 className={guestTypography.sectionTitle}>Items</h2>
            <div className="mt-4 space-y-3">
              {cartDetails.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3"
                  key={item.productId}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{item.product.name}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(item.product.price)}</p>
                  </div>

                  <div className="inline-flex items-center rounded-[1rem] border border-slate-200 bg-white">
                    <button
                      className="h-10 w-10 text-lg font-bold text-slate-700"
                      onClick={() => setCartQuantity(item.productId, item.quantity - 1)}
                      type="button"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-950">{item.quantity}</span>
                    <button
                      className="h-10 w-10 text-lg font-bold text-slate-700"
                      onClick={() => setCartQuantity(item.productId, item.quantity + 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {error ? <p className="text-sm font-semibold text-red-500">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link href="/items">
            <Button variant="secondary">Browse Menu</Button>
          </Link>
          <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Submitting..." : "Send Restock"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
