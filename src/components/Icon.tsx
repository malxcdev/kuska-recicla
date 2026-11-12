import type { ReactNode } from "react";
import type { IconName } from "@/types";

const ICON_PATHS: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  book: <><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2z" /><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2z" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  check: <path d="m5 12 4 4L19 6" />,
  leaf: <><path d="M20 4S9 3 5 9c-3 5 1 9 5 9 7 0 10-14 10-14Z" /><path d="M4 21c3-6 7-9 12-12" /></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></>,
  bottle: <><path d="M9 3h6v4l2 3v10H7V10l2-3z" /><path d="M9 13h8" /></>,
  apple: <><path d="M12 8c-4-3-8 0-8 5 0 5 4 8 8 8s8-3 8-8c0-5-4-8-8-5Z" /><path d="M12 8c0-3 2-5 5-5M12 8c-2-2-4-2-5-2" /></>,
  glass: <path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3ZM12 17v4M8 21h8" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Z" /><path d="m19 16 .7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9L19 16Z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  phone: <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-2-2 2c-3.5-1.5-6.5-4.5-8-8l2-2-2-4Z" />,
  logout: <><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICON_PATHS[name]}
    </svg>
  );
}
