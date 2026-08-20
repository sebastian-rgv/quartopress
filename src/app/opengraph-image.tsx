import { ImageResponse } from "next/og";

export const alt = "QuartoPress — Conversor online de QMD y MD";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VT323_URL = "https://fonts.gstatic.com/s/vt323/v18/pxiKyp0ihIEF2hsY.ttf";

export default async function OgImage() {
  let fontData: ArrayBuffer | null = null;
  try {
    const res = await fetch(VT323_URL);
    if (res.ok) fontData = await res.arrayBuffer();
  } catch {
    fontData = null;
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0b",
          color: "#f4f4f5",
          fontFamily: fontData ? "VT323" : "monospace",
          padding: "56px 72px",
        }}
      >
        {/* Glows decorativos */}
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -140,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(52,211,153,0.4), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: -160,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(113,113,122,0.25), transparent 70%)",
          }}
        />

        {/* Barra superior */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: "#34d399",
                color: "#052e16",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              QP
            </div>
            <div style={{ display: "flex", fontSize: 40, letterSpacing: 1 }}>
              <span>Quarto</span>
              <span style={{ color: "#34d399" }}>Press</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              border: "1px solid #3f3f46",
              borderRadius: 9999,
              padding: "6px 18px",
              fontSize: 24,
              color: "#a1a1aa",
            }}
          >
            Pandoc / WASM / 100% local
          </div>
        </div>

        {/* Titular con keyword */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.05 }}>
            Conversor online de
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              lineHeight: 1.05,
              color: "#34d399",
            }}
          >
            QMD y MD
          </div>
        </div>

        {/* Ventana terminal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            position: "relative",
            border: "1px solid #27272a",
            borderRadius: 20,
            backgroundColor: "rgba(24,24,27,0.9)",
            padding: "22px 28px",
          }}
        >
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 9999,
                backgroundColor: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 9999,
                backgroundColor: "#febc2e",
              }}
            />
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 9999,
                backgroundColor: "#28c840",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 30, color: "#d4d4d8" }}>
            <span style={{ color: "#34d399" }}>$</span>
            <span>pandoc informe.qmd -o informe.html</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 30, color: "#d4d4d8" }}>
            <span style={{ color: "#34d399" }}>$</span>
            <span>pandoc informe.qmd -o informe.pdf</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#34d399",
              marginTop: 10,
            }}
          >
            HTML / PDF / .ipynb - sin subir archivos
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "VT323",
              data: fontData,
              weight: 400,
              style: "normal" as const,
            },
          ]
        : undefined,
    }
  );
}
