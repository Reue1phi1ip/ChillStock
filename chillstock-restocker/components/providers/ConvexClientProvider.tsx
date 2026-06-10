"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const convexUrl =
      process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";
    return new ConvexReactClient(convexUrl);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
