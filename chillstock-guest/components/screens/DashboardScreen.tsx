"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { Modal } from "@/components/shared/Modal";
import { BalanceCard } from "@/components/shared/BalanceCard";
import { MenuPreviewStrip } from "@/components/shared/MenuPreviewStrip";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";

function formatTimeAgo(timestamp: number) {
  const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  return `${hours}h ago`;
}

export function DashboardScreen() {
  const router = useRouter();
  const {
    deposit,
    availableBalance,
    requiredTopUp,
    totalBill,
    restockLogs,
    notifications,
    mainMenuInventory,
    addOnInventory,
    topUpDeposit,
    isLoading,
  } = useAppContext();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const unreadNotifications = notifications.filter((notification) => !notification.read);
  const lastRestock = restockLogs.at(-1);
  const mainMenuPreviewItems = useMemo(
    () =>
      mainMenuInventory.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        imageColor: item.imageColor,
      })),
    [mainMenuInventory],
  );
  const addOnPreviewItems = useMemo(
    () =>
      addOnInventory.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        imageColor: item.imageColor,
      })),
    [addOnInventory],
  );
  const hasMainMenuPreview = mainMenuPreviewItems.length > 0;
  const hasAddOnPreview = addOnPreviewItems.length > 0;
  const hasAnyPreview = hasMainMenuPreview || hasAddOnPreview;

  return (
    <AppShell>
      <div className="space-y-4 sm:space-y-6">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className={guestTypography.pageTitle}>Your Tab</h1>
              <p className={guestTypography.bodyMuted}>Live fridge activity</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                aria-label="Support"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/65 bg-white/62 text-slate-700 shadow-[0_14px_30px_rgba(108,123,153,0.14)] backdrop-blur-[18px] transition hover:bg-white/82 hover:text-slate-950"
                href="/support"
              >
                <Icon name="headset" size={17} />
              </Link>
              <Link
                aria-label="Notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/65 bg-white/62 text-slate-700 shadow-[0_14px_30px_rgba(108,123,153,0.14)] backdrop-blur-[18px] transition hover:bg-white/82 hover:text-slate-950"
                href="/notifications"
              >
                <Icon name="bell" size={17} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadNotifications.length}
                  </span>
                )}
              </Link>
              <button
                aria-label="Log out"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/65 bg-white/62 text-slate-700 shadow-[0_14px_30px_rgba(108,123,153,0.14)] backdrop-blur-[18px] transition hover:bg-white/82 hover:text-slate-950"
                onClick={() => setShowLogoutModal(true)}
                type="button"
              >
                <Icon name="log-out" size={17} />
              </button>
            </div>
          </div>

          <Link
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.85rem] bg-[linear-gradient(135deg,#0f847f_0%,#16988f_56%,#19a89f_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(16,150,138,0.28)] transition hover:brightness-[1.03] active:scale-[0.98]"
            href="/checkout"
          >
            <span>Checkout</span>
            <Icon name="arrow-right" size={16} />
          </Link>
        </section>

        <BalanceCard
          availableBalance={availableBalance}
          deposit={deposit}
          onTopUp={topUpDeposit}
          requiredTopUp={requiredTopUp}
          totalBill={totalBill}
        />

        {hasAnyPreview ? (
          <div className="mt-3 space-y-2 px-0.5 py-0.5">
            {hasMainMenuPreview ? (
              <MenuPreviewStrip href="/items" items={mainMenuPreviewItems} title="Main Menu Preview" />
            ) : null}
            {hasAddOnPreview ? (
              <MenuPreviewStrip
                href="/items?menu=addons"
                items={addOnPreviewItems}
                title="Add-Ons Preview"
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-[1rem] border border-dashed border-white/35 bg-transparent px-2 py-1.5 text-xs text-slate-500">
            Menu previews will show up once inventory is available.
          </div>
        )}

        {isLoading && (
          <div className="rounded-[1.8rem] border border-white/60 bg-white/48 p-4 text-sm text-slate-600 shadow-[0_20px_46px_rgba(108,123,153,0.14)] backdrop-blur-[18px]">
            Loading your ChillStock tab...
          </div>
        )}

        {lastRestock && (
          <div className="flex items-center gap-3 rounded-[1.6rem] border border-white/60 bg-white/44 px-4 py-3 shadow-[0_18px_38px_rgba(108,123,153,0.13)] backdrop-blur-[18px]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/70 bg-white/76 text-slate-500 shadow-[0_10px_24px_rgba(108,123,153,0.12)]">
              <Icon name="clock" size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={guestTypography.captionStrong}>
                Last restocked: {formatTimeAgo(lastRestock.timestamp)}
              </p>
              <p className={guestTypography.caption}>
                by {lastRestock.restockerName} · {lastRestock.addedItems.length} items added back
              </p>
            </div>
          </div>
        )}
      </div>

      {showLogoutModal && (
        <Modal onClose={() => setShowLogoutModal(false)}>
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Icon name="log-out" size={24} />
            </div>
            <div className="space-y-2">
              <h2 className={guestTypography.cardTitle}>Log out after checkout</h2>
              <p className={guestTypography.bodyMuted}>
                This device is still linked to an active guest stay. Finish checkout first, then
                use the log out button on the final summary screen to return to the scan page.
              </p>
            </div>
            <div className="space-y-2.5">
              <Button
                className="w-full"
                onClick={() => {
                  setShowLogoutModal(false);
                  router.push("/checkout");
                }}
              >
                <Icon name="receipt" size={18} />
                <span>Go to Checkout</span>
              </Button>
              <Button className="w-full" onClick={() => setShowLogoutModal(false)} variant="secondary">
                Keep Current Stay
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
