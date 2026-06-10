"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/components/providers/AppProvider";
import { guestTypography } from "@/components/shared/guestTypography";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { cn } from "@/lib/utils";

type AuthMode = "signup" | "login";

const socialButtons: Array<{
  id: string;
  label: string;
  hint?: string;
  icon: IconName;
  iconClass: string;
  buttonClass: string;
}> = [
  {
    id: "google",
    label: "Continue with Google",
    hint: "Use your Google account",
    icon: "google",
    iconClass: "border border-white/70 bg-white/76 text-slate-700",
    buttonClass: "text-slate-900 hover:bg-white/64",
  },
  {
    id: "apple",
    label: "Continue with Apple",
    hint: "Use your Apple ID",
    icon: "apple",
    iconClass: "bg-slate-900 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)]",
    buttonClass: "text-slate-900 hover:bg-white/64",
  },
];

export function AuthScreen() {
  const searchParams = useSearchParams();
  const { signIn } = useAuthActions();
  const { isAuthenticated, isSessionBootstrapping, sessionBootstrapError, sessionStatus } =
    useAppContext();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [ageValidated, setAgeValidated] = useState(false);
  const [error, setError] = useState("");
  const [authInProgress, setAuthInProgress] = useState<string | null>(null);
  const fridgeCode = searchParams.get("fridgeCode")?.trim() || "";
  const isPrototypeLaunch = searchParams.get("prototype") === "1";

  const handleAuth = async (method: string) => {
    if (mode === "signup" && !ageValidated) {
      setError("Please confirm your age to continue.");
      window.setTimeout(() => setError(""), 2500);
      return;
    }

    setAuthInProgress(method);
    setError("");

    try {
      const redirectTo = window.location.href;

      await signIn(method, { redirectTo });
    } catch (authError) {
      console.error(authError);
      setAuthInProgress(null);
      setError("Sign in failed. Please try again.");
      return;
    }
  };

  if (isAuthenticated && isSessionBootstrapping) {
    return (
      <AppShell>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-6">
          <div className="rounded-[2rem] border border-white/60 bg-white/48 p-6 text-center shadow-[0_22px_50px_rgba(111,128,156,0.14)] backdrop-blur-[18px] sm:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-200 border-t-teal-700" />
            </div>
            <div className="space-y-2">
              <h1 className={guestTypography.pageTitle}>Preparing your stay</h1>
              <p className={guestTypography.bodyMuted}>
                We&apos;re syncing your guest access and sending you to the right next step.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (isAuthenticated && !sessionStatus) {
    return (
      <AppShell>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center space-y-5 py-4 sm:space-y-6 sm:py-6">
          <div className="rounded-[2rem] border border-white/60 bg-white/48 p-6 text-center shadow-[0_22px_50px_rgba(111,128,156,0.14)] backdrop-blur-[18px] sm:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Icon name="alert" size={20} />
            </div>
            <div className="space-y-2">
              <h1 className={guestTypography.pageTitle}>Fridge access needs attention</h1>
              <p className={guestTypography.bodyMuted}>
                {sessionBootstrapError ??
                  "We could not prepare a guest tab for that fridge. Try scanning again."}
              </p>
              {fridgeCode ? (
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Fridge code: {fridgeCode}
                  {isPrototypeLaunch ? " · prototype" : ""}
                </p>
              ) : null}
            </div>
            <div className="mt-5">
              <Link
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-[1.4rem] bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
                href="/scan"
              >
                <Icon name="scan" size={18} />
                <span>Scan another fridge</span>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center space-y-5 py-4 sm:space-y-6 sm:py-6">
        <ScreenHeader
          description={
            mode === "signup"
              ? "Quick sign-up to unlock the fridge and start your tab."
              : "Log in to access your existing tab."
          }
          icon="shield"
          title={mode === "signup" ? "Verify & Sign Up" : "Welcome Back"}
        />

        {fridgeCode ? (
          <div className="rounded-[1.6rem] border border-teal-100 bg-teal-50/78 px-4 py-3 text-sm text-teal-900">
            Starting access for fridge <span className="font-semibold">{fridgeCode}</span>
            {isPrototypeLaunch ? " in prototype mode." : "."}
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-orange-100 bg-orange-50/78 px-4 py-3 text-sm text-orange-900">
            Scan a fridge code first so we know which minibar to open.
          </div>
        )}

        <div className="grid rounded-[2rem] border border-white/60 bg-white/38 p-1.5 shadow-[0_18px_40px_rgba(108,123,153,0.14)] backdrop-blur-[18px] sm:grid-cols-2">
          {(["signup", "login"] as const).map((tab) => (
            <button
              className={cn(
                "rounded-[1.45rem] px-4 py-3 text-sm font-semibold transition sm:text-base",
                mode === tab
                  ? "bg-white/86 text-slate-950 shadow-[0_12px_26px_rgba(108,123,153,0.12)]"
                  : "text-slate-500 hover:text-slate-800",
              )}
              key={tab}
              onClick={() => {
                setMode(tab);
                setError("");
              }}
              type="button"
            >
              {tab === "signup" ? "New Guest" : "Returning Guest"}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {socialButtons.map((button) => (
            <button
              className={cn(
                "flex min-h-20 w-full items-center gap-4 rounded-[2rem] border border-white/60 bg-white/48 px-5 py-4 text-left text-sm shadow-[0_22px_50px_rgba(111,128,156,0.14)] backdrop-blur-[18px] transition active:scale-[0.98]",
                button.buttonClass,
              )}
              disabled={authInProgress !== null}
              key={button.id}
              onClick={() => handleAuth(button.id)}
              type="button"
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  button.iconClass,
                )}
              >
                <Icon name={button.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">
                  {authInProgress === button.id ? "Redirecting..." : button.label}
                </span>
                {button.hint && <span className={guestTypography.caption}>{button.hint}</span>}
              </span>
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <button
            className={cn(
              "flex w-full cursor-pointer items-start gap-3 rounded-[2rem] border p-5 text-left shadow-[0_22px_50px_rgba(111,128,156,0.14)] backdrop-blur-[18px] transition",
              ageValidated
                ? "border-teal-300/80 bg-white/62"
                : "border-white/60 bg-white/44 hover:bg-white/58",
            )}
            onClick={() => setAgeValidated((current) => !current)}
            type="button"
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition",
                ageValidated ? "bg-teal-600 text-white" : "border-2 border-slate-300 bg-white/80",
              )}
            >
              {ageValidated && <Icon name="check" size={13} />}
            </span>
            <span className="text-sm leading-relaxed text-slate-700">
              I confirm I am{" "}
              <span className="font-semibold text-slate-800">18 years or older</span> and legally
              permitted to purchase alcohol.
            </span>
          </button>
        )}

        {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
      </div>
    </AppShell>
  );
}
