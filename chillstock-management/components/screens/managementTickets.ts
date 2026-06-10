export type TicketType = "refill" | "support" | "special_order" | "income_td";
export type TicketStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "closed";
export type TicketPriority = "normal" | "high" | "urgent";
export type TicketDashboardTab = "all" | TicketType | "closed";

export const ticketTypeTabs: Array<{ label: string; value: TicketType }> = [
  { label: "Refill", value: "refill" },
  { label: "Support", value: "support" },
  { label: "Special Orders", value: "special_order" },
  { label: "Income TD", value: "income_td" },
];

export const dashboardTabs: Array<{ label: string; value: TicketDashboardTab }> = [
  { label: "All", value: "all" },
  ...ticketTypeTabs,
  { label: "Closed", value: "closed" },
];

export const pageSizeOptions = [10, 25, 50, 100];

export const statusOptions: TicketStatus[] = [
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "blocked",
  "resolved",
  "closed",
];

export const priorityOptions: TicketPriority[] = ["normal", "high", "urgent"];

export const openTicketStatuses = new Set<TicketStatus>([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "blocked",
]);

export const closedTicketStatuses = new Set<TicketStatus>(["resolved", "closed"]);

export function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function formatAgo(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export function toneForStatus(status: TicketStatus) {
  if (status === "blocked") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "resolved" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "in_progress") return "border-teal-200 bg-teal-50 text-teal-700";
  if (status === "assigned") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border-[rgba(23,29,25,0.08)] bg-[rgba(243,247,244,0.96)] text-slate-700";
}

export function toneForPriority(priority: TicketPriority) {
  if (priority === "urgent") return "border-rose-200 bg-rose-50 text-rose-700";
  if (priority === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-[rgba(23,29,25,0.08)] bg-[rgba(243,247,244,0.96)] text-slate-700";
}
