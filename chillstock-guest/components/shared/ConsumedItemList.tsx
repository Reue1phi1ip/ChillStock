import { Icon, type IconName } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";
import type { LoggedInventoryItem } from "@/components/providers/AppProvider";

type ConsumedItemListProps = {
  items: LoggedInventoryItem[];
  emptyMessage?: string;
  maxHeightClass?: string;
};

const iconByType: Record<string, IconName> = {
  beer: "beer",
  wine: "wine",
  mixer: "droplet",
  spirits: "glass",
  snack: "shopping-bag",
};

const toneByType: Record<string, string> = {
  beer: "bg-amber-50 text-amber-600",
  wine: "bg-rose-50 text-rose-600",
  mixer: "bg-sky-50 text-sky-600",
  spirits: "bg-teal-50 text-teal-600",
  snack: "bg-yellow-50 text-yellow-600",
};

export function ConsumedItemList({
  items,
  emptyMessage = "No consumed items have been logged by a restocker yet.",
  maxHeightClass = "max-h-[21rem]",
}: ConsumedItemListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-white/60 bg-white/48 p-4 text-center text-sm text-slate-600 shadow-[0_20px_46px_rgba(108,123,153,0.14)] backdrop-blur-[18px]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-y-auto pr-1", maxHeightClass)}>
      <div className="space-y-2">
        {items.map((item) => {
          const key = item.type.toLowerCase();
          const icon = iconByType[key] ?? "shopping-bag";
          const tone = toneByType[key] ?? "bg-slate-50 text-slate-500";

          return (
            <article
              className="flex items-center gap-3 rounded-[1.35rem] border border-white/60 bg-white/48 px-3 py-2.5 shadow-[0_16px_32px_rgba(108,123,153,0.12)] backdrop-blur-[18px]"
              key={item.id}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon name={icon} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{item.name}</p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {item.type}
              </span>
              <div className="flex shrink-0 items-center rounded-full border border-white/70 bg-white/78 px-2.5 py-1 text-xs font-semibold text-slate-700">
                x{item.quantity}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
