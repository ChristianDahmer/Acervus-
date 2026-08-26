import React, { useState } from 'react';

interface AcervusSystemLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const AcervusSystemLogo: React.FC<AcervusSystemLogoProps> = ({ 
  className = '', 
  size = 48,
  showText = false 
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {!imgError ? (
        <img 
          src="/logo.png" 
          alt="ACERVUS (GGERE) - Gestão Inteligente de Acervos e Reservas" 
          style={{ height: `${size}px`, width: 'auto' }}
          className="object-contain filter drop-shadow-md hover:scale-105 transition-transform duration-200 shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Vector Fallback */
        <svg 
          width={size} 
          height={Math.round(size * 1.0)} 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 filter drop-shadow-md"
        >
          <defs>
            <linearGradient id="goldA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#9A7B1C" />
            </linearGradient>
            <linearGradient id="blueA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0B1329" />
            </linearGradient>
            <linearGradient id="waveCyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Left Shelf / Building Structure */}
          <path d="M20 120 L20 60 L50 35 L50 120 Z" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
          <line x1="28" y1="50" x2="42" y2="50" stroke="#38BDF8" strokeWidth="3" />
          <line x1="28" y1="70" x2="42" y2="70" stroke="#38BDF8" strokeWidth="3" />
          <line x1="28" y1="90" x2="42" y2="90" stroke="#38BDF8" strokeWidth="3" />

          {/* Main Stylized 'A' - Left Arm (Blue) */}
          <path d="M30 140 L85 20 L115 20 L60 140 Z" fill="url(#blueA)" stroke="#1D4ED8" strokeWidth="1.5" />

          {/* Main Stylized 'A' - Right Arm (Gold) */}
          <path d="M100 20 L130 20 L170 140 L135 140 Z" fill="url(#goldA)" />

          {/* Frequency Wave Crossing 'A' */}
          <path 
            d="M20 110 Q50 120 80 100 T120 90 T150 100 T185 85" 
            fill="none" 
            stroke="url(#waveCyan)" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />
          <path 
            d="M70 105 L75 80 L80 115 L85 95 L90 108" 
            fill="none" 
            stroke="#22D3EE" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />

          {/* Subtext */}
          <text x="100" y="165" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#22D3EE" textAnchor="middle">
            ACERVUS <tspan fill="#FDE047">(GGERE)</tspan>
          </text>
          <text x="100" y="185" fontFamily="sans-serif" fontWeight="700" fontSize="8" fill="#38BDF8" textAnchor="middle">
            GESTÃO INTELIGENTE DE ACERVOS
          </text>
        </svg>
      )}

      {/* Additional Text if requested */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className="font-serif italic font-extrabold text-white text-base sm:text-lg tracking-wide leading-none">
            ACERVUS <span className="text-[#FDE047] font-sans font-bold">(GGERE)</span>
          </span>
          <span className="text-[9px] font-mono font-bold text-[#38BDF8] uppercase tracking-wider leading-tight mt-0.5">
            GESTÃO INTELIGENTE DE ACERVOS E RESERVAS
          </span>
        </div>
      )}
    </div>
  );
};
