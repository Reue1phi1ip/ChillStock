"use client";

import { Icon } from "@/components/icons/Icon";
import { guestTypography } from "@/components/shared/guestTypography";
import { formatCurrency } from "@/lib/utils";

type BalanceCardProps = {
  deposit: number;
  availableBalance: number;
  requiredTopUp: number;
  totalBill?: number;
  onTopUp: () => void | Promise<void>;
};

export function BalanceCard({
  deposit,
  availableBalance,
  requiredTopUp,
  totalBill = 0,
  onTopUp,
}: BalanceCardProps) {
  const percentageUsed = deposit > 0 ? Math.min((totalBill / deposit) * 100, 100) : 0;
  const isOverLimit = requiredTopUp > 0;
  const isNearLimit = availableBalance > 0 && availableBalance <= 10 && !isOverLimit;

  return (
    <section
      className={
        "relative overflow-hidden rounded-[2.4rem] p-5 text-white shadow-[0_26px_58px_rgba(86,98,128,0.2)] sm:rounded-[2.75rem] sm:p-7 " +
        (isOverLimit
          ? "bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)]"
          : isNearLimit
            ? "bg-[linear-gradient(135deg,#f35b1f_0%,#ef7a31_52%,#f3a03f_100%)]"
            : "bg-[linear-gradient(135deg,#0f172a_0%,#0f3d4a_48%,#13857f_100%)]")
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_36%)]" />
      <div className="absolute right-0 top-0 opacity-[0.05]">
        <Icon name="gauge" size={128} />
      </div>
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              Deposit
            </span>
            <div className="mt-2 font-display text-5xl font-bold tracking-tight sm:text-6xl">
              {formatCurrency(deposit)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
              {isOverLimit ? "Over by" : "Remaining"}
            </span>
            <div className="mt-2 font-display text-2xl font-bold text-white/95 sm:text-3xl">
              {formatCurrency(isOverLimit ? requiredTopUp : availableBalance)}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 sm:mt-8">
          <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold text-white/85 sm:gap-4">
            <span>{percentageUsed.toFixed(0)}% of deposit used</span>
            <span>{isOverLimit ? "Top-up required" : isNearLimit ? "Low balance" : "Good standing"}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/18">
            <div
              className={
                "h-full rounded-full transition-[width] duration-700 " +
                (isOverLimit ? "bg-red-200" : isNearLimit ? "bg-white" : "bg-teal-400")
              }
              style={{ width: `${percentageUsed}%` }}
            />
          </div>
        </div>

        {(isNearLimit || isOverLimit) && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[1.5rem] bg-black/18 px-4 py-3.5 text-sm font-semibold backdrop-blur-sm sm:mt-6 sm:rounded-[1.75rem] sm:px-5 sm:py-4">
            <Icon name="alert" size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {isOverLimit ? "Over deposit limit" : "Nearing your limit"}
            </span>
            <button
              className={guestTypography.captionStrong + " rounded-full bg-white px-4 py-2 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.15)] transition hover:bg-white/95"}
              onClick={() => void onTopUp()}
              type="button"
            >
              {isOverLimit ? `Pay ${formatCurrency(requiredTopUp)}` : "Top up"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
