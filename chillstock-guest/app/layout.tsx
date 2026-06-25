import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AuthBootstrap } from "@/components/providers/AuthBootstrap";
import { AppProvider } from "@/components/providers/AppProvider";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChilledStock Guest",
  description: "A guest flow prototype for ChilledStock smart fridges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            <AuthBootstrap>
              <AppProvider>{children}</AppProvider>
            </AuthBootstrap>
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
