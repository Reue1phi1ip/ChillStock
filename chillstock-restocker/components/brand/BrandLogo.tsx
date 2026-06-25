import { Icon } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "full" | "wordmark" | "icon";
  className?: string;
};

const sizeMap = {
  sm: { icon: 14, box: "h-8 w-8 rounded-full", text: "text-base", gap: "gap-2.5" },
  md: { icon: 16, box: "h-10 w-10 rounded-full", text: "text-xl", gap: "gap-2.5" },
  lg: { icon: 24, box: "h-14 w-14 rounded-full", text: "text-2xl", gap: "gap-3" },
};

export function BrandLogo({
  size = "md",
  variant = "full",
  className,
}: BrandLogoProps) {
  const sizing = sizeMap[size];

  if (variant === "icon") {
    return <Icon name="snowflake" size={sizing.icon} className={cn("text-teal-700", className)} />;
  }

  return (
    <div className={cn("flex items-center", sizing.gap, className)}>
      {variant === "full" && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center bg-teal-700 text-white shadow-[0_10px_24px_rgba(15,118,110,0.24)]",
            sizing.box,
          )}
        >
          <Icon name="snowflake" size={sizing.icon} strokeWidth={2.4} />
        </span>
      )}
      <span className={cn("font-display font-semibold tracking-tight text-slate-950", sizing.text)}>
        Chilled<span className="text-teal-700">Stock</span>
      </span>
    </div>
  );
}
