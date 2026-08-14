import { ImageResponse } from "next/og";

export const alt = "Obsidian Spa — Premium Men's Massage in Midtown Manhattan";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at center, #1a1408 0%, #131009 65%)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.5em",
            color: "#bb9159",
            marginBottom: 24,
          }}
        >
          PREMIUM MEN&apos;S SPA
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 400,
            letterSpacing: "0.14em",
            color: "#dcbc8a",
            marginBottom: 28,
          }}
        >
          OBSIDIAN SPA
        </div>
        <div
          style={{
            width: 480,
            height: 2,
            background:
              "linear-gradient(to right, transparent, #bb9159, transparent)",
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 30,
            color: "#a0a0a0",
            display: "flex",
          }}
        >
          Signature · Deep Tissue · Restorative · Open Daily 8 AM – 10 PM
        </div>
      </div>
    ),
    { ...size }
  );
}
