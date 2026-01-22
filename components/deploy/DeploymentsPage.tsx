"use client";

import { useMemo } from "react";
import { useDeploymentProvider } from "@/contexts/DeploymentContext";
import VercelDeploymentsPage from "@/components/vercel/DeploymentsPage";
import RenderDeploymentsPage from "@/components/render/DeploymentsPage";

export default function DeploymentsPage() {
  const { provider, setProvider } = useDeploymentProvider();

  const tabs = useMemo(
    () => [
      { id: "vercel" as const, label: "Vercel" },
      { id: "render" as const, label: "Render" },
    ],
    []
  );

  return (
    <div className="h-full flex flex-col bg-surface-50 dark:bg-black">
      <div className="px-6 pt-6">
        <div className="inline-flex rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProvider(tab.id)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                provider === tab.id
                  ? "bg-gold-500 text-white shadow-sm"
                  : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {provider === "render" ? <RenderDeploymentsPage /> : <VercelDeploymentsPage />}
      </div>
    </div>
  );
}