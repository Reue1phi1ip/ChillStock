"use client";

import { Icon } from "@/components/icons/Icon";
import type { AppNotification } from "@/components/providers/AppProvider";
import { NotificationRichText } from "@/components/shared/NotificationRichText";
import { guestTypography } from "@/components/shared/guestTypography";
import { cn } from "@/lib/utils";

type NotificationBannerProps = {
  notification: AppNotification;
  onDismiss: () => void;
};

export function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const isRestock =
    notification.type === "restock_complete" || notification.type === "checkout_reconciled";
  const isWarm =
    notification.type === "restock_requested" ||
    notification.type === "restock_enroute" ||
    notification.type === "checkout_pending";
  const isUrgent = notification.type === "top_up_required" || notification.type === "over_deposit";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[2rem] border p-4 shadow-[0_20px_48px_rgba(108,123,153,0.14)] backdrop-blur-[18px]",
        isRestock && "border-white/65 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(225,252,243,0.5))]",
        isWarm && "border-white/65 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(255,240,216,0.48))]",
        isUrgent && "border-white/65 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(254,226,226,0.52))]",
        !isRestock &&
          !isWarm &&
          !isUrgent &&
          "border-white/65 bg-[linear-gradient(135deg,rgba(255,255,255,0.62),rgba(242,246,252,0.48))]",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/72 shadow-[0_10px_24px_rgba(108,123,153,0.12)]",
          isRestock && "text-teal-600",
          isWarm && "text-amber-600",
          isUrgent && "text-red-600",
          !isRestock && !isWarm && !isUrgent && "text-slate-500",
        )}
      >
        <Icon name={isUrgent ? "alert" : isRestock ? "refresh" : isWarm ? "truck" : "bell"} size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
        <NotificationRichText
          className={cn(guestTypography.caption, "mt-0.5 text-slate-600")}
          html={notification.messageHtml}
          text={notification.message}
        />
      </div>
      <button
        aria-label="Dismiss notification"
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
        onClick={onDismiss}
        type="button"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
