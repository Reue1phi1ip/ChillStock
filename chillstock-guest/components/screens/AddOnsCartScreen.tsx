"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function AddOnsCartScreen() {
  const router = useRouter();
  const {
    addOnInventory,
    addOnCartItems,
    addOnCartCount,
    setAddOnCartQuantity,
    requestAddOn,
    activeAddOnRequest,
    activeCheckoutRequest,
    sessionStatus,
    isLoading,
  } = useAppContext();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutInProgress = Boolean(activeCheckoutRequest);
  const hasItems = addOnCartCount > 0;
  const cartDetails = addOnCartItems
    .map((item) => {
      const product = addOnInventory.find((entry) => entry.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const canSubmit =
    hasItems &&
    !activeAddOnRequest &&
    !checkoutInProgress &&
    !isLoading &&
    sessionStatus === "active";

  const handleSubmit = async () => {
    if (!hasItems) {
      setError("Add at least one item.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await requestAddOn({
        requestedItems: addOnCartItems,
      });
      router.push("/addons");
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
            <p className={guestTypography.eyebrowAccent}>Add-ons</p>
            <h1 className={guestTypography.pageTitle}>Add-On cart</h1>
          </div>

          {checkoutInProgress ? (
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Checkout is in progress</p>
            </div>
          ) : null}

          {activeAddOnRequest ? (
            <div className="mt-4 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">An add-on request is already open</p>
              <Link className="mt-3 inline-block text-sm font-semibold text-teal-700" href="/addons">
                View request
              </Link>
            </div>
          ) : null}
        </Card>

        {cartDetails.length === 0 ? (
          <Card className="rounded-[1.8rem] border-dashed">
            <div className="space-y-4 py-4 text-center">
              <h2 className={guestTypography.sectionTitle}>Cart is empty</h2>
              <Link href="/items?menu=addons">
                <Button variant="secondary">Browse Add-Ons</Button>
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
                      onClick={() => setAddOnCartQuantity(item.productId, item.quantity - 1)}
                      type="button"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-950">{item.quantity}</span>
                    <button
                      className="h-10 w-10 text-lg font-bold text-slate-700"
                      onClick={() => setAddOnCartQuantity(item.productId, item.quantity + 1)}
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
          <Link href="/items?menu=addons">
            <Button variant="secondary">Browse Add-Ons</Button>
          </Link>
          <Button disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Submitting..." : "Send Add-Ons"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
