"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

const navItems = [
  { href: "/", label: "Tickets" },
  { href: "/inventory", label: "Inventory" },
  { href: "/consumption", label: "Consumption Monitor" },
];

export function AppShell({
  children,
  eyebrow = "Management Console",
  hideHeader = false,
}: {
  children: ReactNode;
  eyebrow?: string;
  hideHeader?: boolean;
}) {
  const pathname = usePathname();
  const isTicketsRoute = pathname === "/" || pathname.startsWith("/tickets/");

  return (
    <div className="min-h-dvh bg-[var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="flex min-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-[32px] border border-white/70 bg-[rgba(248,251,248,0.82)] shadow-[0_28px_90px_rgba(39,67,55,0.12)] backdrop-blur-[18px]">
        <aside className="hidden w-[288px] shrink-0 border-r border-[rgba(23,29,25,0.08)] bg-[linear-gradient(180deg,rgba(245,249,246,0.96),rgba(238,244,240,0.86))] lg:flex lg:flex-col">
          <div className="border-b border-[rgba(23,29,25,0.08)] px-6 py-6">
            <Link aria-label="ChillStock management home" href="/">
              <BrandLogo size="md" />
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Management console
            </p>
            <p className="mt-2 max-w-[180px] text-sm leading-relaxed text-slate-600">
              Operations, ticket routing, and warehouse oversight.
            </p>
          </div>
          <nav className="flex-1 px-4 py-5">
            <div className="space-y-2">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? isTicketsRoute
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    className={`flex items-center rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-[rgba(255,255,255,0.9)] text-slate-950 shadow-[0_16px_40px_rgba(44,72,59,0.1)]"
                        : "text-slate-600 hover:bg-white/64 hover:text-slate-950"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {hideHeader ? null : (
            <header className="border-b border-[rgba(23,29,25,0.08)] bg-[rgba(249,252,249,0.76)] px-5 py-3 sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="lg:hidden">
                    <Link aria-label="ChillStock management home" href="/">
                      <BrandLogo size="md" />
                    </Link>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    {eyebrow}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:hidden">
                  {navItems.map((item) => {
                    const active =
                      item.href === "/"
                        ? isTicketsRoute
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                          active
                            ? "border-[rgba(24,104,95,0.22)] bg-white text-slate-900"
                            : "border-white/70 bg-white/72 text-slate-600 hover:bg-white"
                        }`}
                        href={item.href}
                        key={item.href}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </header>
          )}
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div
              className={
                hideHeader
                  ? "w-full px-5 py-2 sm:px-8 lg:px-10 lg:py-3"
                  : "w-full px-5 py-4 sm:px-8 lg:px-10 lg:py-5"
              }
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
