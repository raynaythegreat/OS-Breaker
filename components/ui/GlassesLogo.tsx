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
      <path
        d="M14 54V26C14 15.4 22.4 7 33 7h-2C20.4 7 12 15.4 12 26v28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M50 54V26C50 15.4 41.6 7 31 7h2C43.6 7 52 15.4 52 26v28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M18 54V24C18 17.4 23.4 12 30 12h4c6.6 0 12 5.4 12 12v30"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path d="M32 16V54" stroke="currentColor" strokeWidth="4" />
      <path d="M22 28V52" stroke="currentColor" strokeWidth="3" />
      <path d="M27 28V52" stroke="currentColor" strokeWidth="3" />
      <path d="M37 28V52" stroke="currentColor" strokeWidth="3" />
      <path d="M42 28V52" stroke="currentColor" strokeWidth="3" />
      <path d="M22 28H42" stroke="currentColor" strokeWidth="3" />
      <path d="M24 22H40" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
