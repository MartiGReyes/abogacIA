import type { ReactNode } from "react"

export function Icon({
  name = "briefcase",
  className = "",
}: {
  name?: string
  className?: string
}) {
  const paths: Record<string, ReactNode> = {
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18M5 6.5h14M5 17.5h14" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V4h8v3M3 12l9 4 9-4M12 13v5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v18h17M8 16v-5m5 5V6m5 10V9" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 8h18M16 13h5v4h-5zM5 5V3h13" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    "chevron-left": <path d="m15 6-6 6 6 6" />,
    "chevron-right": <path d="m9 6 6 6-6 6" />,
    "arrow-up": <path d="M12 20V4m-6 6 6-6 6 6" />,
    play: <path d="m8 4 12 8-12 8Z" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    scale: (
      <>
        <path d="M12 3v18M5 21h14M3 7h18M6 7l-4 8h8L6 7Zm12 0-4 8h8l-4-8Z" />
        <path d="M2 15a4 4 0 0 0 8 0m4 0a4 4 0 0 0 8 0" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 10h18" />
      </>
    ),
    shield: <path d="m12 3 9 4c0 7-3 11-9 14C6 18 3 14 3 7Zm-4 9 3 3 5-6" />,
    cases: (
      <>
        <path d="M4 4h6l2 3h8v14H4zM8 12h8m-8 4h6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    chat: (
      <path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h6a8 8 0 0 1 8 8ZM7 9h10M7 13h6" />
    ),
  }
  return (
    <svg
      aria-hidden="true"
      className={`ui-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.briefcase}
    </svg>
  )
}
