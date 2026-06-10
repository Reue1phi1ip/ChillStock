"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { NotificationBanner } from "@/components/shared/NotificationBanner";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NotificationsScreen() {
  const { notifications, dismissNotification } = useAppContext();

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <p className={guestTypography.eyebrow}>Activity log</p>
          <h1 className={guestTypography.pageTitle}>Notifications</h1>
          <p className={cn(guestTypography.body, "max-w-2xl")}>
            Every minibar update, top-up request, and restocker event is logged here.
          </p>
        </section>

        {notifications.length === 0 ? (
          <Card className="flex items-center justify-center text-center">
            <p className="text-sm font-semibold text-slate-900">No notifications yet</p>
          </Card>
        ) : (
          <section className="space-y-3">
            {notifications.map((notification) => (
              <NotificationBanner
                key={notification.id}
                notification={notification}
                onDismiss={() => dismissNotification(notification.id)}
              />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
