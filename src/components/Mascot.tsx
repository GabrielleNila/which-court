/** "Libby", an original little scales-of-justice mascot. Decorative only. */
export function Mascot({ size = 96, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
    >
      {/* base */}
      <ellipse cx="60" cy="108" rx="30" ry="6" fill="#eadff0" />
      <rect x="44" y="94" width="32" height="10" rx="5" fill="#b9a8f5" />
      {/* pillar body with face */}
      <rect x="47" y="40" width="26" height="58" rx="13" fill="#ffd6e0" />
      <circle cx="55" cy="60" r="3" fill="#3b2f4a" />
      <circle cx="65" cy="60" r="3" fill="#3b2f4a" />
      <circle cx="56" cy="59" r="1" fill="#fff" />
      <circle cx="66" cy="59" r="1" fill="#fff" />
      <path d="M55 67 Q60 72 65 67" stroke="#3b2f4a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="51" cy="66" r="2.8" fill="#f7a8bd" />
      <circle cx="69" cy="66" r="2.8" fill="#f7a8bd" />
      {/* beam */}
      <rect x="18" y="32" width="84" height="6" rx="3" fill="#b9a8f5" />
      <circle cx="60" cy="30" r="7" fill="#fff1c2" stroke="#b9a8f5" strokeWidth="2" />
      {/* strings */}
      <path d="M24 38 L14 62 M24 38 L34 62" stroke="#b9a8f5" strokeWidth="2" />
      <path d="M96 38 L86 62 M96 38 L106 62" stroke="#b9a8f5" strokeWidth="2" />
      {/* pans */}
      <path d="M10 62 Q24 76 38 62 Z" fill="#d3f3e6" stroke="#8fd9bb" strokeWidth="2" />
      <path d="M82 62 Q96 76 110 62 Z" fill="#d3f3e6" stroke="#8fd9bb" strokeWidth="2" />
      {/* sparkle */}
      <path d="M100 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#f7a8bd" />
    </svg>
  );
}
