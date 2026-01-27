import React from 'react';
import { FileCheck } from 'lucide-react';

export function Logo({ size = 'default', className = '' }) {
  // Size configurations
  const sizes = {
    small: {
      iconSize: 32,
      iconPadding: 'p-1.5',
      iconRadius: 'rounded-lg',
      iconClass: 'w-4 h-4',
      fontSize: 'text-lg',
      gap: 'gap-2'
    },
    default: {
      iconSize: 40,
      iconPadding: 'p-2',
      iconRadius: 'rounded-xl',
      iconClass: 'w-5 h-5',
      fontSize: 'text-2xl',
      gap: 'gap-3'
    },
    large: {
      iconSize: 56,
      iconPadding: 'p-3',
      iconRadius: 'rounded-xl',
      iconClass: 'w-7 h-7',
      fontSize: 'text-3xl',
      gap: 'gap-4'
    }
  };

  const config = sizes[size] || sizes.default;

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Gradient Icon Box */}
      <div className={`${config.iconPadding} ${config.iconRadius} bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25 flex items-center justify-center`}>
        <FileCheck className={`${config.iconClass} text-white`} />
      </div>

      {/* Logo Text */}
      <span className={`font-bold ${config.fontSize} text-gray-900`}>
        Smart
        <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
          COI
        </span>
      </span>
    </div>
  );
}

// Export icon-only version for favicon and app icons
export function LogoIcon({ size = 32, className = '' }) {
  const iconSize = Math.round(size * 0.5);

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
      }}
    >
      <FileCheck
        style={{ width: iconSize, height: iconSize }}
        className="text-white"
      />
    </div>
  );
}
