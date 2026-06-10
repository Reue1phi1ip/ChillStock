"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { PhotoEvidenceGallery } from "@/components/shared/PhotoEvidenceGallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import {
  formatTimestamp,
  labelize,
  priorityOptions,
  statusOptions,
  toneForPriority,
  toneForStatus,
  type TicketPriority,
  type TicketStatus,
} from "./managementTickets";

type WorkspaceTab = "comments" | "activity" | "customer";

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function ActivityTone(action: string) {
  if (action === "note") return "border-teal-200 bg-teal-50 text-teal-700";
  if (action === "customer_message") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (action === "closed" || action === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (action === "saved") return "border-[rgba(23,29,25,0.08)] bg-[rgba(243,247,244,0.96)] text-slate-700";
  return "border-[rgba(23,29,25,0.08)] bg-[rgba(243,247,244,0.96)] text-slate-700";
}

function MetaLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function FeedRow({
  action,
  actorName,
  createdAt,
  message,
}: {
  action: string;
  actorName: string;
  createdAt: number;
  message: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[rgba(23,29,25,0.08)] bg-white/90 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-950">{actorName}</p>
            <Badge className={ActivityTone(action)}>{labelize(action)}</Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{message}</p>
        </div>
        <p className="shrink-0 text-xs text-slate-500">{formatTimestamp(createdAt)}</p>
      </div>
    </div>
  );
}

export function ManagementTicketDetailScreen({
  returnHref = "/",
  ticketId,
}: {
  returnHref?: string;
  ticketId: Id<"tickets">;
}) {
  const router = useRouter();
  const detail = useQuery(api.tickets.getManagementTicket, { ticketId });
  const saveTicket = useMutation(api.tickets.saveManagementTicket);
  const addTicketNote = useMutation(api.tickets.addManagementTicketNote);
  const sendCustomerMessage = useMutation(api.tickets.sendManagementTicketMessage);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("comments");
  const [busyState, setBusyState] = useState<"save" | "note" | "message" | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    status: "new" as TicketStatus,
    priority: "normal" as TicketPriority,
    assignedRestockerId: "" as Id<"restockers"> | "",
  });
  const [noteDraft, setNoteDraft] = useState("");
  const [messageDraft, setMessageDraft] = useState({
    title: "",
    body: "",
  });
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!detail?.ticket) return;
    setDraft({
      title: detail.ticket.title,
      description: detail.ticket.description ?? "",
      status: detail.ticket.status,
      priority: detail.ticket.priority,
      assignedRestockerId: detail.ticket.assignedRestockerId ?? "",
    });
    setNoteDraft("");
    setMessageDraft({
      title: "",
      body: "",
    });
    setFeedback(null);
    setWorkspaceTab("comments");
  }, [detail?.ticket]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(returnHref);
  };

  const handleSave = async (statusOverride?: TicketStatus) => {
    if (!detail?.ticket) return;

    setBusyState("save");
    setFeedback(null);

    try {
      const nextStatus = statusOverride ?? draft.status;
      await saveTicket({
        ticketId: detail.ticket._id,
        title: (draft.title.trim() || detail.ticket.title).trim(),
        description:
          detail.ticket.source === "management"
            ? draft.description || undefined
            : detail.ticket.description ?? undefined,
        status: nextStatus,
        priority: draft.priority,
        assignedRestockerId: draft.assignedRestockerId || undefined,
      });
      setDraft((current) => ({ ...current, status: nextStatus }));
      setFeedback({ kind: "success", text: "Ticket changes saved." });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: "error", text: "Ticket changes could not be saved right now." });
    } finally {
      setBusyState(null);
    }
  };

  const handleAddNote = async () => {
    if (!detail?.ticket) return;

    setBusyState("note");
    setFeedback(null);

    try {
      await addTicketNote({
        ticketId: detail.ticket._id,
        note: noteDraft,
      });
      setNoteDraft("");
      setFeedback({ kind: "success", text: "Internal comment added." });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: "error", text: "Internal comment could not be added." });
    } finally {
      setBusyState(null);
    }
  };

  const handleSendCustomerMessage = async () => {
    if (!detail?.ticket) return;

    setBusyState("message");
    setFeedback(null);

    try {
      await sendCustomerMessage({
        ticketId: detail.ticket._id,
        title: messageDraft.title,
        message: messageDraft.body,
      });
      setMessageDraft({
        title: "",
        body: "",
      });
      setFeedback({ kind: "success", text: "Guest message sent." });
    } catch (error) {
      console.error(error);
      setFeedback({ kind: "error", text: "Guest message could not be sent." });
    } finally {
      setBusyState(null);
    }
  };

  const commentEvents = useMemo(
    () => detail?.events.filter((event) => event.action === "note") ?? [],
    [detail?.events],
  );
  const activityEvents = useMemo(
    () => detail?.events.filter((event) => event.action !== "note") ?? [],
    [detail?.events],
  );

  if (detail === undefined) {
    return (
      <AppShell eyebrow="Ticket triage, prioritization, and operator workflow">
        <Card>
          <p className="text-sm text-slate-500">Loading ticket detail...</p>
        </Card>
      </AppShell>
    );
  }

  if (detail === null) {
    return (
      <AppShell eyebrow="Ticket triage, prioritization, and operator workflow">
        <Card className="space-y-3">
          <p className="font-semibold text-slate-950">This ticket could not be found.</p>
          <p className="text-sm text-slate-500">
            It may have been removed or the link is no longer valid.
          </p>
        </Card>
      </AppShell>
    );
  }

  const canEditCoreContent = detail.ticket.source === "management";
  const canMessageCustomer = Boolean(detail.ticket.userId && detail.ticket.sessionId);
  const activeTitle = draft.title.trim() || detail.ticket.title;
  const activeDescription = canEditCoreContent ? draft.description : detail.ticket.description ?? "";

  return (
    <AppShell eyebrow="Ticket triage, prioritization, and operator workflow">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="space-y-5">
            <button
              className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
              onClick={handleBack}
              type="button"
            >
              <Icon className="shrink-0" name="arrow-left" size={16} />
              Back to tickets
            </button>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={toneForStatus(draft.status)}>{labelize(draft.status)}</Badge>
                <Badge className={toneForPriority(draft.priority)}>{draft.priority}</Badge>
                <Badge>{labelize(detail.ticket.type)}</Badge>
              </div>

              {canEditCoreContent ? (
                <Input
                  className="border-none bg-transparent px-0 py-0 text-4xl font-semibold tracking-tight text-slate-950 shadow-none focus:ring-0"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  value={draft.title}
                />
              ) : (
                <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">
                  {activeTitle}
                </h1>
              )}

              {canEditCoreContent ? (
                <Textarea
                  className="min-h-[132px]"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  value={draft.description}
                />
              ) : (
                <div className="space-y-3">
                  {activeDescription ? (
                    <p className="text-sm leading-relaxed text-slate-600">{activeDescription}</p>
                  ) : (
                    <p className="text-sm text-slate-400">No description attached.</p>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Auto-created ticket. Title and description are locked.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </label>
                <Select
                  className="min-w-[170px]"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as TicketStatus,
                    }))
                  }
                  value={draft.status}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {labelize(status)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Priority
                </label>
                <Select
                  className="min-w-[150px]"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value as TicketPriority,
                    }))
                  }
                  value={draft.priority}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Assignee
                </label>
                <Select
                  className="min-w-[250px]"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      assignedRestockerId: event.target.value as Id<"restockers"> | "",
                    }))
                  }
                  value={draft.assignedRestockerId}
                >
                  <option value="">Unassigned</option>
                  {detail.assigneeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} · {option.activeCount}/{option.capacity} active
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <SectionEyebrow>Workspace</SectionEyebrow>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Comments, history, and guest communication
                </h2>
              </div>
              <Tabs>
                <TabsTrigger
                  onClick={() => setWorkspaceTab("comments")}
                  selected={workspaceTab === "comments"}
                >
                  Internal comments
                </TabsTrigger>
                <TabsTrigger
                  onClick={() => setWorkspaceTab("activity")}
                  selected={workspaceTab === "activity"}
                >
                  Activity logs
                </TabsTrigger>
                <TabsTrigger
                  onClick={() => setWorkspaceTab("customer")}
                  selected={workspaceTab === "customer"}
                >
                  Message customer
                </TabsTrigger>
              </Tabs>
            </div>

            {feedback ? (
              <p
                className={
                  feedback.kind === "error"
                    ? "text-sm font-semibold text-rose-600"
                    : "text-sm font-semibold text-emerald-700"
                }
              >
                {feedback.text}
              </p>
            ) : null}

            {workspaceTab === "comments" ? (
              <div className="space-y-4">
                <Textarea
                  className="min-h-[140px]"
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Add an internal handoff, escalation note, or operator update."
                  value={noteDraft}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={busyState === "note" || noteDraft.trim().length === 0}
                    onClick={() => void handleAddNote()}
                    size="sm"
                  >
                    {busyState === "note" ? "Adding..." : "Add comment"}
                  </Button>
                </div>
                <div className="space-y-3">
                  {commentEvents.length > 0 ? (
                    commentEvents.map((event) => (
                      <FeedRow
                        action={event.action}
                        actorName={event.actorName}
                        createdAt={event.createdAt}
                        key={event._id}
                        message={event.message}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No internal comments yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            {workspaceTab === "activity" ? (
              <div className="space-y-4">
                {(detail.consumedItems.length > 0 || detail.addedItems.length > 0) && (
                  <div className="space-y-3">
                    <SectionEyebrow>Reconciliation evidence</SectionEyebrow>
                    {detail.request?.photos?.length ? (
                      <PhotoEvidenceGallery
                        photos={detail.request.photos.map((photo) => ({
                          id: photo.storageId,
                          fileName: photo.fileName,
                          uploadedAt: photo.uploadedAt,
                          url: photo.url,
                        }))}
                        previewPhotoId={previewPhotoId}
                        setPreviewPhotoId={setPreviewPhotoId}
                      />
                    ) : null}
                    {detail.consumedItems.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">Consumed items</p>
                        {detail.consumedItems.map((item) => (
                          <div
                            className="rounded-[1.05rem] border border-[rgba(23,29,25,0.08)] bg-white/90 px-4 py-3"
                            key={item._id}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-slate-950">{item.name}</p>
                              <p className="text-sm text-slate-600">
                                {item.quantity} x {formatCurrency(item.unitPriceCents / 100)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {detail.addedItems.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-950">Added back</p>
                        {detail.addedItems.map((item) => (
                          <div
                            className="rounded-[1.05rem] border border-[rgba(23,29,25,0.08)] bg-white/90 px-4 py-3"
                            key={item._id}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-slate-950">{item.name}</p>
                              <p className="text-sm text-slate-600">
                                {item.quantity} x {formatCurrency(item.unitPriceCents / 100)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="space-y-3">
                  {activityEvents.length > 0 ? (
                    activityEvents.map((event) => (
                      <FeedRow
                        action={event.action}
                        actorName={event.actorName}
                        createdAt={event.createdAt}
                        key={event._id}
                        message={event.message}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No activity recorded yet.</p>
                  )}
                </div>
              </div>
            ) : null}

            {workspaceTab === "customer" ? (
              <div className="space-y-4">
                {canMessageCustomer ? (
                  <>
                    <Input
                      onChange={(event) =>
                        setMessageDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Short guest-facing subject"
                      value={messageDraft.title}
                    />
                    <Textarea
                      className="min-h-[140px]"
                      onChange={(event) =>
                        setMessageDraft((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                      placeholder="Write the update you want the guest to receive."
                      value={messageDraft.body}
                    />
                    <div className="flex justify-end">
                      <Button
                        disabled={
                          busyState === "message" ||
                          messageDraft.title.trim().length === 0 ||
                          messageDraft.body.trim().length === 0
                        }
                        onClick={() => void handleSendCustomerMessage()}
                        size="sm"
                      >
                        {busyState === "message" ? "Sending..." : "Send message"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    This ticket is not linked to a guest session, so no customer message can be sent from here.
                  </p>
                )}

                <div className="space-y-3">
                  <SectionEyebrow>Recent outbound messages</SectionEyebrow>
                  {detail.customerMessages.length > 0 ? (
                    detail.customerMessages.map((message) => (
                      <div
                        className="rounded-[1.1rem] border border-[rgba(23,29,25,0.08)] bg-white/90 px-4 py-3"
                        key={message.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950">{message.title}</p>
                            <p className="text-sm leading-relaxed text-slate-600">
                              {message.message}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs text-slate-500">
                            {formatTimestamp(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No customer messages sent from this ticket yet.</p>
                  )}
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex flex-wrap gap-2">
              <Button disabled={busyState === "save"} onClick={() => void handleSave()} size="sm">
                {busyState === "save" ? "Saving..." : "Save"}
              </Button>
              <Button
                disabled={busyState === "save" || draft.status === "resolved"}
                onClick={() => void handleSave("resolved")}
                size="sm"
                variant="secondary"
              >
                Resolve
              </Button>
              <Button
                disabled={busyState === "save" || draft.status === "closed"}
                onClick={() => void handleSave("closed")}
                size="sm"
                variant="danger"
              >
                Close
              </Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <SectionEyebrow>Customer details</SectionEyebrow>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Guest context
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <MetaLine
                label="Guest / QR"
                value={detail.ticket.customerLabel ?? "No guest label"}
              />
              <MetaLine
                label="Display name"
                value={detail.profile?.displayName ?? "No display name"}
              />
              <MetaLine
                label="Email"
                value={detail.profile?.email ?? "No email on file"}
              />
              <MetaLine
                label="Hotel"
                value={detail.ticket.hotelName ?? "No hotel linked"}
              />
              <MetaLine
                label="Fridge"
                value={detail.fridge?.name ?? "No fridge linked"}
              />
              <MetaLine
                label="Fridge code"
                value={detail.fridge?.code ?? "No fridge code"}
              />
              <MetaLine
                label="Location"
                value={detail.fridge?.location ?? detail.ticket.area ?? "No area mapped"}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <SectionEyebrow>Linked request</SectionEyebrow>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Session and reconciliation
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <MetaLine
                label="Request"
                value={
                  detail.request
                    ? `${labelize(detail.request.type)} · ${labelize(detail.request.status)}`
                    : "No linked request"
                }
              />
              <MetaLine
                label="Requested"
                value={
                  detail.request?.requestedAt
                    ? formatTimestamp(detail.request.requestedAt)
                    : "No request time"
                }
              />
              <MetaLine
                label="Session status"
                value={detail.session ? labelize(detail.session.status) : "No linked session"}
              />
              <MetaLine
                label="Session started"
                value={
                  detail.session?.createdAt
                    ? formatTimestamp(detail.session.createdAt)
                    : "No session start"
                }
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <SectionEyebrow>Past sessions</SectionEyebrow>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                Recent guest history
              </h2>
            </div>
            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              {detail.recentUserSessions.length > 0 ? (
                detail.recentUserSessions.map((entry) => (
                  <div
                    className="rounded-[1.1rem] border border-[rgba(23,29,25,0.08)] bg-white/90 px-4 py-3"
                    key={entry.session.id}
                  >
                    <p className="font-semibold text-slate-950">{entry.session.hotelName}</p>
                    <p className="text-xs text-slate-500">
                      {entry.session.location} · QR {entry.session.unlockCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Started {formatTimestamp(entry.session.createdAt)}
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                      <p>
                        Authorized{" "}
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(entry.totalAuthorizedCents / 100)}
                        </span>
                      </p>
                      <p>
                        Consumed{" "}
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(entry.totalConsumedCents / 100)}
                        </span>
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                        {labelize(entry.session.status)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No prior guest sessions to show.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
