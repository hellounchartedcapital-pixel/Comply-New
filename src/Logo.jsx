import React from 'react';

export function Logo({ size = 'default', showTagline = false, className = '' }) {
  // Size configurations
  const sizes = {
    small: { width: 120, height: 36, fontSize: 14, taglineFontSize: 6 },
    default: { width: 180, height: 54, fontSize: 18, taglineFontSize: 8 },
    large: { width: 240, height: 72, fontSize: 24, taglineFontSize: 10 }
  };

  const config = sizes[size] || sizes.default;

  return (
    <svg
      width={config.width}
      height={config.height}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document outline */}
      <rect x="18" y="12" width="24" height="28" rx="2" fill="#F0FDF4" stroke="#10B981" strokeWidth="2"/>

      {/* Document lines */}
      <line x1="22" y1="20" x2="34" y2="20" stroke="#10B981" strokeWidth="1.5" opacity="0.5"/>
      <line x1="22" y1="25" x2="38" y2="25" stroke="#10B981" strokeWidth="1.5" opacity="0.5"/>
      <line x1="22" y1="30" x2="32" y2="30" stroke="#10B981" strokeWidth="1.5" opacity="0.5"/>

      {/* AI sparkles */}
      <path d="M38 16L40 18L42 16L40 14L38 16Z" fill="#34D399"/>
      <path d="M36 26L37.5 27.5L39 26L37.5 24.5L36 26Z" fill="#34D399" opacity="0.7"/>
      <circle cx="24" cy="36" r="1.5" fill="#10B981"/>

      {/* Text */}
      <text
        x="50"
        y="28"
        fontFamily="'Inter', 'Segoe UI', -apple-system, sans-serif"
        fontSize={config.fontSize}
        fontWeight="700"
        fill="#1F2937"
      >
        Smart<tspan fill="#10B981">COI</tspan>
      </text>

      {showTagline && (
        <text
          x="50"
          y="40"
          fontFamily="'Inter', 'Segoe UI', -apple-system, sans-serif"
          fontSize={config.taglineFontSize}
          fontWeight="400"
          fill="#6B7280"
          letterSpacing="0.5"
        >
          AI-POWERED COMPLIANCE
        </text>
      )}
    </svg>
  );
}
