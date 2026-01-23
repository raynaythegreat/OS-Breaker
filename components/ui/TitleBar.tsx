"use client";

import { useEffect, useState, CSSProperties } from "react";

 declare global {
   interface Window {
     api?: {
       minimize: () => void;
       maximize: () => void;
       close: () => void;
       getFileAccessStatus: () => Promise<{ enabled: boolean; directories: string[] }>;
       toggleFileAccess: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
       readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
       writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
       listDirectory: (path: string) => Promise<{ success: boolean; files?: any[]; error?: string }>;
       getFileStats: (path: string) => Promise<{ success: boolean; stats?: any; error?: string }>;
       selectDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
     };
   }
 }

interface DragStyles extends CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag';
}

export default function TitleBar() {
  const [isDark, setIsDark] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleMinimize = () => {
    if (typeof window !== "undefined" && window.api) {
      window.api.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== "undefined" && window.api) {
      setIsMaximized(!isMaximized);
      window.api.maximize();
    }
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.api) {
      window.api.close();
    }
  };

  const dragStyle: DragStyles = {
    WebkitAppRegion: 'drag',
    userSelect: 'none'
  };

  const noDragStyle: DragStyles = {
    WebkitAppRegion: 'no-drag'
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 border-b-2 border-gold-500/20 bg-gradient-to-b from-surface-100 to-surface-50 dark:from-surface-900 dark:to-surface-950 backdrop-blur-sm"
      style={dragStyle}
    >
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 transition-transform hover:scale-110 duration-200"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFC107" />
              <stop offset="100%" stopColor="#FFB300" />
            </linearGradient>
          </defs>
          <g>
            <ellipse cx="32" cy="30" rx="18" ry="14" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="24" cy="28" r="6" fill="url(#goldGradient)" />
            <circle cx="40" cy="28" r="6" fill="url(#goldGradient)" />
            <circle cx="24" cy="28" r="2.5" fill="currentColor" />
            <circle cx="40" cy="28" r="2.5" fill="currentColor" />
            <circle cx="25" cy="26" r="1" fill="url(#goldGradient)" />
            <circle cx="39" cy="26" r="1" fill="url(#goldGradient)" />
          </g>
        </svg>
        <span className="text-sm font-bold text-foreground tracking-tight">OS Athena</span>
      </div>

      <div
        className="flex items-center gap-1.5"
        style={noDragStyle}
      >
        <button
          onClick={handleMinimize}
          onMouseEnter={() => setHoveredButton('minimize')}
          onMouseLeave={() => setHoveredButton(null)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border-2 border-transparent ${
            hoveredButton === 'minimize'
              ? 'bg-surface-200 dark:bg-surface-700 border-gold-500/30 scale-105'
              : 'hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
          title="Minimize"
          aria-label="Minimize"
        >
          <svg className="w-3.5 h-3.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="2" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border-2 border-transparent ${
            hoveredButton === 'maximize'
              ? 'bg-surface-200 dark:bg-surface-700 border-gold-500/30 scale-105'
              : 'hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="8" width="12" height="12" rx="1" />
              <path d="M8 6h10a2 2 0 0 1 2 2v10" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="14" height="14" rx="1" />
            </svg>
          )}
        </button>
        <button
          onClick={handleClose}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 border-2 border-transparent ${
            hoveredButton === 'close'
              ? 'bg-red-500 border-red-600 scale-105 text-white'
              : 'hover:bg-red-500/20 dark:hover:bg-red-500/30'
          }`}
          title="Close"
          aria-label="Close"
        >
          <svg className="w-3.5 h-3.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
