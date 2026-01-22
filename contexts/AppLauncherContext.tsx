"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface Application {
  id: string;
  name: string;
  icon: string;
  path?: string;
  url?: string;
  description?: string;
  category?: string;
  isInstalled?: boolean;
}

interface AppLauncherContextType {
  apps: Application[];
  addApp: (app: Application) => void;
  removeApp: (id: string) => void;
  updateApp: (id: string, updates: Partial<Application>) => void;
  launchApp: (app: Application) => void;
  refreshApps: () => void;
}

const defaultApps: Application[] = [
  {
    id: "vscode",
    name: "VS Code",
    icon: "💻",
    path: "/usr/bin/code",
    description: "Visual Studio Code",
    category: "Development"
  },
  {
    id: "firefox",
    name: "Firefox",
    icon: "🦊",
    path: "/usr/bin/firefox",
    description: "Web Browser",
    category: "Internet"
  },
  {
    id: "terminal",
    name: "Terminal",
    icon: "🖥️",
    path: "/usr/bin/gnome-terminal",
    description: "Command Line",
    category: "System"
  },
  {
    id: "files",
    name: "Files",
    icon: "📁",
    path: "/usr/bin/nautilus",
    description: "File Manager",
    category: "System"
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: "🎵",
    path: "/usr/bin/spotify",
    description: "Music Streaming",
    category: "Entertainment"
  },
  {
    id: "discord",
    name: "Discord",
    icon: "💬",
    path: "/usr/bin/discord",
    description: "Chat & Voice",
    category: "Communication"
  },
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    url: "https://github.com",
    description: "Code Repository",
    category: "Development"
  },
  {
    id: "settings",
    name: "Settings",
    icon: "⚙️",
    description: "System Settings",
    category: "System"
  }
];

const AppLauncherContext = createContext<AppLauncherContextType | undefined>(undefined);

export function useAppLauncher() {
  const context = useContext(AppLauncherContext);
  if (context === undefined) {
    throw new Error("useAppLauncher must be used within an AppLauncherProvider");
  }
  return context;
}

interface AppLauncherProviderProps {
  children: ReactNode;
}

export function AppLauncherProvider({ children }: AppLauncherProviderProps) {
  const [apps, setApps] = useState<Application[]>(defaultApps);

  const addApp = (app: Application) => {
    setApps(prev => [...prev, { ...app, isInstalled: true }]);
  };

  const removeApp = (id: string) => {
    setApps(prev => prev.filter(app => app.id !== id));
  };

  const updateApp = (id: string, updates: Partial<Application>) => {
    setApps(prev => 
      prev.map(app => 
        app.id === id ? { ...app, ...updates } : app
      )
    );
  };

  const launchApp = (app: Application) => {
    if (app.url) {
      window.open(app.url, "_blank");
    } else if (app.path) {
      // In a real Electron app, you'd use IPC to launch the application
      console.log(`Launching: ${app.path}`);
      // For now, we'll just show an alert
      alert(`Would launch: ${app.name} (${app.path})`);
    } else {
      // Handle special cases like opening settings
      console.log(`Opening: ${app.name}`);
    }
  };

  const refreshApps = () => {
    // In a real Electron app, this would scan for installed applications
    console.log("Refreshing app list...");
  };

  useEffect(() => {
    // Load saved apps from localStorage if available
    const savedApps = localStorage.getItem("os-athena-apps");
    if (savedApps) {
      try {
        const parsedApps = JSON.parse(savedApps);
        setApps([...defaultApps, ...parsedApps]);
      } catch (error) {
        console.error("Failed to load saved apps:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Save custom apps to localStorage
    const customApps = apps.filter(app => !defaultApps.find(defaultApp => defaultApp.id === app.id));
    localStorage.setItem("os-athena-apps", JSON.stringify(customApps));
  }, [apps]);

  const value: AppLauncherContextType = {
    apps,
    addApp,
    removeApp,
    updateApp,
    launchApp,
    refreshApps,
  };

  return (
    <AppLauncherContext.Provider value={value}>
      {children}
    </AppLauncherContext.Provider>
  );
}