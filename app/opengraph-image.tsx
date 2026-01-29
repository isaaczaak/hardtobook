import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "hard to book - NYC's hardest reservations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 160, marginBottom: 20 }}>🥀🍴</div>
        <div style={{ color: "#fafafa", fontSize: 48, fontWeight: 700 }}>
          hard to book
        </div>
        <div style={{ color: "#71717a", fontSize: 24, marginTop: 16 }}>
          NYC's hardest reservations
        </div>
      </div>
    ),
    { ...size }
  );
}
