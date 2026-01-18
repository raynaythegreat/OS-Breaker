"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DeploymentProvider = "vercel" | "render";

const STORAGE_KEY = "gatekeep-deploy-provider";

interface DeploymentContextValue {
  provider: DeploymentProvider;
  setProvider: (provider: DeploymentProvider) => void;
}

const DeploymentContext = createContext<DeploymentContextValue | null>(null);

function isDeploymentProvider(value: unknown): value is DeploymentProvider {
  return value === "vercel" || value === "render";
}

export function DeploymentProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<DeploymentProvider>("vercel");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isDeploymentProvider(stored)) {
        setProviderState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setProvider = (next: DeploymentProvider) => {
    setProviderState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const value = useMemo(() => ({ provider, setProvider }), [provider]);

  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>;
}

export function useDeploymentProvider(): DeploymentContextValue {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error("useDeploymentProvider must be used within DeploymentProvider");
  }
  return context;
}
