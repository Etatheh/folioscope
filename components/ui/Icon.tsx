export type IconName = "us" | "indicators" | "backtest" | "ai" | "globe";

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