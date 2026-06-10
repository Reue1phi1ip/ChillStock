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
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "closed") return "bg-slate-100 text-slate-600 border-slate-200";
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
  };
  fridge: { name: string; code?: string } | null;
}) {
  return (
    <Link href={`/request/${request._id}`}>
      <article className="animate-rise-in flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{fridge?.name ?? "Unknown fridge"}</p>
          <p className="text-xs text-slate-500">
            {fridge?.code ? `${fridge.code} · ` : ""}
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

export function ClosedRequestsScreen() {
  const data = useQuery(api.sessions.listRestockerRequests);
  const recentResolved = data?.recentResolved ?? [];

  return (
    <AppShell eyebrow="Queue">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Recently Closed
          </h1>
          <Link
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
            href="/"
          >
            Back
          </Link>
        </div>

        {data === undefined ? (
          <Card className="rounded-xl border-dashed px-3 py-4">
            <p className="text-sm text-slate-500">Loading closed requests...</p>
          </Card>
        ) : recentResolved.length === 0 ? (
          <Card className="rounded-xl border-dashed px-3 py-4">
            <p className="text-sm font-semibold text-slate-900">No recently closed requests</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recentResolved.map((entry) => (
              <CompactRequestCard key={entry.request._id} fridge={entry.fridge} request={entry.request} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
