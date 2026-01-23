"use client";

export default function AthenaLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="athenaGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD54D" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      
      <g>
        <path
          d="M16 48 L12 56 L20 56 Z"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M20 16 C20 16 18 20 18 24 L22 24 C22 20 24 16 28 14 C32 12 38 12 42 14 C46 16 48 20 48 24 L52 24 C52 20 50 16 50 16"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M20 16 C22 12 28 10 32 10 C36 10 42 12 44 16 C46 18 48 20 48 24"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        <path
          d="M32 10 L32 8 L30 8 L30 6"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        <path
          d="M32 10 L32 8 L34 8 L34 6"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        <circle
          cx="18"
          cy="22"
          r="3"
          fill="url(#athenaGoldGradient)"
        />
        
        <circle
          cx="46"
          cy="22"
          r="3"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M28 28 C28 28 30 26 32 26 C34 26 36 28 36 28 C36 28 34 30 32 30 C30 30 28 28 28 28"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M18 32 C18 32 20 36 20 44 L20 48 L22 48 L22 44 C22 38 24 34 26 32"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M46 32 C46 32 44 36 44 44 L44 48 L42 48 L42 44 C42 38 40 34 38 32"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M24 48 L24 56 C24 58 26 58 28 56 L28 48"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M40 48 L40 56 C40 58 38 58 36 56 L36 48"
          fill="url(#athenaGoldGradient)"
        />
        
        <path
          d="M28 32 L32 36 L36 32"
          stroke="url(#athenaGoldGradient)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
