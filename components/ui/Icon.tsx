export type IconName =
  | "us"
  | "indicators"
  | "backtest"
  | "ai"
  | "globe"
  | "markets"
  | "grid"
  | "watchlist"
  | "simulator"
  | "settings";

function Paths({ name }: { name: IconName }) {
  switch (name) {
    case "us":
      return (
        <>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </>
      );
    case "indicators":
      return <path d="M3 12h4l2-6 4 12 2-6h6" />;
    case "backtest":
      return (
        <>
          <path d="M9 3h6" />
          <path d="M10 3v5.5L5.5 17A2 2 0 0 0 7.3 20h9.4A2 2 0 0 0 18.5 17L14 8.5V3" />
          <path d="M7.5 14h9" />
        </>
      );
    case "ai":
      return (
        <>
          <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
          <path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
        </>
      );
    case "globe":
      return (
        <>
          <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
          <path d="M3 12h18" />
          <path d="M12 3c2.2 2.3 3.4 5.1 3.4 9s-1.2 6.7-3.4 9c-2.2-2.3-3.4-5.1-3.4-9S9.8 5.3 12 3Z" />
        </>
      );
    case "markets":
      return (
        <>
          <path d="M3 19V5" />
          <path d="M7 16l4-5 3 3 5-7" />
          <path d="M15 7h4v4" />
        </>
      );
    case "grid":
      return (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
        </>
      );
    case "watchlist":
      return (
        <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.7C19 15.6 12 20 12 20Z" />
      );
    case "simulator":
      return (
        <>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15l3-4 3 2 4-6" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.5v-.1A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.5h.3A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 3.6l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.8 2H14a1.7 1.7 0 0 0 1.6 2 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 20 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.3V14h-.3a1.7 1.7 0 0 0-2.3 1Z" />
        </>
      );
  }
}

/**
 * Single-stroke, currentColor line icon set (matches the dashboard's inline
 * glyphs). Server-safe: pure SVG, no client hooks.
 */
export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <Paths name={name} />
    </svg>
  );
}