import { ImageResponse } from "next/og"

// Image metadata - Facebook/LINE/X recommend 1200x630
export const alt = "RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

// RMU Brand colors - Green primary (เขียว RMU)
const BRAND = {
  greenDark: "#166534",
  green: "#16a34a",
  greenLight: "#4ade80",
  white: "#ffffff",
  cream: "#fafaf9",
}

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
          background: `linear-gradient(135deg, ${BRAND.greenDark} 0%, ${BRAND.green} 40%, ${BRAND.greenLight} 100%)`,
          padding: "48px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Card-like container for readability */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BRAND.cream,
            borderRadius: "24px",
            padding: "56px 64px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          }}
        >
          {/* Logo block */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "88px",
                height: "88px",
                background: `linear-gradient(135deg, ${BRAND.green} 0%, ${BRAND.greenDark} 100%)`,
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: BRAND.white,
                fontSize: "48px",
                fontWeight: "bold",
              }}
            >
              X
            </div>
            <span
              style={{
                fontSize: "52px",
                fontWeight: "bold",
                color: BRAND.greenDark,
                letterSpacing: "-0.02em",
              }}
            >
              RMU-Campus X
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "28px",
              color: "#374151",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: "600px",
            }}
          >
            แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา
          </div>

          {/* University - subtle */}
          <div
            style={{
              fontSize: "20px",
              color: "#6b7280",
              marginTop: "16px",
            }}
          >
            มหาวิทยาลัยราชภัฏมหาสารคาม
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
