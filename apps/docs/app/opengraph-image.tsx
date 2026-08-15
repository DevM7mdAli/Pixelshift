import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Pixelshift — local-first browser image conversion for every framework.";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const runtime = "nodejs";
export const dynamic = "force-static";

const logoData = await readFile(
  join(process.cwd(), "app", "icon.svg"),
  "base64",
);
const logoSrc = `data:image/svg+xml;base64,${logoData}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "46px 52px",
        color: "#151614",
        background: "#f2f0e8",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img alt="" height={72} src={logoSrc} width={72} />
          <span
            style={{
              fontSize: 33,
              fontWeight: 700,
              letterSpacing: "-1.4px",
            }}
          >
            Pixelshift
          </span>
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "2.5px",
            color: "#6b6d66",
          }}
        >
          LOCAL-FIRST / BROWSER-ONLY
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
          gap: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "635px",
          }}
        >
          <span
            style={{
              marginBottom: "22px",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "2.8px",
              color: "#ff6838",
            }}
          >
            IMAGE CONVERSION
          </span>
          <span
            style={{
              fontFamily: "serif",
              fontSize: 80,
              letterSpacing: "-5px",
              lineHeight: 0.92,
            }}
          >
            Every image.
          </span>
          <span
            style={{
              fontFamily: "serif",
              fontSize: 80,
              letterSpacing: "-5px",
              lineHeight: 0.92,
              color: "#ff6838",
            }}
          >
            One element.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            width: "330px",
            height: "300px",
            padding: "30px",
            color: "#f2f0e8",
            background: "#151614",
            borderTopRightRadius: "64px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "2.4px",
              color: "#caff45",
            }}
          >
            OUTPUT
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span
              style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-2px" }}
            >
              WEBP
            </span>
            <span style={{ fontSize: 21, color: "#b7b8b2" }}>
              quality · 85%
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                display: "flex",
                width: "12px",
                height: "12px",
                background: "#caff45",
                borderRadius: "999px",
              }}
            />
            <span style={{ fontSize: 16, letterSpacing: "1.5px" }}>
              0 BYTES UPLOADED
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          paddingTop: "22px",
          borderTop: "2px solid #151614",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 19, fontWeight: 700 }}>
          PNG · JPEG · WEBP · GIF · BMP
        </span>
        <span style={{ fontSize: 19, fontWeight: 700 }}>
          LIT · REACT · ANGULAR · VUE
        </span>
      </div>
    </div>,
    size,
  );
}
