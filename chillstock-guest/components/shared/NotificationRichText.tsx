"use client";

import { useMemo } from "react";
import { sanitizeNotificationHtml } from "@/lib/notificationRichText";
import { cn } from "@/lib/utils";

export function NotificationRichText({
  className,
  html,
  text,
}: {
  className?: string;
  html?: string;
  text: string;
}) {
  const sanitizedHtml = useMemo(() => sanitizeNotificationHtml(html), [html]);

  if (!sanitizedHtml) {
    return <p className={cn("whitespace-pre-wrap", className)}>{text}</p>;
  }

  return (
    <div
      className={cn(
        "break-words whitespace-normal [&_a]:font-medium [&_a]:text-teal-700 [&_a]:underline [&_em]:italic [&_li+li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p+p]:mt-2 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
