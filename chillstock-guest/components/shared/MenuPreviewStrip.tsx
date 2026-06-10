"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { cn } from "@/lib/utils";

type MenuPreviewItem = {
  id: string;
  name: string;
  type: string;
  imageColor: string;
};

type MenuPreviewStripProps = {
  autoPlayMs?: number;
  href: string;
  items: MenuPreviewItem[];
  title: string;
};

const MAX_PREVIEW_ITEMS = 6;

function iconForProductType(type: string): IconName {
  const normalized = type.toLowerCase();
  if (normalized.includes("wine")) return "wine";
  if (normalized.includes("water") || normalized.includes("mixer")) return "droplet";
  if (normalized.includes("beer")) return "beer";
  return "shopping-bag";
}

export function MenuPreviewStrip({
  autoPlayMs = 2200,
  href,
  items,
  title,
}: MenuPreviewStripProps) {
  const previewItems = useMemo(() => items.slice(0, MAX_PREVIEW_ITEMS), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResumeTimer = () => {
    if (!resumeTimerRef.current) return;
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  };

  const scheduleResume = (delayMs: number) => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setPaused(false);
      resumeTimerRef.current = null;
    }, delayMs);
  };

  const pauseTemporarily = (delayMs = 2200) => {
    setPaused(true);
    scheduleResume(delayMs);
  };

  useEffect(() => {
    return () => clearResumeTimer();
  }, []);

  useEffect(() => {
    if (previewItems.length <= 1) return;

    const intervalId = setInterval(() => {
      if (paused) return;

      setActiveIndex((current) => {
        const lastIndex = previewItems.length - 1;
        const nextIndex = current >= lastIndex ? 0 : current + 1;
        const container = containerRef.current;
        const nextCard = cardRefs.current[nextIndex];

        if (container) {
          if (nextIndex === 0) {
            container.scrollTo({ left: 0, behavior: "auto" });
          } else if (nextCard) {
            container.scrollTo({
              left: nextCard.offsetLeft,
              behavior: "smooth",
            });
          }
        }

        return nextIndex;
      });
    }, autoPlayMs);

    return () => clearInterval(intervalId);
  }, [autoPlayMs, paused, previewItems]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || previewItems.length === 0) return;

    let closestIndex = 0;
    let smallestDelta = Number.POSITIVE_INFINITY;
    for (let index = 0; index < previewItems.length; index += 1) {
      const card = cardRefs.current[index];
      if (!card) continue;
      const delta = Math.abs(container.scrollLeft - card.offsetLeft);
      if (delta < smallestDelta) {
        smallestDelta = delta;
        closestIndex = index;
      }
    }

    setActiveIndex(closestIndex);
    pauseTemporarily(2600);
  };

  if (previewItems.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h2>
      </div>

      <div
        className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-0.5"
        onFocusCapture={() => pauseTemporarily(2200)}
        onMouseEnter={() => {
          clearResumeTimer();
          setPaused(true);
        }}
        onMouseLeave={() => scheduleResume(700)}
        onScroll={handleScroll}
        onTouchStart={() => pauseTemporarily(2600)}
        ref={containerRef}
      >
        {previewItems.map((item, index) => (
          <Link
            className="group block w-32 shrink-0 snap-start"
            href={href}
            key={item.id}
            onPointerDown={() => pauseTemporarily(2600)}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
          >
            <article className="overflow-hidden rounded-[1.2rem] border border-white/45 bg-white/24 shadow-[0_8px_20px_rgba(108,123,153,0.09)] backdrop-blur-[10px] transition group-hover:-translate-y-0.5 group-hover:bg-white/32">
              <div
                className={cn(
                  "relative flex h-[4.5rem] w-full items-center justify-center overflow-hidden",
                  item.imageColor || "bg-amber-100",
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.58),transparent_62%)]" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-[0.75rem] border border-white/55 bg-white/70 text-slate-900 shadow-[0_10px_20px_rgba(74,88,118,0.1)] backdrop-blur">
                  <Icon name={iconForProductType(item.type)} size={18} strokeWidth={1.7} />
                </div>
              </div>
              <div className="px-2 py-1.5">
                <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900">{item.name}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
