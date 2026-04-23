"use client";
import type { NavIcon } from "@/types/navigation";

const SVG_PATHS: Record<NavIcon, React.ReactNode> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" strokeWidth="1.4"/>
      <path d="M12 7v5l2.5 2.5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  fire: (
    <path
      d="M12 2c-1 3.5-4 5.5-4 9a4 4 0 008 0c0-2.5-1.5-4-2-6-1 2-1 3-2 3.5V2z"
      strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  users: (
    <>
      <circle cx="8"  cy="7"  r="3" strokeWidth="1.4"/>
      <circle cx="16" cy="7"  r="3" strokeWidth="1.4"/>
      <path d="M2 20c0-3.5 2.7-5.5 6-5.5" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M10 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" strokeWidth="1.4"/>
      <path d="M3 9h18M8 2v4M16 2v4" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="8"  cy="14" r="1" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
    </>
  ),
  "chart-up": (
    <>
      <polyline points="3,17 8,11 13,14 18,7 21,10" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="3" y1="21" x2="21" y2="21" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),
  building: (
    <>
      <rect x="3"  y="2"  width="18" height="20" rx="1" strokeWidth="1.4"/>
      <rect x="8"  y="14" width="3"  height="8"  strokeWidth="1.4"/>
      <rect x="13" y="14" width="3"  height="8"  strokeWidth="1.4"/>
      <rect x="7"  y="6"  width="3"  height="3"  rx="0.5" strokeWidth="1.2"/>
      <rect x="14" y="6"  width="3"  height="3"  rx="0.5" strokeWidth="1.2"/>
    </>
  ),
  money: (
    <>
      <circle cx="12" cy="12" r="9" strokeWidth="1.4"/>
      <path d="M12 7v10" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3H15" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="9"  strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="5"  strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <line   x1="12" y1="12" x2="7"  y2="6" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),
  ghost: (
    <path
      d="M12 3a7 7 0 00-7 7v10l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2L21 20V10a7 7 0 00-7-7z"
      strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  invoice: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="1.5" strokeWidth="1.4"/>
      <line x1="8" y1="8"  x2="16" y2="8"  strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="8" y1="16" x2="13" y2="16" strokeWidth="1.4" strokeLinecap="round"/>
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" strokeWidth="1.4"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="1.4"/>
    </>
  ),
  ai: (
    <path
      d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
      strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  "team-pulse": (
    <>
      <circle cx="12" cy="8"  r="3" strokeWidth="1.4"/>
      <path d="M5 20c0-4 3-6 7-6s7 2 7 6" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M1 12h3l2-4 3 8 2-4 2 2h3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  shield: (
    <path
      d="M12 2L4 6v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V6l-8-4z"
      strokeWidth="1.4" strokeLinejoin="round"
    />
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="11" rx="2" strokeWidth="1.4"/>
      <path d="M8 11V7a4 4 0 018 0v4" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
    </>
  ),
};

interface NavIconProps {
  name:   NavIcon;
  size?:  number;
  color?: string;
  className?: string;
}

export function NavIcon({ name, size = 18, color = "currentColor", className }: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeLinejoin="round"
      className={className}
    >
      {SVG_PATHS[name]}
    </svg>
  );
}
