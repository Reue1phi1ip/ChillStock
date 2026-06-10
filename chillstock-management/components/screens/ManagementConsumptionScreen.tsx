"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Table, TableShell, TBody, TD, TH, THead } from "@/components/ui/table";

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function toneForConsumerStatus(status: string) {
  return status === "consuming"
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : "border-amber-200 bg-amber-50 text-amber-800";
}

export function ManagementConsumptionScreen() {
  const consumers = useQuery(api.tickets.listManagementConsumers);
  const router = useRouter();

  return (
    <AppShell eyebrow="Live consumer sessions and identity context">
      <div className="space-y-6">
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Consumption monitor
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-slate-950">
            Active Consumer Table
          </h1>
          <p className="max-w-4xl text-sm leading-relaxed text-slate-600">
            Monitor every active guest session in one place, then open a dedicated detail page for
            identity, wallet, and session context.
          </p>
        </section>

        <TableShell>
          <Table>
            <THead>
              <tr>
                <TH>Guest QR</TH>
                <TH>Guest</TH>
                <TH>Status</TH>
                <TH>Session</TH>
                <TH>Hotel</TH>
                <TH>Location</TH>
                <TH>Deposit hold</TH>
                <TH>Started</TH>
              </tr>
            </THead>
            <TBody>
              {(consumers ?? []).map((consumer) => (
                <tr
                  className="cursor-pointer transition hover:bg-[rgba(238,247,242,0.88)]"
                  key={consumer.sessionId}
                  onClick={() => router.push(`/consumption/${consumer.sessionId}`)}
                >
                  <TD>
                    <span className="font-semibold text-slate-950">{consumer.guestQr}</span>
                  </TD>
                  <TD>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">
                        {consumer.displayName ?? "Unnamed guest"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {consumer.email ?? consumer.userId}
                      </p>
                    </div>
                  </TD>
                  <TD>
                    <Badge className={toneForConsumerStatus(consumer.status)}>
                      {consumer.status}
                    </Badge>
                  </TD>
                  <TD>{labelize(consumer.sessionStatus)}</TD>
                  <TD>
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900">{consumer.hotelName}</p>
                      <p className="text-xs text-slate-500">{consumer.area}</p>
                    </div>
                  </TD>
                  <TD>{consumer.location}</TD>
                  <TD>{consumer.hasDepositHold ? "Yes" : "No"}</TD>
                  <TD>{formatTimestamp(consumer.createdAt)}</TD>
                </tr>
              ))}
              {(consumers ?? []).length === 0 && (
                <tr>
                  <TD className="py-8 text-center text-sm text-slate-500" colSpan={8}>
                    No active guest sessions found right now.
                  </TD>
                </tr>
              )}
            </TBody>
          </Table>
        </TableShell>
      </div>
    </AppShell>
  );
}
