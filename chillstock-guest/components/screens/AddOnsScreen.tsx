"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { type ReconciliationRequest, useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

const statusCopy: Record<
  ReconciliationRequest["status"],
  { title: string; description: string }
> = {
  requested: {
    title: "Add-Ons requested",
    description: "Waiting for a restocker.",
  },
  enroute: {
    title: "Add-Ons en route",
    description: "A restocker is on the way.",
  },
  reconciled: {
    title: "Add-Ons confirmed",
    description: "Your extra items were logged.",
  },
  top_up_required: {
    title: "Top-up required",
    description: "Pay to confirm the add-ons.",
  },
  completed: {
    title: "Add-Ons complete",
    description: "Your extra items are settled.",
  },
  cancelled: {
    title: "Add-Ons cancelled",
    description: "This request is closed.",
  },
};

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function TimelineStep({
  icon,
  title,
  description,
  timestamp,
}: {
  icon: "send" | "truck" | "card" | "check-circle";
  title: string;
  description?: string;
  timestamp?: number;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/80">
          <Icon name={icon} size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">{title}</p>
            {timestamp ? <span className="text-xs font-medium text-slate-500">{formatTimestamp(timestamp)}</span> : null}
          </div>
          {description ? <p className={cn(guestTypography.bodyMuted, "mt-1")}>{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AddOnsScreen() {
  const {
    activeAddOnRequest,
    latestAddOnRequest,
    topUpDeposit,
    requiredTopUp,
    sessionStatus,
    isLoading,
    inventory,
  } = useAppContext();
  const requestForTimeline = activeAddOnRequest ?? latestAddOnRequest;
  const copy = statusCopy[activeAddOnRequest?.status ?? requestForTimeline?.status ?? "requested"];
  const chargeAmount =
    activeAddOnRequest?.status === "top_up_required"
      ? requiredTopUp
      : requestForTimeline
        ? requestForTimeline.topUpRequiredCents > 0
          ? requestForTimeline.topUpRequiredCents / 100
          : requestForTimeline.addedValueCents / 100
        : 0;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <Card className="border-teal-200/70 bg-gradient-to-b from-teal-50 via-white to-white p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] bg-teal-100 text-teal-700 sm:h-16 sm:w-16 sm:rounded-[1.6rem]">
                <Icon name="shopping-bag" size={28} />
              </div>
              <div>
                <p className={guestTypography.eyebrowAccent}>Extra items</p>
                <h1 className={cn(guestTypography.pageTitle, "mt-2")}>
                  {activeAddOnRequest ? copy.title : "Add-Ons"}
                </h1>
                <p className={cn(guestTypography.body, "mt-2 max-w-xl")}>
                  {activeAddOnRequest ? copy.description : "Pick extra items from the add-ons menu."}
                </p>
              </div>
            </div>

            {activeAddOnRequest ? (
              <span className="self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                {activeAddOnRequest.status.replaceAll("_", " ")}
              </span>
            ) : (
              <span className="self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Ready
              </span>
            )}
          </div>

          {activeAddOnRequest?.status === "top_up_required" ? (
            <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Top-up required</p>
              <p className={cn(guestTypography.body, "mt-1 text-amber-800")}>
                Pay {formatCurrency(requiredTopUp)} to confirm the add-ons.
              </p>
              <Button className="mt-4 w-full sm:w-auto" onClick={topUpDeposit}>
                Pay {formatCurrency(requiredTopUp)}
              </Button>
            </div>
          ) : null}

          {!activeAddOnRequest ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="sm:w-auto" href="/addonscart">
                <Button className="w-full" disabled={isLoading || sessionStatus !== "active"}>
                  {isLoading ? "Preparing..." : "Open Cart"}
                </Button>
              </Link>
              <Link className="sm:w-auto" href="/items?menu=addons">
                <Button className="w-full" variant="secondary">
                  Browse Add-Ons
                </Button>
              </Link>
            </div>
          ) : null}

          <Link
            className="mt-4 flex items-center gap-3 rounded-[1.6rem] border border-white/70 bg-white/62 px-4 py-4 shadow-[0_18px_40px_rgba(108,123,153,0.14)] backdrop-blur-[18px] transition hover:-translate-y-0.5 hover:bg-white/78"
            href="/special-order"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-rose-500 text-white shadow-[0_16px_36px_rgba(244,63,94,0.24)]">
              <Icon name="shopping-bag" size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-950">Special Order</span>
              <span className={cn(guestTypography.caption, "mt-0.5 block")}>Not listed in the menu.</span>
            </span>
            <Icon className="text-slate-400" name="arrow-right" size={16} />
          </Link>
        </Card>

        {requestForTimeline && requestForTimeline.type === "add_on" ? (
          <>
            <Card className="rounded-[1.75rem] border-slate-200/70 bg-white/72 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={guestTypography.eyebrowMuted}>Request details</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {requestForTimeline.status.replaceAll("_", " ")}
                </span>
              </div>

              {requestForTimeline.requestedItems.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {requestForTimeline.requestedItems.map((item) => {
                    const product = inventory.find((entry) => entry.id === item.productId);
                    return (
                      <span
                        className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800"
                        key={`${item.productId}-${item.quantity}`}
                      >
                        {product?.name ?? "Item"} x{item.quantity}
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {chargeAmount > 0 ? (
                <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Estimated top-up</p>
                  <p className="mt-2 text-sm font-semibold text-amber-950">{formatCurrency(chargeAmount)}</p>
                </div>
              ) : null}
            </Card>

            <Card className="rounded-[1.85rem] border-white/70 bg-white/58 p-5">
              <p className={guestTypography.eyebrowMuted}>Timeline</p>
              <div className="mt-4 space-y-3">
                <TimelineStep
                  description="Request sent."
                  icon="send"
                  timestamp={requestForTimeline.requestedAt}
                  title="Request submitted"
                />
                {requestForTimeline.enrouteAt || requestForTimeline.status !== "requested" ? (
                  <TimelineStep
                    description={requestForTimeline.restockerName ? `${requestForTimeline.restockerName} is assigned.` : "On the way."}
                    icon="truck"
                    timestamp={requestForTimeline.enrouteAt ?? requestForTimeline.reconciledAt ?? requestForTimeline.completedAt}
                    title={requestForTimeline.restockerName ? `${requestForTimeline.restockerName} is assigned` : "Add-ons en route"}
                  />
                ) : null}
                {requestForTimeline.status === "top_up_required" ? (
                  <TimelineStep
                    description={`Pay ${formatCurrency(chargeAmount)}.`}
                    icon="card"
                    timestamp={requestForTimeline.reconciledAt}
                    title="Top-up requested"
                  />
                ) : null}
                {(requestForTimeline.completedAt || requestForTimeline.reconciledAt) &&
                requestForTimeline.status !== "top_up_required" ? (
                  <TimelineStep
                    description="Add-ons settled."
                    icon="check-circle"
                    timestamp={requestForTimeline.completedAt ?? requestForTimeline.reconciledAt}
                    title="Add-ons completed"
                  />
                ) : null}
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
