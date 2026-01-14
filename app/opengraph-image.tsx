import { ImageResponse } from 'next/og'

// Image metadata
export const alt = 'RMU-Campus X - แพลตฟอร์มแลกเปลี่ยนสิ่งของ'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Generate OpenGraph image
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '20px',
            }}
          >
            <span style={{ fontSize: '48px', color: '#1d4ed8', fontWeight: 'bold' }}>X</span>
          </div>
          <span style={{ fontSize: '56px', fontWeight: 'bold' }}>RMU-Campus X</span>
        </div>
        
        {/* Tagline */}
        <div
          style={{
            fontSize: '32px',
            opacity: 0.9,
            textAlign: 'center',
          }}
        >
          แพลตฟอร์มแลกเปลี่ยนสิ่งของสำหรับนักศึกษา
        </div>
        
        {/* University */}
        <div
          style={{
            fontSize: '24px',
            opacity: 0.7,
            marginTop: '20px',
          }}
        >
          มหาวิทยาลัยราชภัฏมหาสารคาม
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
