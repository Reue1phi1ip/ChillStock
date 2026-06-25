"use client";

import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";

type AuthBootstrapContextValue = {
  hasAttemptedSessionBootstrap: boolean;
  isSessionBootstrapping: boolean;
  bootstrappedSessionId: string | null;
  sessionBootstrapError: string | null;
};

const AuthBootstrapContext = createContext<AuthBootstrapContextValue>({
  hasAttemptedSessionBootstrap: false,
  isSessionBootstrapping: false,
  bootstrappedSessionId: null,
  sessionBootstrapError: null,
});

function getFridgeCodeFromUrlLikeValue(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;
  if (/^\d{4,}$/.test(trimmedValue)) return trimmedValue;

  try {
    const url = new URL(trimmedValue);
    const nestedCode =
      url.searchParams.get("fridgeCode") ??
      url.searchParams.get("fridgecode") ??
      url.searchParams.get("fridge_code") ??
      url.searchParams.get("code");
    if (nestedCode?.trim()) return nestedCode.trim();
  } catch {
    // Continue with partial query parsing below.
  }

  const queryStart = trimmedValue.indexOf("?");
  if (queryStart !== -1) {
    const query = trimmedValue.slice(queryStart + 1).split("#")[0];
    const params = new URLSearchParams(query);
    const nestedCode =
      params.get("fridgeCode") ??
      params.get("fridgecode") ??
      params.get("fridge_code") ??
      params.get("code");
    if (nestedCode?.trim()) return nestedCode.trim();
  }

  return trimmedValue;
}

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const searchParams = useSearchParams();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const startOrResumeSession = useMutation(api.sessions.startOrResume);
  const [hasAttemptedSessionBootstrap, setHasAttemptedSessionBootstrap] = useState(false);
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(false);
  const [bootstrappedSessionId, setBootstrappedSessionId] = useState<string | null>(null);
  const [sessionBootstrapError, setSessionBootstrapError] = useState<string | null>(null);
  const fridgeCode = getFridgeCodeFromUrlLikeValue(searchParams.get("fridgeCode") ?? "");
  const isQrAuthChoicePending = Boolean(fridgeCode) && searchParams.get("authReady") !== "1";

  useEffect(() => {
    let cancelled = false;

    if (isLoading) return;

    if (!isAuthenticated) {
      queueMicrotask(() => {
        if (!cancelled) {
          setHasAttemptedSessionBootstrap(false);
          setIsSessionBootstrapping(false);
          setBootstrappedSessionId(null);
          setSessionBootstrapError(null);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    if (isQrAuthChoicePending) {
      queueMicrotask(() => {
        if (!cancelled) {
          setHasAttemptedSessionBootstrap(false);
          setIsSessionBootstrapping(false);
          setBootstrappedSessionId(null);
          setSessionBootstrapError(null);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setHasAttemptedSessionBootstrap(false);
        setIsSessionBootstrapping(true);
        setBootstrappedSessionId(null);
        setSessionBootstrapError(null);
      }
    });

    void (async () => {
      try {
        const [, sessionId] = await Promise.all([
          ensureCurrentUser(),
          startOrResumeSession({
            fridgeCode,
          }),
        ]);
        if (cancelled) return;
        setBootstrappedSessionId(sessionId ?? null);
      } catch (error) {
        console.error("Failed to bootstrap authenticated guest session", error);
        if (!cancelled) {
          setSessionBootstrapError(
            error instanceof Error ? error.message : "We could not prepare your fridge access.",
          );
        }
      } finally {
        if (!cancelled) {
          setHasAttemptedSessionBootstrap(true);
          setIsSessionBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ensureCurrentUser,
    fridgeCode,
    isAuthenticated,
    isLoading,
    isQrAuthChoicePending,
    startOrResumeSession,
  ]);

  const value = useMemo(
    () => ({
      hasAttemptedSessionBootstrap,
      isSessionBootstrapping,
      bootstrappedSessionId,
      sessionBootstrapError,
    }),
    [
      bootstrappedSessionId,
      hasAttemptedSessionBootstrap,
      isSessionBootstrapping,
      sessionBootstrapError,
    ],
  );

  return <AuthBootstrapContext.Provider value={value}>{children}</AuthBootstrapContext.Provider>;
}

export function useAuthBootstrap() {
  return useContext(AuthBootstrapContext);
}
