import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "alert"
  | "apple"
  | "arrow-left"
  | "arrow-right"
  | "beer"
  | "bell"
  | "card"
  | "check"
  | "check-circle"
  | "chevron-left"
  | "clock"
  | "copy"
  | "droplet"
  | "facebook"
  | "gauge"
  | "glass"
  | "google"
  | "home"
  | "items"
  | "linkedin"
  | "lock"
  | "lock-open"
  | "mail"
  | "receipt"
  | "refresh"
  | "scan"
  | "send"
  | "shield"
  | "shopping-bag"
  | "snowflake"
  | "sparkles"
  | "truck"
  | "wine"
  | "x";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

const paths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <path d="M10.3 3.4 2.6 16.6a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.1 3.4a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </>
  ),
  apple: (
    <>
      <path d="M15.8 2.5c-.1 1.2-.7 2.2-1.5 2.9-.8.7-1.8 1.2-2.9 1.1-.1-1.1.5-2.2 1.3-2.9.9-.8 2-1.2 3.1-1.1Z" />
      <path d="M19 16.7c-.5 1.1-.8 1.6-1.5 2.6-1 1.4-2.3 3.1-4 3.1-1.5 0-1.9-.9-3.9-.9s-2.5.9-4 .9c-1.6 0-2.9-1.6-3.9-3-2.7-3.9-3-8.5-1.3-10.9 1.2-1.7 3.1-2.7 4.9-2.7 1.8 0 3 .9 4.5.9 1.4 0 2.3-.9 4.4-.9 1.6 0 3.2.9 4.4 2.4-3.9 2.1-3.3 7.7.4 8.5Z" />
    </>
  ),
  "arrow-left": <path d="M19 12H5m0 0 6 6m-6-6 6-6" />,
  "arrow-right": <path d="M5 12h14m0 0-6-6m6 6-6 6" />,
  beer: (
    <>
      <path d="M7 7h8v13H7z" />
      <path d="M15 10h2.5a2.5 2.5 0 0 1 0 5H15" />
      <path d="M8 7V4h6v3" />
      <path d="M10 11v5" />
      <path d="M12.5 11v5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.6 2.6L16.5 9" />
    </>
  ),
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </>
  ),
  droplet: <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />,
  facebook: <path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1Z" />,
  gauge: (
    <>
      <path d="M21 13a9 9 0 1 0-18 0" />
      <path d="m12 13 5-5" />
      <path d="M12 13h.01" />
      <path d="M5 18h14" />
    </>
  ),
  glass: (
    <>
      <path d="M8 3h8l-1 9a3 3 0 0 1-6 0L8 3Z" />
      <path d="M12 15v6" />
      <path d="M9 21h6" />
      <path d="M8.4 8h7.2" />
    </>
  ),
  google: (
    <>
      <path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.7a4 4 0 0 1-1.7 2.6v2.2h2.8c1.7-1.5 2.7-3.8 2.7-6.5Z" />
      <path d="M12 21c2.4 0 4.4-.8 5.8-2.2L15 16.5a5.3 5.3 0 0 1-8-2.8H4.1V16A8.8 8.8 0 0 0 12 21Z" />
      <path d="M7 13.7a5.4 5.4 0 0 1 0-3.4V8H4.1a9 9 0 0 0 0 8L7 13.7Z" />
      <path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5A8.7 8.7 0 0 0 12 3 8.8 8.8 0 0 0 4.1 8L7 10.3a5.3 5.3 0 0 1 5-3.7Z" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  items: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a5 5 0 0 1 5 5v7h-4v-6a2 2 0 0 0-4 0v6H9V9h4v1.5A4.5 4.5 0 0 1 16 8Z" />
      <path d="M3 9h4v11H3z" />
      <circle cx="5" cy="5" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "lock-open": (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 7.5-2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 21V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  scan: (
    <>
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M7 12h10" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  "shopping-bag": (
    <>
      <path d="M6 8h12l-1 13H7L6 8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2v20" />
      <path d="m4.9 4.9 14.2 14.2" />
      <path d="M2 12h20" />
      <path d="m19.1 4.9-14.2 14.2" />
      <path d="m8 4 4 4 4-4" />
      <path d="m8 20 4-4 4 4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3 10 9l-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z" />
      <path d="M19 16v4" />
      <path d="M21 18h-4" />
      <path d="M5 3v3" />
      <path d="M6.5 4.5h-3" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3z" />
      <path d="M14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  wine: (
    <>
      <path d="M8 3h8l-1 7a3 3 0 0 1-6 0L8 3Z" />
      <path d="M9 7h6" />
      <path d="M12 13v8" />
      <path d="M8 21h8" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={props.strokeWidth ?? 2}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
