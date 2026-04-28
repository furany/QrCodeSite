import { ImageResponse } from "next/og";

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
          alignItems: "center",
          justifyContent: "center",
          background: "#f7faf9",
          color: "#10201b",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "980px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 36, color: "#047857", marginBottom: 24 }}>
              Qrft
            </div>
            <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.05 }}>
              QR-Codes erstellen und verwalten
            </div>
            <div style={{ marginTop: 28, fontSize: 34, color: "#52635d" }}>
              Statisch. Dynamisch. Selbst gehostet.
            </div>
          </div>
          <div
            style={{
              width: 260,
              height: 260,
              display: "flex",
              flexWrap: "wrap",
              background: "#ffffff",
              padding: 18,
              border: "1px solid #d7dfdc",
            }}
          >
            {Array.from({ length: 169 }).map((_, index) => {
              const x = index % 13;
              const y = Math.floor(index / 13);
              const finder =
                (x < 4 && y < 4) || (x > 8 && y < 4) || (x < 4 && y > 8);
              const filled = finder || (index * 37 + y * 11) % 5 < 2;
              return (
                <div
                  key={index}
                  style={{
                    width: 16,
                    height: 16,
                    margin: 1,
                    background: filled ? "#047857" : "#ffffff",
                    borderRadius: 3,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
