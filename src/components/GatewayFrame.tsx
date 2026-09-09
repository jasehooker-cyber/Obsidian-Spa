/**
 * A subtle vine-and-leaf ornament framing the homepage hero — meant to read
 * as a threshold into the space rather than a decorative flourish. One line
 * art motif (a single vine, a handful of leaves, one glinting bud) mirrored
 * into all four corners via CSS transforms, so there is one drawing to keep
 * consistent rather than four.
 */
export default function GatewayFrame() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <VineCorner className="absolute left-0 top-0" />
      <VineCorner className="absolute right-0 top-0 -scale-x-100" />
      <VineCorner className="absolute bottom-0 left-0 -scale-y-100" />
      <VineCorner className="absolute bottom-0 right-0 -scale-x-100 -scale-y-100" />
    </div>
  );
}

function VineCorner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 140 140"
      className={`h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 ${className}`}
      fill="none"
    >
      <path
        d="M6,6 C30,14 22,42 48,48 C68,52 62,76 84,82 C98,86 94,104 110,110"
        stroke="var(--gold)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.35"
      />
      <Leaf x={20} y={17} rotate={25} />
      <Leaf x={42} y={45} rotate={-15} />
      <Leaf x={70} y={70} rotate={30} />
      <Leaf x={92} y={92} rotate={-10} />
      {/* A quiet glint at the tip — the one nod to crystal facets in the frame itself. */}
      <circle
        cx="110"
        cy="110"
        r="2.2"
        fill="var(--gold-light)"
        opacity="0.6"
        style={{ animation: "pulseGlow 3s ease-in-out infinite" }}
      />
    </svg>
  );
}

function Leaf({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <path
      d="M-8,0 Q0,-7 8,0 Q0,7 -8,0 Z"
      transform={`translate(${x} ${y}) rotate(${rotate})`}
      stroke="var(--gold)"
      strokeWidth="0.75"
      fill="var(--gold)"
      fillOpacity="0.07"
      opacity="0.4"
    />
  );
}
