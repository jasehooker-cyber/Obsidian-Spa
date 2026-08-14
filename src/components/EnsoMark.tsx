/**
 * The enso ring from the Obsidian Spa logo, drawn as strokes.
 *
 * The supplied logo is a brush-textured raster whose wordmark stops being
 * legible below roughly 64px, so anywhere small — the header, inline accents —
 * uses the ring alone and sets the name in type beside it. The full lockup is
 * used at hero size, where the artwork earns its weight.
 */
export default function EnsoMark({
  className = "",
  size = 34,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <g strokeLinecap="round" transform="rotate(-24 16 16)">
        <circle
          cx="16"
          cy="16"
          r="10"
          stroke="var(--gold-dark)"
          strokeWidth="3.4"
          opacity="0.5"
        />
        <path
          d="M16 6 a10 10 0 1 1 -7.07 2.93"
          stroke="var(--gold)"
          strokeWidth="3"
        />
        <path
          d="M9.5 8.2 a10 10 0 0 1 12.6 0.6"
          stroke="var(--gold-light)"
          strokeWidth="2.2"
        />
      </g>
    </svg>
  );
}
