"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Icon } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationRichText } from "@/components/shared/NotificationRichText";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { notificationPlainTextFromHtml } from "@/lib/notificationRichText";
import { formatCurrency } from "@/lib/utils";

type NotificationPresetKey = "offer" | "on_the_house" | "friendly_reminder" | "custom";

const notificationPresets: Array<{
  key: NotificationPresetKey;
  label: string;
  title: string;
  bodyHtml: string;
}> = [
  {
    key: "offer",
    label: "Offer",
    title: "A little minibar offer for you",
    bodyHtml:
      "<p><strong>Special treat:</strong> there is a guest offer waiting for you right now.</p><p>Take a look and enjoy something nice 🍸✨</p>",
  },
  {
    key: "on_the_house",
    label: "On the house",
    title: "A complimentary drink is waiting",
    bodyHtml:
      "<p><strong>On the house:</strong> one drink is complimentary for you.</p><p>Feel free to grab it and enjoy your evening 🥂</p>",
  },
  {
    key: "friendly_reminder",
    label: "Friendly reminder",
    title: "Your minibar is ready whenever you are",
    bodyHtml:
      "<p>Just a friendly reminder that your minibar is stocked and ready.</p><p>Have fun and grab a drink whenever you like 🍷🎉</p>",
  },
  {
    key: "custom",
    label: "Custom create",
    title: "",
    bodyHtml: "",
  },
];

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

function DetailPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function ManagementConsumerDetailScreen({
  returnHref = "/consumption",
  sessionId,
}: {
  returnHref?: string;
  sessionId: Id<"guestSessions">;
}) {
  const router = useRouter();
  const detail = useQuery(api.tickets.getManagementConsumer, { sessionId });

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(returnHref);
  };

  if (detail === undefined) {
    return (
      <AppShell eyebrow="Live consumer sessions and identity context">
        <Card>
          <p className="text-sm text-slate-500">Loading consumer detail...</p>
        </Card>
      </AppShell>
    );
  }

  if (detail === null) {
    return (
      <AppShell eyebrow="Live consumer sessions and identity context">
        <Card className="space-y-3">
          <p className="font-semibold text-slate-950">This consumer session could not be found.</p>
          <p className="text-sm text-slate-500">
            It may have ended already or the link is no longer valid.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="Live consumer sessions and identity context">
      <div className="grid gap-4 xl:grid-cols-12 xl:auto-rows-[minmax(180px,auto)]">
        <Card className="space-y-6 xl:col-span-8 xl:row-span-2 xl:h-full">
          <button
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-800"
            onClick={handleBack}
            type="button"
          >
            <Icon className="shrink-0" name="arrow-left" size={16} />
            Back to consumption
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Consumer detail
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {detail.consumer.guestQr}
                </h1>
                <Badge className={toneForConsumerStatus(detail.consumer.status)}>
                  {detail.consumer.status}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                Live guest identity, stay context, and current minibar session details in one aligned overview.
              </p>
            </div>
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailPair
              label="Display name"
              value={detail.consumer.displayName ?? "Not provided"}
            />
            <DetailPair label="Email" value={detail.consumer.email ?? "No email saved"} />
            <DetailPair label="Guest QR" value={detail.consumer.guestQr} />
            <DetailPair label="Hotel" value={detail.consumer.hotelName} />
            <DetailPair label="Location" value={detail.consumer.location} />
            <DetailPair label="Area" value={detail.consumer.area} />
            <DetailPair label="Session status" value={labelize(detail.consumer.sessionStatus)} />
            <DetailPair label="Started" value={formatTimestamp(detail.consumer.createdAt)} />
            <DetailPair
              label="Deposit hold"
              value={detail.consumer.hasDepositHold ? "Yes" : "No"}
            />
          </div>
        </Card>

        <Card className="flex min-h-[180px] flex-col justify-between space-y-4 xl:col-span-4 xl:h-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Authorized total
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(detail.consumer.totalAuthorizedCents / 100)}
          </p>
          <p className="text-sm leading-relaxed text-slate-500">
            Total authorized wallet value for this active guest session.
          </p>
        </Card>

        <Card className="flex min-h-[180px] flex-col justify-between space-y-4 xl:col-span-4 xl:h-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Consumed total
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(detail.consumer.totalConsumedCents / 100)}
          </p>
          <p className="text-sm leading-relaxed text-slate-500">
            Total minibar value already consumed during this guest session.
          </p>
        </Card>

        <Card className="space-y-4 xl:col-span-5 xl:row-span-2 xl:h-full">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Recent sessions
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Recent stay history for this guest profile.
              </p>
            </div>
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {detail.recentUserSessions.map((entry) => (
              <div
                className="rounded-[1.1rem] border border-white/70 bg-white/80 px-4 py-3"
                key={entry.session.id}
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{entry.session.hotelName}</p>
                    <p className="text-xs text-slate-500">
                      {entry.session.location} · QR {entry.session.unlockCode}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatTimestamp(entry.session.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
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
                  </div>
                </div>
              </div>
            ))}
            {detail.recentUserSessions.length === 0 ? (
              <p className="text-sm text-slate-500">No recent sessions found for this guest.</p>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4 xl:col-span-7 xl:row-span-2 xl:h-full">
          <GuestNotificationsPanel
            key={detail.consumer.sessionId}
            recentNotifications={detail.recentNotifications ?? []}
            sessionId={detail.consumer.sessionId}
          />
        </Card>
      </div>
    </AppShell>
  );
}

function GuestNotificationsPanel({
  recentNotifications,
  sessionId,
}: {
  recentNotifications?: Array<{
    _id: Id<"notifications">;
    title: string;
    message: string;
    messageHtml?: string;
    createdAt: number;
  }>;
  sessionId: Id<"guestSessions">;
}) {
  const notifications = recentNotifications ?? [];
  const sendConsumerNotification = useMutation(api.tickets.sendManagementConsumerNotification);
  const [activePresetKey, setActivePresetKey] = useState<NotificationPresetKey>("custom");
  const [notificationDraft, setNotificationDraft] = useState({
    title: "",
    bodyHtml: "",
    bodyText: "",
  });
  const [notificationFeedback, setNotificationFeedback] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const canSendNotification =
    notificationDraft.title.trim().length > 0 && notificationDraft.bodyText.trim().length > 0;

  const applyNotificationPreset = (presetKey: NotificationPresetKey) => {
    const preset = notificationPresets.find((candidate) => candidate.key === presetKey);
    if (!preset) return;

    setActivePresetKey(presetKey);
    setNotificationDraft({
      title: preset.title,
      bodyHtml: preset.bodyHtml,
      bodyText: notificationPlainTextFromHtml(preset.bodyHtml),
    });
    setNotificationFeedback(null);
  };

  const handleSendNotification = async () => {
    if (!canSendNotification) return;

    setIsSendingNotification(true);
    setNotificationFeedback(null);

    try {
      await sendConsumerNotification({
        sessionId,
        title: notificationDraft.title.trim(),
        message: notificationDraft.bodyText.trim(),
        messageHtml: notificationDraft.bodyHtml || undefined,
        presetKey: activePresetKey,
      });
      setActivePresetKey("custom");
      setNotificationDraft({
        title: "",
        bodyHtml: "",
        bodyText: "",
      });
      setNotificationFeedback({ kind: "success", text: "Sent." });
    } catch (error) {
      console.error(error);
      setNotificationFeedback({
        kind: "error",
        text: "Couldn't send.",
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
          Guest notifications
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {notificationPresets.map((preset) => (
          <Button
            className={
              activePresetKey === preset.key
                ? "border-[rgba(24,104,95,0.28)] bg-[rgba(223,245,239,0.92)] text-teal-900"
                : undefined
            }
            key={preset.key}
            onClick={() => applyNotificationPreset(preset.key)}
            size="sm"
            variant="secondary"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Title
        </label>
        <Input
          onChange={(event) =>
            setNotificationDraft((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Short guest-facing subject"
          value={notificationDraft.title}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Message
        </label>
        <RichTextEditor
          className="min-h-[230px]"
          onChange={({ html, text }) =>
            setNotificationDraft((current) => ({
              ...current,
              bodyHtml: html,
              bodyText: text,
            }))
          }
          placeholder="Write the update you want the guest to receive."
          value={notificationDraft.bodyHtml}
        />
      </div>

      {notificationFeedback ? (
        <p
          className={
            notificationFeedback.kind === "error"
              ? "text-sm font-semibold text-rose-600"
              : "text-sm font-semibold text-emerald-700"
          }
        >
          {notificationFeedback.text}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button
          disabled={!canSendNotification || isSendingNotification}
          onClick={() => void handleSendNotification()}
          size="sm"
        >
          {isSendingNotification ? "Sending..." : "Send notification"}
        </Button>
      </div>

      <div className="mt-2 space-y-3 border-t border-[rgba(23,29,25,0.08)] pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Recent outbound messages
          </p>
        </div>

        <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                className="rounded-[1.2rem] border border-white/70 bg-white/82 px-4 py-3"
                key={notification._id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-slate-950">{notification.title}</p>
                    <NotificationRichText
                      className="text-sm leading-relaxed text-slate-600"
                      html={notification.messageHtml}
                      text={notification.message}
                    />
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">
              No management notifications have been sent to this guest yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
