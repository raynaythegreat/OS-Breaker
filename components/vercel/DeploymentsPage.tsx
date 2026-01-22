"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  buildVercelDeployStrategies,
  getRepoRootDirectoryCandidates,
  startVercelDeploy,
  waitForVercelDeployment,
  type VercelEnvironmentVariable,
} from "@/lib/vercel-deploy";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
}

interface DeployResult {
  projectId: string;
  projectName: string;
  deploymentId: string;
  url: string;
  status: string;
  inspectorUrl?: string;
  strategy?: number;
  retriesUsed?: number;
}

interface DeploymentConfig {
  repo: Repository;
  environmentVariables: VercelEnvironmentVariable[];
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  rootDirectory?: string;
}

export default function DeploymentsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vercelConfigured, setVercelConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig | null>(null);
  const [deployProgress, setDeployProgress] = useState<{
    attempt: number;
    total: number;
    strategyLabel: string;
    deploymentId?: string;
    state?: string;
    inspectorUrl?: string;
    errorCode?: string | null;
    errorMessage?: string | null;
  } | null>(null);
  const deployAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reposRes, statusRes] = await Promise.all([
        fetch("/api/github/repos"),
        fetch("/api/status"),
      ]);
      const reposData = await reposRes.json();
      const statusData = await statusRes.json();
      setRepos(reposData.repos || []);
      setVercelConfigured(statusData.vercel?.configured || false);
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (repo: Repository) => {
    setDeploymentConfig({
      repo,
      environmentVariables: [],
      framework: undefined,
      buildCommand: undefined,
      installCommand: undefined,
      outputDirectory: undefined,
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
      environmentVariables: [
        ...deploymentConfig.environmentVariables,
        { key: "", value: "", target: ["production", "preview", "development"] },
      ],
    });
  };

  const removeEnvironmentVariable = (index: number) => {
    if (!deploymentConfig) return;
    setDeploymentConfig({
      ...deploymentConfig,
      environmentVariables: deploymentConfig.environmentVariables.filter((_, i) => i !== index),
    });
  };

  const updateEnvironmentVariable = (
    index: number,
    field: keyof VercelEnvironmentVariable,
    value: string | string[]
  ) => {
    if (!deploymentConfig) return;
    const updated = [...deploymentConfig.environmentVariables];
    updated[index] = { ...updated[index], [field]: value };
    setDeploymentConfig({
      ...deploymentConfig,
      environmentVariables: updated,
    });
  };

  const deployWithAutoRetry = useCallback(
    async (
      repo: Repository,
      options: {
        environmentVariables?: VercelEnvironmentVariable[];
        framework?: string;
        buildCommand?: string;
        installCommand?: string;
        outputDirectory?: string;
        rootDirectory?: string;
      } = {}
    ) => {
      if (!vercelConfigured) {
        setError(
          "Vercel is not configured. Set VERCEL_TOKEN in your environment to enable deployments."
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

        const strategies = buildVercelDeployStrategies({
          repository: repo.full_name,
          projectName: repo.name,
          branch: repo.default_branch || "main",
          environmentVariables: options.environmentVariables,
          framework: options.framework,
          buildCommand: options.buildCommand,
          installCommand: options.installCommand,
          outputDirectory: options.outputDirectory,
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
            const started = await startVercelDeploy(strategy.body, { signal: controller.signal });
            setDeployProgress((prev) =>
              prev
                ? {
                    ...prev,
                    deploymentId: started.deploymentId,
                    state: started.status,
                    inspectorUrl: started.inspectorUrl,
                  }
                : null
            );

            const finalDeployment = await waitForVercelDeployment(started.deploymentId, {
              signal: controller.signal,
              onUpdate: (deployment) => {
                setDeployProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        state: deployment.state,
                        inspectorUrl: deployment.inspectorUrl || prev.inspectorUrl,
                        errorCode: deployment.errorCode ?? prev.errorCode ?? null,
                        errorMessage: deployment.errorMessage ?? prev.errorMessage ?? null,
                      }
                    : null
                );
              },
            });

            if (finalDeployment.state === "READY") {
              const url = finalDeployment.url.startsWith("http")
                ? finalDeployment.url
                : `https://${finalDeployment.url}`;
              setDeployResult({
                ...started,
                url,
                status: finalDeployment.state,
                inspectorUrl: finalDeployment.inspectorUrl || started.inspectorUrl,
              });
              setDeployProgress(null);
              if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
              }
              return;
            }

            const errorDetails = [
              finalDeployment.errorCode ? `code=${finalDeployment.errorCode}` : null,
              finalDeployment.errorMessage ? finalDeployment.errorMessage : null,
              `state=${finalDeployment.state}`,
            ]
              .filter(Boolean)
              .join(" • ");
            lastFailure = `${strategy.label} failed (${errorDetails})`;
          } catch (attemptError) {
            if ((attemptError as Error).name === "AbortError") {
              throw attemptError;
            }
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
    [vercelConfigured]
  );

  const deployToVercel = async (repo: Repository, quickDeploy = false) => {
    if (!vercelConfigured) {
      setError(
        "Vercel is not configured. Set VERCEL_TOKEN in your environment to enable deployments."
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
      framework: deploymentConfig.framework || undefined,
      buildCommand: deploymentConfig.buildCommand || undefined,
      installCommand: deploymentConfig.installCommand || undefined,
      outputDirectory: deploymentConfig.outputDirectory || undefined,
      rootDirectory: deploymentConfig.rootDirectory || undefined,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-surface-50 dark:bg-black">
      <div className="max-w-4xl mx-auto">
        {/* Vercel Status */}
        {vercelConfigured === false && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Vercel Not Configured</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Set <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/50 rounded">VERCEL_TOKEN</code> in your environment to enable deployments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deploy Progress */}
        {deployProgress && (
          <div className="mb-6 p-4 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-900 dark:text-surface-100 flex items-center justify-between gap-3 flex-wrap shadow-sm">
            <div>
              <div className="font-semibold text-sm">
                Deploying ({deployProgress.attempt}/{deployProgress.total}): <span className="text-gold-600 dark:text-gold-400">{deployProgress.strategyLabel}</span>
              </div>
              <div className="text-xs text-surface-500 dark:text-surface-400 mt-1 uppercase font-medium">
                {deployProgress.state ? `Status: ${deployProgress.state}` : "Initializing…"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deployProgress.inspectorUrl && (
                <a
                  href={deployProgress.inspectorUrl}
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

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Deploy Success */}
        {deployResult && (
          <div className="mb-6 p-4 sm:p-6 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1">Deployment Ready!</h4>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-4">
                  Your project <strong>{deployResult.projectName}</strong> is now live on Vercel.
                </p>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  View Deployment
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Deploy Instructions */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-4 sm:p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Deploy to Vercel</h3>
          <p className="text-surface-600 dark:text-surface-400 text-sm mb-6">
            Push your code to the edge. Select a repository to launch your application globally.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              Auto HTTPS
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300">
              <span className="w-2 h-2 bg-sky-500 rounded-full" />
              Global CDN
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 dark:bg-surface-800 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              Git Integration
            </div>
          </div>
        </div>

        {/* Repos Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
             <svg className="animate-spin h-6 w-6 text-gold-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-surface-500 text-sm">No repositories available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {repos.slice(0, 20).map((repo) => (
              <div
                key={repo.id}
                className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-surface-900 dark:text-white truncate">{repo.name}</h4>
                    <p className="text-xs text-surface-500 mt-1 uppercase font-medium tracking-wider">{repo.full_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deployToVercel(repo, false)}
                      disabled={deploying === repo.full_name || !vercelConfigured}
                      className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                    >
                      {deploying === repo.full_name ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Wait...
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" viewBox="0 0 76 65" fill="currentColor">
                            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                          </svg>
                          Deploy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Configuration Modal */}
        {showConfigModal && deploymentConfig && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-surface-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 px-6 py-5 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-surface-900 dark:text-white min-w-0 truncate">
                  Deploy Configuration: {deploymentConfig.repo.name}
                </h3>
                <button
                  onClick={closeConfigModal}
                  className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Framework */}
                <div>
                  <label className="block text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest mb-2">
                    Framework Preset
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.framework || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, framework: e.target.value })}
                    placeholder="e.g. nextjs, vite, create-react-app"
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>

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
                      Install Command
                    </label>
                    <input
                      type="text"
                      value={deploymentConfig.installCommand || ""}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, installCommand: e.target.value })}
                      placeholder="e.g. npm install"
                      className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-widest mb-2">
                      Output Directory
                    </label>
                    <input
                      type="text"
                      value={deploymentConfig.outputDirectory || ""}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, outputDirectory: e.target.value })}
                      placeholder="e.g. dist, .next, out"
                      className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    />
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
                    <div className="space-y-4">
                      {deploymentConfig.environmentVariables.map((envVar, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
                        >
                          <input
                            type="text"
                            value={envVar.key}
                            onChange={(e) => updateEnvironmentVariable(index, "key", e.target.value)}
                            placeholder="KEY"
                            className="px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                          />
                          <input
                            type="text"
                            value={envVar.value}
                            onChange={(e) => updateEnvironmentVariable(index, "value", e.target.value)}
                            placeholder="Value"
                            className="px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                          />
                          <button
                            onClick={() => removeEnvironmentVariable(index)}
                            className="p-2.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Remove variable"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                  className="px-6 py-2 text-sm font-bold rounded-lg bg-gold-500 text-white hover:bg-gold-600 transition-all shadow-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 76 65" fill="currentColor">
                    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                  </svg>
                  Confirm & Deploy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}