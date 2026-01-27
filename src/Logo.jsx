import React from 'react';

export function Logo({ size = 'default', className = '' }) {
  // Size configurations
  const sizes = {
    small: {
      iconSize: 32,
      iconRadius: 8,
      svgSize: 20,
      fontSize: 'text-xl',
      gap: 'gap-2'
    },
    default: {
      iconSize: 40,
      iconRadius: 10,
      svgSize: 24,
      fontSize: 'text-2xl',
      gap: 'gap-3'
    },
    large: {
      iconSize: 56,
      iconRadius: 12,
      svgSize: 32,
      fontSize: 'text-3xl',
      gap: 'gap-4'
    }
  };

  const config = sizes[size] || sizes.default;

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Gradient Icon Box */}
      <div
        className="flex items-center justify-center"
        style={{
          width: config.iconSize,
          height: config.iconSize,
          borderRadius: config.iconRadius,
          background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #14B8A6 100%)'
        }}
      >
        <svg
          width={config.svgSize}
          height={config.svgSize}
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2z"/>
        </svg>
      </div>

      {/* Logo Text */}
      <span className={`font-bold ${config.fontSize}`} style={{ color: '#1a1a1a' }}>
        Smart
        <span
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #14B8A6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          COI
        </span>
      </span>
    </div>
  );
}

// Export icon-only version for favicon and app icons
export function LogoIcon({ size = 32, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #14B8A6 100%)'
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 9h-2v2H9v-2H7v-2h2V7h2v2h2v2z"/>
      </svg>
    </div>
  );
}
