import { ImageResponse } from "next/og";

export const alt = "Obsidian Men's Spa — Premium Massage & Luxury Treatments";
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
            fontSize: 130,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#dcbc8a",
            marginBottom: 28,
          }}
        >
          OBSIDIAN
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
            color: "#a89c8a",
            display: "flex",
          }}
        >
          Signature Massages · Couples Sessions · Open Daily 8 AM – 10 PM
        </div>
      </div>
    ),
    { ...size }
  );
}
