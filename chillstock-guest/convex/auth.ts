import { convexAuth } from "@convex-dev/auth/server";
import Apple from "@auth/core/providers/apple";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    Apple,
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

      if (redirectTo.startsWith("?") || redirectTo.startsWith("/")) {
        return `${siteUrl}${redirectTo}`;
      }

      try {
        const destination = new URL(redirectTo);
        const configuredSite = new URL(siteUrl);
        const isConfiguredSite = destination.hostname === configuredSite.hostname;
        const isLocalhost =
          destination.hostname === "localhost" || destination.hostname === "127.0.0.1";
        const isDevTunnel =
          destination.hostname.endsWith(".loca.lt") ||
          destination.hostname.endsWith(".trycloudflare.com");

        if (isConfiguredSite || isLocalhost || isDevTunnel) {
          return destination.toString();
        }
      } catch {
        // Fall back to SITE_URL below for malformed redirect targets.
      }

      return siteUrl;
    },
  },
});
