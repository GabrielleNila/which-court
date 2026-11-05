/** A simple line-drawn scales emblem. Decorative only. */
export function Emblem({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 7v32M15 41h18M10 13h28" />
      <circle cx="24" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 13 6.5 26h11L12 13ZM36 13l-5.5 13h11L36 13Z" />
      <path d="M6.5 26a5.5 3 0 0 0 11 0M30.5 26a5.5 3 0 0 0 11 0" />
    </svg>
  );
}
