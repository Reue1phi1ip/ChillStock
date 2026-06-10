"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableShell, TBody, TD, TH, THead } from "@/components/ui/table";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toQueryString, type FlatSearchParams } from "@/lib/searchParams";
import {
  closedTicketStatuses,
  dashboardTabs,
  formatAgo,
  formatTimestamp,
  labelize,
  openTicketStatuses,
  pageSizeOptions,
  priorityOptions,
  ticketTypeTabs,
  toneForPriority,
  toneForStatus,
  type TicketDashboardTab,
  type TicketPriority,
  type TicketType,
} from "./managementTickets";

const allowedTabs = new Set<TicketDashboardTab>(dashboardTabs.map((tab) => tab.value));

function parseDashboardTab(value: string | null): TicketDashboardTab {
  if (value && allowedTabs.has(value as TicketDashboardTab)) {
    return value as TicketDashboardTab;
  }
  return "all";
}

function parsePageSize(value: string | null) {
  const parsed = Number(value);
  return pageSizeOptions.includes(parsed) ? parsed : 25;
}

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function KpiCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: "warm" | "danger";
}) {
  const tone =
    emphasis === "danger"
      ? "bg-[linear-gradient(135deg,rgba(254,226,226,0.92),rgba(255,245,245,0.98))]"
      : emphasis === "warm"
        ? "bg-[linear-gradient(135deg,rgba(255,247,214,0.92),rgba(255,251,237,0.98))]"
        : "bg-[linear-gradient(135deg,rgba(237,247,242,0.92),rgba(248,252,249,0.98))]";

  return (
    <Card className={tone}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </Card>
  );
}

export function ManagementDashboardScreen({
  searchParams,
}: {
  searchParams: FlatSearchParams;
}) {
  const dashboard = useQuery(api.tickets.listManagementDashboard);
  const createManagementTicket = useMutation(api.tickets.createManagementTicket);
  const router = useRouter();
  const activeTab = parseDashboardTab(searchParams.tab ?? null);
  const search = searchParams.q ?? "";
  const pageSize = parsePageSize(searchParams.pageSize ?? null);
  const currentPage = parsePage(searchParams.page ?? null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    type: "support" as TicketType,
    title: "",
    description: "",
    priority: "normal" as TicketPriority,
    hotelName: "",
    customerLabel: "",
  });
  const [busyState, setBusyState] = useState<"create" | null>(null);

  const updateListParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(toQueryString(searchParams));

      for (const [key, value] of Object.entries(updates)) {
        const normalizedValue =
          value === null
            ? null
            : typeof value === "string"
              ? value.trim()
              : String(value);

        if (
          normalizedValue === null ||
          normalizedValue === "" ||
          (key === "tab" && normalizedValue === "all") ||
          (key === "page" && normalizedValue === "1") ||
          (key === "pageSize" && normalizedValue === "25")
        ) {
          params.delete(key);
        } else {
          params.set(key, normalizedValue);
        }
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/?${nextQuery}` : "/");
    },
    [router, searchParams],
  );

  const normalizedSearch = search.trim().toLowerCase();
  const tickets = useMemo(() => {
    return (dashboard?.tickets ?? []).filter((ticket) => {
      const haystack = [
        ticket.title,
        ticket.hotelName,
        ticket.customerLabel,
        ticket.assignedRestockerName,
        ticket.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;
      if (activeTab === "all") return openTicketStatuses.has(ticket.status);
      if (activeTab === "closed") return closedTicketStatuses.has(ticket.status);
      return ticket.type === activeTab && openTicketStatuses.has(ticket.status);
    });
  }, [activeTab, dashboard?.tickets, normalizedSearch]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTickets = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return tickets.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, tickets]);
  const rangeStart = tickets.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(tickets.length, safeCurrentPage * pageSize);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      updateListParams({ page: safeCurrentPage });
    }
  }, [currentPage, safeCurrentPage, updateListParams]);

  const handleCreate = async () => {
    setBusyState("create");
    try {
      await createManagementTicket({
        type: createDraft.type,
        title: createDraft.title,
        description: createDraft.description || undefined,
        priority: createDraft.priority,
        hotelName: createDraft.hotelName || undefined,
        customerLabel: createDraft.customerLabel || undefined,
      });
      setCreateDraft({
        type: "support",
        title: "",
        description: "",
        priority: "normal",
        hotelName: "",
        customerLabel: "",
      });
      setIsCreateOpen(false);
    } finally {
      setBusyState(null);
    }
  };

  return (
    <AppShell hideHeader>
      <div className="pt-6 space-y-6">
        <section className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">
              Management Ticket Desk
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Input
              className="w-[340px]"
              onChange={(event) => updateListParams({ q: event.target.value, page: 1 })}
              placeholder="Search hotel, QR, assignee, or title"
              value={search}
            />
            <Button
              className="min-w-[148px] whitespace-nowrap"
              onClick={() => setIsCreateOpen(true)}
              size="md"
            >
              New ticket
            </Button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Open queue" value={dashboard?.kpis.open ?? 0} />
          <KpiCard label="Urgent" value={dashboard?.kpis.urgent ?? 0} emphasis="danger" />
          <KpiCard label="Blocked" value={dashboard?.kpis.blocked ?? 0} emphasis="warm" />
          <KpiCard
            label="Overflow unassigned"
            value={dashboard?.kpis.overflow ?? 0}
            emphasis="warm"
          />
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs>
              {dashboardTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  onClick={() => updateListParams({ tab: tab.value, page: 1 })}
                  selected={activeTab === tab.value}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </Tabs>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500">
                Showing {rangeStart}-{rangeEnd} of {tickets.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Rows</span>
                <Select
                  className="w-[96px]"
                  onChange={(event) =>
                    updateListParams({ pageSize: Number(event.target.value), page: 1 })
                  }
                  value={String(pageSize)}
                >
                  {pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => updateListParams({ page: Math.max(1, safeCurrentPage - 1) })}
                  size="sm"
                  variant="secondary"
                >
                  Previous
                </Button>
                <Button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => updateListParams({ page: Math.min(totalPages, safeCurrentPage + 1) })}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <TableShell>
            <Table>
              <THead>
                <tr>
                  <TH>Ticket</TH>
                  <TH>Hotel</TH>
                  <TH>Status</TH>
                  <TH>Priority</TH>
                  <TH>Assignee</TH>
                  <TH>Age</TH>
                  <TH>Updated</TH>
                </tr>
              </THead>
              <TBody>
                {paginatedTickets.map((ticket) => (
                  <tr
                    className="cursor-pointer transition hover:bg-[rgba(238,247,242,0.88)]"
                    key={ticket._id}
                    onClick={() => {
                      const nextQuery = toQueryString(searchParams);
                      router.push(
                        nextQuery
                          ? `/tickets/${ticket._id}?${nextQuery}`
                          : `/tickets/${ticket._id}`,
                      );
                    }}
                  >
                    <TD>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-950">{ticket.title}</p>
                        <p className="text-xs text-slate-500">
                          {ticket.customerLabel ?? "No guest label"} · {labelize(ticket.type)}
                        </p>
                      </div>
                    </TD>
                    <TD>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{ticket.hotelName ?? "No hotel"}</p>
                        <p className="text-xs text-slate-500">{ticket.area ?? "Unmapped area"}</p>
                      </div>
                    </TD>
                    <TD>
                      <Badge className={toneForStatus(ticket.status)}>{labelize(ticket.status)}</Badge>
                    </TD>
                    <TD>
                      <Badge className={toneForPriority(ticket.priority)}>{ticket.priority}</Badge>
                    </TD>
                    <TD>
                      <span className="text-sm text-slate-700">
                        {ticket.assignedRestockerName ?? "Unassigned"}
                      </span>
                    </TD>
                    <TD>{formatAgo(ticket.createdAt)}</TD>
                    <TD>{formatTimestamp(ticket.updatedAt)}</TD>
                  </tr>
                ))}
                {paginatedTickets.length === 0 && (
                  <tr>
                    <TD className="py-8 text-center text-sm text-slate-500" colSpan={7}>
                      No tickets match this view yet.
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </TableShell>
        </section>
      </div>

      <Dialog onClose={() => setIsCreateOpen(false)} open={isCreateOpen}>
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Create ticket
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
              New management ticket
            </h2>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Type
              </label>
              <Select
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    type: event.target.value as TicketType,
                  }))
                }
                value={createDraft.type}
              >
                {ticketTypeTabs.map((tab) => (
                  <option key={tab.value} value={tab.value}>
                    {tab.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Priority
              </label>
              <Select
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    priority: event.target.value as TicketPriority,
                  }))
                }
                value={createDraft.priority}
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Title
            </label>
            <Input
              onChange={(event) =>
                setCreateDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="VIP welcome amenity follow-up"
              value={createDraft.title}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Hotel
              </label>
              <Input
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, hotelName: event.target.value }))
                }
                placeholder="The Dunes Hotel"
                value={createDraft.hotelName}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Customer label
              </label>
              <Input
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    customerLabel: event.target.value,
                  }))
                }
                placeholder="QR 4821"
                value={createDraft.customerLabel}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Description
            </label>
            <Textarea
              onChange={(event) =>
                setCreateDraft((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Capture the operational context, guest ask, or payment issue."
              value={createDraft.description}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button onClick={() => setIsCreateOpen(false)} size="md" variant="secondary">
              Cancel
            </Button>
            <Button disabled={busyState === "create"} onClick={handleCreate} size="md">
              {busyState === "create" ? "Creating..." : "Create ticket"}
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
