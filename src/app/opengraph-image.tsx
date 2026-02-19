import { ImageResponse } from 'next/og';

export const alt = 'SmartCOI — AI-Powered COI Compliance Tracking';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0f6b3a 0%, #064e2b 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo mark + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          {/* Simplified logo icon — green rounded square with white checkmark */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #73E2A7, #5CC98E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Checkmark using CSS borders */}
            <div
              style={{
                width: 36,
                height: 20,
                borderLeft: '5px solid white',
                borderBottom: '5px solid white',
                transform: 'rotate(-45deg)',
                marginBottom: 8,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#ffffff',
              marginLeft: 20,
              letterSpacing: '-0.02em',
            }}
          >
            SmartCOI
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '0.01em',
          }}
        >
          AI-Powered COI Compliance Tracking
        </div>

        {/* Domain */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: '#a7f3d0',
            marginTop: 16,
            letterSpacing: '0.04em',
          }}
        >
          smartcoi.io
        </div>
      </div>
    ),
    { ...size }
  );
}
