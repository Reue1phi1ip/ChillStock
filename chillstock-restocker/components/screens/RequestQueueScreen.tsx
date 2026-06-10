"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";

function formatTimestamp(timestamp: number) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function statusTone(status: string) {
  if (status === "requested") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "enroute") return "bg-teal-50 text-teal-700 border-teal-200";
  if (status === "top_up_required") return "bg-orange-50 text-orange-700 border-orange-200";
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function CompactRequestCard({
  request,
  fridge,
}: {
  request: {
    _id: string;
    status: string;
    requestedAt: number;
    type: string;
  };
  fridge: { name: string; code?: string } | null;
}) {
  const requestLabel =
    request.type === "add_on" ? "Add-On" : request.type === "checkout" ? "Checkout" : "Restock";

  return (
    <Link href={`/request/${request._id}`}>
      <article className="animate-rise-in flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{fridge?.name ?? "Unknown fridge"}</p>
          <p className="text-xs text-slate-500">
            {requestLabel} · {fridge?.code ? `${fridge.code} · ` : ""}
            {formatTimestamp(request.requestedAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusTone(request.status)}`}
        >
          {request.status.replaceAll("_", " ")}
        </span>
      </article>
    </Link>
  );
}

export function RequestQueueScreen() {
  const data = useQuery(api.sessions.listRestockerRequests);
  const liveRequests = data?.liveRequests ?? [];
  const restockCount = liveRequests.filter((entry) => entry.request.type === "restock").length;
  const addOnCount = liveRequests.filter((entry) => entry.request.type === "add_on").length;
  const checkoutCount = liveRequests.filter((entry) => entry.request.type === "checkout").length;
  const awaitingTopUp = liveRequests.filter(
    (entry) => entry.request.status === "top_up_required",
  ).length;

  return (
    <AppShell eyebrow="Queue">
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Reconcile & Restock
          </h1>
          <Card className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 sm:w-[280px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recently closed</p>
              <p className="text-sm font-semibold text-slate-900">Resolved requests</p>
            </div>
            <Link
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
              href="/requests/closed"
            >
              View
            </Link>
          </Card>
        </section>

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <Card className="rounded-xl border-emerald-200 bg-emerald-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Live</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-emerald-900">
              {data ? liveRequests.length : "—"}
            </p>
          </Card>
          <Card className="rounded-xl px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Restocks</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950">{restockCount}</p>
          </Card>
          <Card className="rounded-xl px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Add-Ons</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950">{addOnCount}</p>
          </Card>
          <Card className="rounded-xl px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Checkouts</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950">{checkoutCount}</p>
          </Card>
          <Card className="rounded-xl px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Awaiting</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950">{awaitingTopUp}</p>
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-950">Live requests</h2>
          {data === undefined ? (
            <Card className="rounded-xl border-dashed px-3 py-4">
              <p className="text-sm text-slate-500">Loading live requests...</p>
            </Card>
          ) : liveRequests.length === 0 ? (
            <Card className="rounded-xl border-dashed px-3 py-4">
              <p className="text-sm font-semibold text-slate-900">No live requests</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {liveRequests.map((entry) => (
                <CompactRequestCard key={entry.request._id} fridge={entry.fridge} request={entry.request} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
