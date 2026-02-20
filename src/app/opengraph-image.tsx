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
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle emerald glow */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(115,226,167,0.12) 0%, transparent 70%)',
            top: -100,
            right: -100,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(115,226,167,0.08) 0%, transparent 70%)',
            bottom: -100,
            left: -50,
            display: 'flex',
          }}
        />

        {/* Logo mark + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {/* Logo icon — emerald rounded square with white checkmark */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #73E2A7, #4CC78A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(115,226,167,0.3)',
            }}
          >
            <div
              style={{
                width: 32,
                height: 18,
                borderLeft: '5px solid white',
                borderBottom: '5px solid white',
                transform: 'rotate(-45deg)',
                marginBottom: 6,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: '#ffffff',
              marginLeft: 20,
              letterSpacing: '-0.03em',
            }}
          >
            SmartCOI
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: '#73E2A7',
            letterSpacing: '0.02em',
          }}
        >
          AI-Powered COI Compliance Tracking
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 16,
          }}
        >
          for Commercial Property Managers
        </div>

        {/* Domain pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 40,
            padding: '8px 24px',
            borderRadius: 999,
            border: '1px solid rgba(115,226,167,0.3)',
            background: 'rgba(115,226,167,0.08)',
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#73E2A7',
              letterSpacing: '0.04em',
            }}
          >
            smartcoi.io
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
