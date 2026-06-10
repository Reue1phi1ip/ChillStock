"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/layout/AppShell";
import { guestTypography } from "@/components/shared/guestTypography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ServiceTicketScreenProps = {
  description?: string;
  title: string;
  type: "special_order" | "support";
};

const typeCopy = {
  special_order: {
    helper: "Tell us what you need.",
    detailsPlaceholder: "Brand, timing, or anything the team should know.",
    subjectPlaceholder: "Bottle of brut rose",
    submit: "Send request",
  },
  support: {
    helper: "Tell us what needs help.",
    detailsPlaceholder: "What happened and what you need.",
    subjectPlaceholder: "Fridge not cooling",
    submit: "Send support request",
  },
} as const;

export function ServiceTicketScreen({ description, title, type }: ServiceTicketScreenProps) {
  const createSupportTicket = useMutation(api.tickets.createGuestSupportTicket);
  const createSpecialOrderTicket = useMutation(api.tickets.createGuestSpecialOrderTicket);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState("");

  const copy = typeCopy[type];

  const handleSubmit = async () => {
    if (!subject.trim() || !details.trim()) {
      setError("Add a subject and details.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      if (type === "support") {
        await createSupportTicket({
          title: subject,
          description: details,
        });
      } else {
        await createSpecialOrderTicket({
          title: subject,
          description: details,
        });
      }
      setStatus("sent");
      setSubject("");
      setDetails("");
    } catch (submissionError) {
      console.error(submissionError);
      setError("Couldn't send the request right now. Try again.");
      setStatus("idle");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="space-y-2">
          <p className={guestTypography.eyebrow}>Guest request intake</p>
          <h1 className={guestTypography.pageTitle}>{title}</h1>
          {description ? (
            <p className={cn(guestTypography.body, "max-w-2xl")}>{description}</p>
          ) : null}
        </section>

        <Card className="space-y-5">
          <div>
            <h2 className={guestTypography.sectionTitle}>Request details</h2>
            <p className={cn(guestTypography.bodyMuted, "mt-1")}>{copy.helper}</p>
          </div>

          <div className="space-y-2">
            <label className={guestTypography.eyebrow}>Subject</label>
            <Input
              onChange={(event) => setSubject(event.target.value)}
              placeholder={copy.subjectPlaceholder}
              value={subject}
            />
          </div>

          <div className="space-y-2">
            <label className={guestTypography.eyebrow}>Details</label>
            <textarea
              className="min-h-32 w-full rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setDetails(event.target.value)}
              placeholder={copy.detailsPlaceholder}
              value={details}
            />
          </div>

          {error && (
            <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {status === "sent" && (
            <div className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Request sent.
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={status === "submitting"} onClick={handleSubmit}>
              {status === "submitting" ? "Sending..." : copy.submit}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
