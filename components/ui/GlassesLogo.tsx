"use client";

interface GlassesLogoProps {
  className?: string;
}

export default function GlassesLogo({ className }: GlassesLogoProps) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E65100" />
          <stop offset="50%" stopColor="#FF8F00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <ellipse cx="32" cy="26" rx="22" ry="16" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <ellipse cx="32" cy="24" rx="12" ry="9" stroke="url(#goldGradient)" strokeWidth="2.5" fill="none" />
        <ellipse cx="32" cy="38" rx="22" ry="8" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="26" cy="26" r="7" fill="url(#goldGradient)" />
        <circle cx="38" cy="26" r="7" fill="url(#goldGradient)" />
        <circle cx="26" cy="26" r="3.5" fill="#0a0a0a" />
        <circle cx="38" cy="26" r="3.5" fill="#0a0a0a" />
        <circle cx="27" cy="24" r="1.5" fill="url(#goldGradient)" />
        <circle cx="37" cy="24" r="1.5" fill="url(#goldGradient)" />
      </g>
      <path
        d="M32 46v8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 12c0-3 5-7 11-7 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M52 12c0-3-5-7-11-7-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 12l-4-4"
        stroke="url(#goldGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M54 12l4-4"
        stroke="url(#goldGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M20 14l-4-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M44 14l4-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="32" cy="16" rx="6" ry="3" stroke="url(#goldGradient)" strokeWidth="1.5" fill="none" />
      <path
        d="M22 50l5 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 50l-5 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
