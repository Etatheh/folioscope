type ProBadgeProps = {
  label?: string;
  title?: string;
  className?: string;
};

/**
 * Glowing "PRO FEATURE" pill used on Pro-only cards (server friendly: the glow
 * is pure CSS, no client JavaScript required).
 */
export default function ProBadge({
  label = "PRO FEATURE",
  title,
  className = "",
}: ProBadgeProps) {
  return (
    <span className={`pro-badge ${className}`} title={title} aria-label={label}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-2.5 w-2.5"
        aria-hidden="true"
      >
        <path
          d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
