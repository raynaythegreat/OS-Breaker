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
          "Vercel is not configured. Set VERCEL_TOKEN in your hosting environment variables (or .env.local locally)."
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
        "Vercel is not configured. Set VERCEL_TOKEN in your hosting environment variables (or .env.local locally)."
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
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Vercel Status */}
        {vercelConfigured === false && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300">Vercel Not Configured</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Set <code className="px-1 py-0.5 bg-amber-100/60 rounded">VERCEL_TOKEN</code> in your hosting environment
                  Variables (or <code className="px-1 py-0.5 bg-amber-100/60 rounded">.env.local</code> locally) to
                  enable deployments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deploy Progress */}
        {deployProgress && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-medium">
                Deploying ({deployProgress.attempt}/{deployProgress.total}): {deployProgress.strategyLabel}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {deployProgress.state ? `Status: ${deployProgress.state}` : "Starting…"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {deployProgress.inspectorUrl && (
                <a
                  href={deployProgress.inspectorUrl}
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

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Deploy Success */}
        {deployResult && (
          <div className="mb-6 p-4 sm:p-6 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1">Deployment Ready!</h4>
                <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                  Your project <strong>{deployResult.projectName}</strong> is live.
                </p>
                <a
                  href={deployResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Deploy to Vercel</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Select a GitHub repository below to deploy it to Vercel. Your app will be live in minutes.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Automatic HTTPS
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
              Global CDN
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 bg-purple-500 rounded-full" />
              Auto Git Deploys
            </div>
          </div>
        </div>

        {/* Repos Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">No repositories available</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {repos.slice(0, 20).map((repo) => (
              <div
                key={repo.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">{repo.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{repo.full_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deployToVercel(repo, false)}
                      disabled={deploying === repo.full_name || !vercelConfigured}
                      className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                    >
                      {deploying === repo.full_name ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Configure & Deploy
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white min-w-0 truncate">
                  Configure Deployment: {deploymentConfig.repo.name}
                </h3>
                <button
                  onClick={closeConfigModal}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Framework */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Framework (optional - auto-detected if empty)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.framework || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, framework: e.target.value })}
                    placeholder="nextjs, vite, create-react-app, etc."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Build Command */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Build Command (optional)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.buildCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, buildCommand: e.target.value })}
                    placeholder="npm run build"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Install Command */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Install Command (optional)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.installCommand || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, installCommand: e.target.value })}
                    placeholder="npm install"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Output Directory */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Output Directory (optional)
                  </label>
                  <input
                    type="text"
                    value={deploymentConfig.outputDirectory || ""}
                    onChange={(e) => setDeploymentConfig({ ...deploymentConfig, outputDirectory: e.target.value })}
                    placeholder="dist, build, out, etc."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Root Directory */}
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

                {/* Environment Variables */}
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
                        <div
                          key={index}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
                        >
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

              <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-3">
                <button
                  onClick={closeConfigModal}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deployWithConfig}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 76 65" fill="currentColor">
                    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                  </svg>
                  Deploy to Vercel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
