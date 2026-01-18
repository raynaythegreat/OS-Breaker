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
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {renderConfigured === false && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
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
                <h4 className="font-medium text-amber-800 dark:text-amber-300">Render Not Configured</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Set <code className="px-1 py-0.5 bg-amber-100/60 rounded">RENDER_API_KEY</code> in your hosting
                  environment variables (or <code className="px-1 py-0.5 bg-amber-100/60 rounded">.env.local</code>{" "}
                  locally) to enable deployments.
                </p>
              </div>
            </div>
          </div>
        )}

        {deployProgress && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">
                Deploying ({deployProgress.attempt}/{deployProgress.total}): {deployProgress.strategyLabel}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {deployProgress.status ? `Status: ${deployProgress.status}` : "Starting…"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deployProgress.logsUrl && (
                <a
                  href={deployProgress.logsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:opacity-90 transition-opacity"
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
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {deployResult && (
          <div className="mb-6 p-4 sm:p-6 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
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
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">Deployment Started</h3>
                <p className="text-green-800 dark:text-green-200 text-sm mb-3">
                  Service <strong>{deployResult.serviceName}</strong> is deploying on Render.
                </p>
                <div className="flex flex-wrap gap-2">
                  {deployResult.url && (
                    <a
                      href={deployResult.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Open App
                    </a>
                  )}
                  {deployResult.dashboardUrl && (
                    <a
                      href={deployResult.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 transition-colors"
                    >
                      Render Dashboard
                    </a>
                  )}
                  {deployResult.logsUrl && (
                    <a
                      href={deployResult.logsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Logs
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Deploy to Render</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Select a GitHub repository below to deploy it to Render.
            </p>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading repositories...</div>
            ) : repos.length === 0 ? (
              <div className="p-6 text-center text-slate-500">No repositories found.</div>
            ) : (
              repos.map((repo) => (
                <div key={repo.id} className="p-4 sm:p-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">{repo.full_name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Branch: {repo.default_branch}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => deployToRender(repo, true)}
                      disabled={deploying === repo.full_name || !renderConfigured}
                      className="px-3 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                      Quick Deploy
                    </button>
                    <button
                      onClick={() => deployToRender(repo, false)}
                      disabled={deploying === repo.full_name || !renderConfigured}
                      className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showConfigModal && deploymentConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeConfigModal}
            role="button"
            tabIndex={-1}
            aria-label="Close"
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configure Render Deployment</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{deploymentConfig.repo.full_name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Build Command (optional)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.buildCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, buildCommand: e.target.value })}
                    placeholder="npm ci && npm run build"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Command (optional)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.startCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, startCommand: e.target.value })}
                    placeholder="npm run start -- -p $PORT"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Root Directory (optional)
                </label>
                <input
                  type="text"
                  value={deploymentConfig.rootDirectory || ""}
                  onChange={(e) => setDeploymentConfig({ ...deploymentConfig, rootDirectory: e.target.value })}
                  placeholder="./"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Environment Variables
                  </label>
                  <button
                    onClick={addEnvironmentVariable}
                    className="px-3 py-1 text-sm font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                  >
                    + Add Variable
                  </button>
                </div>

                {deploymentConfig.environmentVariables.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No environment variables added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {deploymentConfig.environmentVariables.map((envVar, index) => (
                      <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                        <input
                          type="text"
                          value={envVar.key}
                          onChange={(e) => updateEnvironmentVariable(index, "key", e.target.value)}
                          placeholder="KEY"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={envVar.value}
                          onChange={(e) => updateEnvironmentVariable(index, "value", e.target.value)}
                          placeholder="value"
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => removeEnvironmentVariable(index)}
                          className="justify-self-end p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Remove variable"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeConfigModal}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deployWithConfig}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
              >
                Deploy to Render
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

