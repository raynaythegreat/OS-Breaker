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
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProvider(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                provider === tab.id
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

