import React from "react";

export default function Logo({ className = "h-8", showText = true, textClass = "" }) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* High-Fidelity Golden Shield with Clinical Cross */}
      <svg
        className={className}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Gold Gradient for Shield Body */}
          <linearGradient id="gold-metallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2D4" />
            <stop offset="30%" stopColor="#E5C158" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="85%" stopColor="#A27913" />
            <stop offset="100%" stopColor="#5C4204" />
          </linearGradient>

          {/* Symmetrical Inner Highlight for depth */}
          <linearGradient id="gold-highlight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#E5C158" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.4" />
          </linearGradient>

          {/* Deep Drop Shadow for Bevel effect */}
          <filter id="shadow-filter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Shadow layer */}
        <g filter="url(#shadow-filter)">
          {/* Symmetrical Outer Shield Outline */}
          <path
            d="M60 10 
               C82 14, 105 18, 105 32 
               C105 70, 90 98, 60 112 
               C30 98, 15 70, 15 32 
               C15 18, 38 14, 60 10 Z"
            fill="url(#gold-metallic)"
            stroke="#16161A"
            strokeWidth="1.5"
          />

          {/* Dark Symmetrical Segment Dividers forming the cross inside the shield */}
          {/* Vertical Divider */}
          <path
            d="M58 10 L58 111.5 H62 L62 10 Z"
            fill="#0F0F12"
          />
          {/* Horizontal Divider */}
          <path
            d="M15 54 H105 V58 H15 Z"
            fill="#0F0F12"
          />

          {/* Inner Shield Symmetrical Bevel Accents */}
          <path
            d="M60 18 
               C76 21, 95 24, 95 35 
               C95 66, 83 89, 60 101 
               C37 89, 25 66, 25 35 
               C25 24, 44 21, 60 18 Z"
            fill="url(#gold-highlight)"
            stroke="#16161A"
            strokeWidth="1"
            pointerEvents="none"
          />

          {/* Center Raised Medical Clinical Cross */}
          <g transform="translate(60, 42)">
            {/* Horizontal Bar */}
            <path
              d="M-15 -3.5 H15 V3.5 H-15 Z"
              fill="#0F0F12"
            />
            {/* Vertical Bar */}
            <path
              d="M-3.5 -15 H3.5 V15 H-3.5 Z"
              fill="#0F0F12"
            />
          </g>
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-sans text-xl font-bold tracking-[0.18em] text-white uppercase ${textClass}`}
            style={{
              textShadow: "0 2px 12px rgba(229, 193, 88, 0.15)",
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
            }}
          >
            Privy<span className="text-[#E5C158] font-semibold">Doc</span>
          </span>
          <span className="text-[7.5px] uppercase tracking-[0.42em] text-slate-400 font-mono -mt-1 block">
            Certified Telemedicine
          </span>
        </div>
      )}
    </div>
  );
}
