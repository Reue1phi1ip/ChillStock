import { cn } from "@/lib/utils";

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-[rgba(23,29,25,0.1)]", className)} />;
}
