/**
 * A vine-and-leaf frame around the whole homepage hero — the threshold into
 * the site. One horizontal tile and one vertical tile (same vine motif,
 * rotated) are repeated along all four edges rather than stretched to fit,
 * so the frame holds its shape at any hero height instead of distorting.
 * Small corner sprigs bridge where the edges meet.
 */
const H_TILE =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27160%27%20height%3D%2740%27%20viewBox%3D%270%200%20160%2040%27%3E%20%3Cpath%20d%3D%27M0%2C20%20C20%2C4%2040%2C36%2060%2C20%20C80%2C4%20100%2C36%20120%2C20%20C140%2C4%20160%2C30%20160%2C20%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%271.4%27%20fill%3D%27none%27%20stroke-linecap%3D%27round%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%2828%208%29%20rotate%28-25%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%2868%2032%29%20rotate%2820%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%28112%208%29%20rotate%28-30%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Ccircle%20cx%3D%27150%27%20cy%3D%2727%27%20r%3D%271.6%27%20fill%3D%27%23dcbc8a%27%20opacity%3D%270.5%27%2F%3E%20%3C%2Fsvg%3E\")";

const V_TILE =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2740%27%20height%3D%27160%27%20viewBox%3D%270%200%2040%20160%27%3E%20%3Cpath%20d%3D%27M20%2C0%20C4%2C20%2036%2C40%2020%2C60%20C4%2C80%2036%2C100%2020%2C120%20C4%2C140%2030%2C160%2020%2C160%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%271.4%27%20fill%3D%27none%27%20stroke-linecap%3D%27round%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%288%2028%29%20rotate%28-25%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%2832%2068%29%20rotate%2820%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Cpath%20d%3D%27M-8%2C0%20Q0%2C-6%208%2C0%20Q0%2C6%20-8%2C0%20Z%27%20transform%3D%27translate%288%20112%29%20rotate%28-30%29%27%20stroke%3D%27%23bb9159%27%20stroke-width%3D%270.9%27%20fill%3D%27%23bb9159%27%20fill-opacity%3D%270.14%27%20opacity%3D%270.55%27%2F%3E%20%3Ccircle%20cx%3D%2727%27%20cy%3D%27150%27%20r%3D%271.6%27%20fill%3D%27%23dcbc8a%27%20opacity%3D%270.5%27%2F%3E%20%3C%2Fsvg%3E\")";

export default function GatewayFrame() {
  return (
    <div
      className="pointer-events-none absolute inset-x-4 bottom-4 top-24 z-[1] sm:top-28"
      aria-hidden="true"
    >
      {/* top / bottom */}
      <div
        className="absolute left-6 right-6 top-0 h-9"
        style={{ backgroundImage: H_TILE, backgroundRepeat: "repeat-x" }}
      />
      <div
        className="absolute bottom-0 left-6 right-6 h-9 -scale-y-100"
        style={{ backgroundImage: H_TILE, backgroundRepeat: "repeat-x" }}
      />
      {/* left / right */}
      <div
        className="absolute bottom-6 left-0 top-6 w-9"
        style={{ backgroundImage: V_TILE, backgroundRepeat: "repeat-y" }}
      />
      <div
        className="absolute bottom-6 right-0 top-6 w-9 -scale-x-100"
        style={{ backgroundImage: V_TILE, backgroundRepeat: "repeat-y" }}
      />
      {/* corner sprigs, bridging where the edges meet */}
      <CornerSprig className="absolute left-0 top-0" />
      <CornerSprig className="absolute right-0 top-0 -scale-x-100" />
      <CornerSprig className="absolute bottom-0 left-0 -scale-y-100" />
      <CornerSprig className="absolute bottom-0 right-0 -scale-x-100 -scale-y-100" />
    </div>
  );
}

function CornerSprig({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`h-14 w-14 sm:h-16 sm:w-16 ${className}`}
      fill="none"
    >
      <path
        d="M2,2 C16,10 10,26 24,32 C36,37 32,50 44,54"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M-7,0 Q0,-6 7,0 Q0,6 -7,0 Z"
        transform="translate(13 12) rotate(20)"
        stroke="var(--gold)"
        strokeWidth="0.9"
        fill="var(--gold)"
        fillOpacity="0.14"
        opacity="0.55"
      />
      <path
        d="M-7,0 Q0,-6 7,0 Q0,6 -7,0 Z"
        transform="translate(30 34) rotate(-15)"
        stroke="var(--gold)"
        strokeWidth="0.9"
        fill="var(--gold)"
        fillOpacity="0.14"
        opacity="0.55"
      />
      <circle
        cx="44"
        cy="54"
        r="2"
        fill="var(--gold-light)"
        opacity="0.6"
        style={{ animation: "pulseGlow 3s ease-in-out infinite" }}
      />
    </svg>
  );
}
