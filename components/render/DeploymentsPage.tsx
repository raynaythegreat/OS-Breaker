"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildRenderDeployStrategies,
  startRenderDeploy,
  waitForRenderDeployment,
  type RenderEnvironmentVariable,
} from "@/lib/render-deploy";
import { getRepoRootDirectoryCandidates } from "@/lib/vercel-deploy";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
}

interface DeployResult {
  serviceId: string;
  serviceName: string;
  deployId: string;
  url: string | null;
  status: string;
  dashboardUrl?: string | null;
  logsUrl?: string | null;
}

interface DeploymentConfig {
  repo: Repository;
  environmentVariables: RenderEnvironmentVariable[];
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
}

function isSuccessStatus(status: string) {
  const value = status.trim().toLowerCase();
  return value === "live" || value === "success" || value === "succeeded" || value === "deployed";
}

export default function RenderDeploymentsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderConfigured, setRenderConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig | null>(null);
  const [deployProgress, setDeployProgress] = useState<{
    attempt: number;
    total: number;
    strategyLabel: string;
    deployId?: string;
    status?: string;
    logsUrl?: string | null;
  } | null>(null);

  const deployAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reposRes, statusRes] = await Promise.all([fetch("/api/github/repos"), fetch("/api/status")]);
      const reposData = await reposRes.json();
      const statusData = await statusRes.json();
      setRepos(reposData.repos || []);
      setRenderConfigured(Boolean(statusData.render?.configured));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (repo: Repository) => {
    setDeploymentConfig({
      repo,
      environmentVariables: [],
      buildCommand: undefined,
      startCommand: undefined,
      rootDirectory: undefined,
    });
    setShowConfigModal(true);
  };

  const closeConfigModal = () => {
    setShowConfigModal(false);
    setDeploymentConfig(null);
  };

  const addEnvironmentVariable = () => {
    if (!deploymentConfig) return;
    setDeploymentConfig({
      ...deploymentConfig,
      environmentVariables: [...deploymentConfig.environmentVariables, { key: "", value: "" }],
    });
  };

  const removeEnvironmentVariable = (index: number) => {
    if (!deploymentConfig) return;
    setDeploymentConfig({
      ...deploymentConfig,
      environmentVariables: deploymentConfig.environmentVariables.filter((_, i) => i !== index),
    });
  };

  const updateEnvironmentVariable = (index: number, field: keyof RenderEnvironmentVariable, value: string) => {
    if (!deploymentConfig) return;
    const updated = [...deploymentConfig.environmentVariables];
    updated[index] = { ...updated[index], [field]: value };
    setDeploymentConfig({ ...deploymentConfig, environmentVariables: updated });
  };

  const deployWithAutoRetry = useCallback(
    async (
      repo: Repository,
      options: {
        environmentVariables?: RenderEnvironmentVariable[];
        buildCommand?: string;
        startCommand?: string;
        rootDirectory?: string;
      } = {}
    ) => {
      if (!renderConfigured) {
        setError(
          "Render is not configured. Set RENDER_API_KEY in your hosting environment variables (or .env.local locally)."
        );
        return;
      }

      deployAbortControllerRef.current?.abort();
      const controller = new AbortController();
      deployAbortControllerRef.current = controller;

      setDeploying(repo.full_name);
      setError(null);
      setDeployResult(null);
      setDeployProgress(null);

      try {
        const rootDirectoryCandidates = await getRepoRootDirectoryCandidates(repo.full_name, {
          signal: controller.signal,
        });

        const strategies = buildRenderDeployStrategies({
          repository: repo.full_name,
          serviceName: repo.name,
          branch: repo.default_branch || "main",
          environmentVariables: options.environmentVariables,
          buildCommand: options.buildCommand,
          startCommand: options.startCommand,
          rootDirectory: options.rootDirectory,
          rootDirectoryCandidates,
        });

        const total = strategies.length;
        let lastFailure: string | null = null;

        for (let index = 0; index < strategies.length; index += 1) {
          const strategy = strategies[index];
          setDeployProgress({
            attempt: index + 1,
            total,
            strategyLabel: strategy.label,
          });

          try {
            const started = await startRenderDeploy(strategy.body, { signal: controller.signal });
            setDeployProgress((prev) =>
              prev ? { ...prev, deployId: started.deployId, status: started.status, logsUrl: started.logsUrl || null } : null
            );

            const finalDeployment = await waitForRenderDeployment(started.deployId, {
              signal: controller.signal,
              onUpdate: (deployment) => {
                setDeployProgress((prev) =>
                  prev ? { ...prev, status: deployment.status, logsUrl: deployment.logsUrl || prev.logsUrl || null } : null
                );
              },
            });

            if (isSuccessStatus(finalDeployment.status)) {
              setDeployResult({
                serviceId: started.serviceId,
                serviceName: started.serviceName,
                deployId: started.deployId,
                url: started.url,
                status: finalDeployment.status,
                dashboardUrl: started.dashboardUrl,
                logsUrl: started.logsUrl,
              });
              setDeployProgress(null);
              if (started.url) {
                window.open(started.url, "_blank", "noopener,noreferrer");
              } else if (started.dashboardUrl) {
                window.open(started.dashboardUrl, "_blank", "noopener,noreferrer");
              }
              return;
            }

            lastFailure = `${strategy.label} failed (status=${finalDeployment.status})`;
          } catch (attemptError) {
            if ((attemptError as Error).name === "AbortError") throw attemptError;
            const message = attemptError instanceof Error ? attemptError.message : "Deployment attempt failed";
            lastFailure = `${strategy.label} failed (${message})`;
          }
        }

        throw new Error(lastFailure || "Deployment failed after multiple attempts");
      } catch (deployError) {
        if ((deployError as Error).name === "AbortError") return;
        setError(deployError instanceof Error ? deployError.message : "Deployment failed");
      } finally {
        setDeploying(null);
        deployAbortControllerRef.current = null;
      }
    },
    [renderConfigured]
  );

  const deployToRender = async (repo: Repository, quickDeploy = false) => {
    if (!renderConfigured) {
      setError(
        "Render is not configured. Set RENDER_API_KEY in your hosting environment variables (or .env.local locally)."
      );
      return;
    }

    if (!quickDeploy) {
      openConfigModal(repo);
      return;
    }

    await deployWithAutoRetry(repo);
  };

  const deployWithConfig = async () => {
    if (!deploymentConfig) return;

    closeConfigModal();
    await deployWithAutoRetry(deploymentConfig.repo, {
      environmentVariables: deploymentConfig.environmentVariables.filter((env) => env.key && env.value),
      buildCommand: deploymentConfig.buildCommand || undefined,
      startCommand: deploymentConfig.startCommand || undefined,
      rootDirectory: deploymentConfig.rootDirectory || undefined,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-surface-50 dark:bg-black">
      <div className="max-w-4xl mx-auto">
        {renderConfigured === false && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Render Not Configured</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Set <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded">RENDER_API_KEY</code> in your environment to enable deployments.
                </p>
              </div>
            </div>
          </div>
        )}

        {deployProgress && (
          <div className="mb-6 p-4 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 flex items-center justify-between gap-3 flex-wrap shadow-sm">
            <div>
              <div className="font-semibold text-sm">
                Deploying ({deployProgress.attempt}/{deployProgress.total}): <span className="text-gold-600 dark:text-gold-400">{deployProgress.strategyLabel}</span>
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 uppercase font-medium">
                {deployProgress.status ? `Status: ${deployProgress.status}` : "Initializing…"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deployProgress.logsUrl && (
                <a
                  href={deployProgress.logsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-medium hover:bg-surface-200 transition-all"
                >
                  View Logs
                </a>
              )}
              <button
                onClick={() => {
                  deployAbortControllerRef.current?.abort();
                  deployAbortControllerRef.current = null;
                  setDeployProgress(null);
                  setDeploying(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 text-xs font-medium hover:bg-surface-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {deployResult && (
          <div className="mb-6 p-4 sm:p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-1">Deployment Started</h3>
                <p className="text-emerald-800 dark:text-emerald-300 text-sm mb-4">
                  Service <strong>{deployResult.serviceName}</strong> is now building on Render.
                </p>
                <div className="flex flex-wrap gap-2">
                  {deployResult.url && (
                    <a
                      href={deployResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Open Application
                    </a>
                  )}
                  {deployResult.dashboardUrl && (
                    <a
                      href={deployResult.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-surface-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-all shadow-sm"
                    >
                      Dashboard
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-surface-200 dark:border-surface-800">
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Deploy to Render</h3>
            <p className="text-surface-600 dark:text-surface-400 text-sm">
              Connect your GitHub projects to Render for reliable hosting.
            </p>
          </div>

          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {loading ? (
              <div className="p-12 text-center">
                 <svg className="animate-spin h-6 w-6 text-gold-500 mx-auto" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-surface-500 mt-4 text-sm">Scanning repositories…</p>
              </div>
            ) : repos.length === 0 ? (
              <div className="p-12 text-center text-surface-500 text-sm">No GitHub repositories found.</div>
            ) : (
              repos.map((repo) => (
                <div key={repo.id} className="p-4 sm:p-6 flex items-center justify-between gap-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-surface-900 dark:text-white truncate">{repo.name}</div>
                    <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 uppercase font-medium tracking-wider">Branch: {repo.default_branch}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => deployToRender(repo, true)}
                      disabled={deploying === repo.full_name || !renderConfigured}
                      className="px-4 py-2 rounded-lg bg-gold-500 text-white text-sm font-medium hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                      Quick Deploy
                    </button>
                    <button
                      onClick={() => deployToRender(repo, false)}
                      disabled={deploying === repo.full_name || !renderConfigured}
                      className="px-4 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-sm font-medium hover:bg-surface-200 dark:hover:bg-surface-700 disabled:opacity-50 transition-colors border border-surface-200 dark:border-surface-700"
                    >
                      Config
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showConfigModal && deploymentConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeConfigModal}
            role="button"
            tabIndex={-1}
            aria-label="Close"
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-surface-900 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-surface-200 dark:border-surface-800">
              <h3 className="text-xl font-bold text-surface-900 dark:text-white">Configure Deployment</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 font-mono">{deploymentConfig.repo.full_name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest mb-2">
                    Build Command
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.buildCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, buildCommand: e.target.value })}
                    placeholder="e.g. npm run build"
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest mb-2">
                    Start Command
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.startCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, startCommand: e.target.value })}
                    placeholder="e.g. npm run start"
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest mb-2">
                  Root Directory
                </label>
                <input
                  type="text"
                  value={deploymentConfig.rootDirectory || ""}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, rootDirectory: e.target.value })}
                  placeholder="./"
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest">
                    Environment Variables
                  </label>
                  <button
                    onClick={addEnvironmentVariable}
                    className="text-xs font-bold text-gold-600 dark:text-gold-400 hover:underline"
                  >
                    + Add Key-Value Pair
                  </button>
                </div>

                {deploymentConfig.environmentVariables.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-surface-200 dark:border-surface-700 text-center">
                    <p className="text-xs text-surface-500">No custom environment variables defined.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deploymentConfig.environmentVariables.map((envVar, index) => (
                      <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                        <input
                          type="text"
                          value={envVar.key}
                          onChange={(e) => updateEnvironmentVariable(index, "key", e.target.value)}
                          placeholder="KEY"
                          className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => updateEnvironmentVariable(index, "value", e.target.value)}
                          placeholder="Value"
                          className="px-4 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        />
                        <button
                          onClick={() => removeEnvironmentVariable(index)}
                          className="p-2.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove variable"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeConfigModal}
                className="px-5 py-2 text-sm font-medium rounded-lg text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deployWithConfig}
                className="px-6 py-2 text-sm font-bold rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-all shadow-sm"
              >
                Start Deployment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}