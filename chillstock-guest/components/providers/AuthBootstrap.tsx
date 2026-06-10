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

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const searchParams = useSearchParams();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  const startOrResumeSession = useMutation(api.sessions.startOrResume);
  const [hasAttemptedSessionBootstrap, setHasAttemptedSessionBootstrap] = useState(false);
  const [isSessionBootstrapping, setIsSessionBootstrapping] = useState(false);
  const [bootstrappedSessionId, setBootstrappedSessionId] = useState<string | null>(null);
  const [sessionBootstrapError, setSessionBootstrapError] = useState<string | null>(null);
  const fridgeCode = searchParams.get("fridgeCode")?.trim() || undefined;
  const isPrototypeLaunch = searchParams.get("prototype") === "1";

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
            forceFreshPrototype: isPrototypeLaunch,
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
    isPrototypeLaunch,
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
