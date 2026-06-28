import React from "react";

export function MyReportsEmptyIllustration() {
  return (
    <svg viewBox="0 0 160 140" className="w-full h-full object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Concentric ambient background lines */}
      <circle cx="80" cy="70" r="52" stroke="var(--accent-teal)" strokeOpacity="0.05" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx="80" cy="70" r="38" stroke="var(--accent-teal)" strokeOpacity="0.1" strokeWidth="1.5" />
      <circle cx="80" cy="70" r="22" fill="var(--bg-card)" fillOpacity="0.05" stroke="var(--accent-teal)" strokeOpacity="0.15" strokeWidth="1" />

      {/* Ground platform line */}
      <line x1="20" y1="115" x2="140" y2="115" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />

      {/* Flat character standing happily, holding clipboard and phone */}
      <g id="char-reports-empty">
        {/* Head */}
        <circle cx="80" cy="55" r="7" fill="var(--text-secondary)" />
        {/* Torso/Shirt */}
        <path d="M 74 62 C 74 62 70 80 75 95 L 85 95 C 90 80 86 62 86 62 Z" fill="var(--accent-highlight)" />
        {/* Legs/Pants */}
        <path d="M 76 95 L 76 115 M 84 95 L 84 115" stroke="var(--text-secondary)" strokeWidth="3.2" strokeLinecap="round" />
        
        {/* Arm holding a big clipboard */}
        <path d="M 85 66 Q 95 72 90 82" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Clipboard panel */}
        <rect x="91" y="75" width="15" height="21" rx="1.5" fill="var(--bg-card)" stroke="var(--accent-teal)" strokeWidth="1" />
        {/* Clipboard clip */}
        <rect x="95" y="72" width="7" height="3" rx="0.5" fill="var(--accent-highlight)" />
        {/* Clipboard checkmark */}
        <path d="M 94 85 L 97 88 L 102 81" stroke="var(--accent-teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        {/* Arm holding a smartphone */}
        <path d="M 74 66 Q 64 70 68 80" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Smartphone */}
        <rect x="63" y="77" width="4.5" height="8.5" rx="0.5" fill="var(--accent-teal)" />
      </g>

      {/* Clean sparkles of positive civic status */}
      <path d="M 122 55 L 124 58 L 128 59 L 124 60 L 122 63 L 120 60 L 116 59 L 120 58 Z" fill="var(--accent-teal)" className="animate-pulse" />
      <path d="M 38 75 L 40 78 L 44 79 L 40 80 L 38 83 L 36 80 L 32 79 L 36 78 Z" fill="var(--accent-highlight)" className="animate-pulse" />
    </svg>
  );
}
