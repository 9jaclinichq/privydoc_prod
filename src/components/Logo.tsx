import React from "react";

export default function Logo({ className = "h-8", showText = true, textClass = "" }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src="/pwa_logo.svg"
        alt="PrivyDoc"
        className={className}
        style={{ borderRadius: "8px" }}
      />

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
