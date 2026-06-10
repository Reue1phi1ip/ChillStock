import { Icon, type IconName } from "@/components/icons/Icon";
import { guestTypography } from "@/components/shared/guestTypography";
import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
  icon: IconName;
  title: string;
  description: string;
  tone?: "teal" | "emerald" | "slate" | "amber";
  className?: string;
};

const toneClasses = {
  teal: "text-teal-700",
  emerald: "text-emerald-600",
  slate: "text-slate-700",
  amber: "text-amber-600",
};

export function ScreenHeader({
  icon,
  title,
  description,
  tone = "teal",
  className,
}: ScreenHeaderProps) {
  return (
    <div className={cn("mx-auto max-w-xl space-y-2.5 text-center", className)}>
      <div
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-white/70 bg-white/58 shadow-[0_24px_56px_rgba(108,123,153,0.15)] backdrop-blur-[20px] sm:h-20 sm:w-20 sm:rounded-[2rem]",
          toneClasses[tone],
        )}
      >
        <Icon name={icon} size={26} />
      </div>
      <div className="space-y-1.5">
        <h1 className={guestTypography.pageTitle}>{title}</h1>
        <p className={cn(guestTypography.body, "mx-auto max-w-lg")}>{description}</p>
      </div>
    </div>
  );
}
