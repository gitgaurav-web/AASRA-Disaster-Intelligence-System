import React from 'react';

/**
 * Official Emblem of India (Lion Capital of Ashoka with Satyameva Jayate)
 * Rendered in SVG for authentic Government of India portal appearance.
 */
export default function NationalEmblem({ className = "w-10 h-10", variant = "gold" }) {
  const isGold = variant === "gold";
  const strokeColor = isGold ? "#D4AF37" : "currentColor";
  const fillColor = isGold ? "#F6E05E" : "currentColor";

  return (
    <div className={`flex flex-col items-center justify-center flex-shrink-0 ${className}`}>
      <svg
        viewBox="0 0 100 125"
        className="w-full h-full drop-shadow-sm"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ashoka Chakra Center base */}
        <circle cx="50" cy="85" r="7" stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="50" cy="85" r="1.5" fill={strokeColor} />
        {/* Chakra Spokes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <line
            key={deg}
            x1="50"
            y1="85"
            x2={50 + 6.5 * Math.cos((deg * Math.PI) / 180)}
            y2={85 + 6.5 * Math.sin((deg * Math.PI) / 180)}
            stroke={strokeColor}
            strokeWidth="0.8"
          />
        ))}

        {/* Base Pedestal (Abacus) */}
        <rect x="20" y="93" width="60" height="4" rx="1.5" fill={fillColor} fillOpacity="0.3" stroke={strokeColor} strokeWidth="1.2" />
        <rect x="15" y="97" width="70" height="4" rx="1.5" fill={fillColor} fillOpacity="0.4" stroke={strokeColor} strokeWidth="1.2" />
        <rect x="24" y="77" width="52" height="15" rx="2" stroke={strokeColor} strokeWidth="1.2" fill={fillColor} fillOpacity="0.1" />

        {/* Bull on right, Horse on left (stylized motifs) */}
        <path d="M 30 83 Q 32 80 36 83 Q 34 87 30 85 Z" fill={strokeColor} />
        <path d="M 70 83 Q 68 80 64 83 Q 66 87 70 85 Z" fill={strokeColor} />

        {/* Central Lion Head */}
        <path
          d="M 44 28 C 44 20, 56 20, 56 28 C 58 24, 63 27, 60 32 C 64 34, 63 42, 59 44 C 61 50, 55 54, 50 55 C 45 54, 39 50, 41 44 C 37 42, 36 34, 40 32 C 37 27, 42 24, 44 28 Z"
          fill={fillColor}
          fillOpacity="0.75"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        {/* Central Lion Facial Details */}
        <ellipse cx="47" cy="33" rx="1.2" ry="1" fill={strokeColor} />
        <ellipse cx="53" cy="33" rx="1.2" ry="1" fill={strokeColor} />
        <path d="M 48.5 37 Q 50 39 51.5 37" stroke={strokeColor} strokeWidth="1" strokeLinecap="round" />
        <path d="M 46 42 Q 50 45 54 42" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" />

        {/* Left Profile Lion */}
        <path
          d="M 38 32 C 32 26, 25 32, 28 38 C 24 41, 26 48, 30 50 C 28 56, 34 60, 39 60 C 40 54, 38 48, 38 32 Z"
          fill={fillColor}
          fillOpacity="0.6"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <ellipse cx="31" cy="38" rx="1" ry="0.8" fill={strokeColor} />

        {/* Right Profile Lion */}
        <path
          d="M 62 32 C 68 26, 75 32, 72 38 C 76 41, 74 48, 70 50 C 72 56, 66 60, 61 60 C 60 54, 62 48, 62 32 Z"
          fill={fillColor}
          fillOpacity="0.6"
          stroke={strokeColor}
          strokeWidth="1.2"
        />
        <ellipse cx="69" cy="38" rx="1" ry="0.8" fill={strokeColor} />

        {/* Front Paws / Mane Column */}
        <path d="M 42 55 L 42 77 M 58 55 L 58 77 M 46 55 L 46 77 M 54 55 L 54 77" stroke={strokeColor} strokeWidth="1.2" />
        <path d="M 35 60 L 35 77 M 65 60 L 65 77" stroke={strokeColor} strokeWidth="1" />

        {/* Satyameva Jayate (सत्यमेव जयते) Inscription text */}
        <text
          x="50"
          y="114"
          textAnchor="middle"
          fontSize="9.5"
          fontFamily="serif"
          fontWeight="bold"
          fill={strokeColor}
          letterSpacing="0.8"
        >
          सत्यमेव जयते
        </text>
      </svg>
    </div>
  );
}
