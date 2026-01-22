"use client";

import { useState } from "react";

interface DeployProgress {
  provider: "vercel" | "render";
  attempt: number;
  total: number;
  strategyLabel: string;
  deploymentId?: string;
  state?: string;
  inspectorUrl?: string;
  logsUrl?: string | null;
}

type DeployResult =
  | {
      provider: "vercel";
      projectName: string;
      deploymentId: string;
      url: string;
      status: string;
    }
  | {
      provider: "render";
      serviceName: string;
      deploymentId: string;
      url: string | null;
      status: string;
      dashboardUrl?: string | null;
      logsUrl?: string | null;
    };

interface ApplyRepoResult {
  commitUrl: string;
  branch: string;
  previewUrl: string | null;
  filesChanged: number;
  operationId: number;
}

interface DeployAutoFixProgress {
  round: number;
  total: number;
  step: string;
  modelLabel?: string;
}

interface NotificationPanelProps {
  // Deployment notifications
  deployProgress?: DeployProgress | null;
  deployResult?: DeployResult | null;
  deployError?: string | null;
  deploying?: boolean;
  onCancelDeploy?: () => void;

  // Commit notifications
  applyRepoResult?: ApplyRepoResult | null;

  // Auto-fix notifications
  deployAutoFixProgress?: DeployAutoFixProgress | null;
  deployAutoFixError?: string | null;
  deployAutoFixing?: boolean;
  onStartAutoFix?: () => void;
  onCancelAutoFix?: () => void;

  // General notifications
  chatError?: string | null;
  fallbackNotice?: string | null;
  onDismissFallback?: () => void;
}

export default function NotificationPanel({
  deployProgress,
  deployResult,
  deployError,
  deploying,
  onCancelDeploy,
  applyRepoResult,
  deployAutoFixProgress,
  deployAutoFixError,
  deployAutoFixing,
  onStartAutoFix,
  onCancelAutoFix,
  chatError,
  fallbackNotice,
  onDismissFallback,
}: NotificationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Count total notifications
  const notificationCount = [
    deployProgress,
    deployResult,
    deployError,
    applyRepoResult,
    deployAutoFixProgress,
    deployAutoFixError,
    chatError,
    fallbackNotice,
  ].filter(Boolean).length;

  if (notificationCount === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 w-[calc(100%-2rem)] md:w-96 max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-surface-900 rounded-t-xl border border-surface-200 dark:border-surface-700 shadow-xl">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors rounded-t-xl"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
            <span className="font-semibold text-sm text-surface-900 dark:text-surface-100">
              Notifications
            </span>
            {notificationCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 text-xs font-medium">
                {notificationCount}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-surface-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Notifications */}
      {isExpanded && (
        <div className="bg-white dark:bg-surface-900 rounded-b-xl border-x border-b border-surface-200 dark:border-surface-700 shadow-xl overflow-y-auto max-h-[calc(60vh-3rem)]">
          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {/* Commit Success */}
            {applyRepoResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 mb-1">
                      Changes Committed
                    </div>
                    <div className="text-sm text-emerald-800 dark:text-emerald-200 mb-2">
                      {applyRepoResult.filesChanged || 0} file{(applyRepoResult.filesChanged || 0) === 1 ? "" : "s"} committed to <strong>{applyRepoResult.branch}</strong>
                    </div>
                    {!applyRepoResult.previewUrl && (
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 mb-2">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ready to deploy (manual). Click Deploy.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <a
                        href={applyRepoResult.commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Commit
                      </a>
                      {applyRepoResult.previewUrl && (
                        <a
                          href={applyRepoResult.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deploy Progress */}
            {deployProgress && (
              <div className="p-4 bg-sky-50 dark:bg-sky-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-sky-600 dark:text-sky-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-sky-900 dark:text-sky-100 mb-1">
                      Deploying ({deployProgress.attempt}/{deployProgress.total})
                    </div>
                    <div className="text-sm text-sky-800 dark:text-sky-200 mb-2">
                      <strong>{deployProgress.strategyLabel}</strong>
                      {deployProgress.state && ` • ${deployProgress.state}`}
                    </div>
                    <div className="flex gap-2">
                      {(deployProgress.inspectorUrl || deployProgress.logsUrl) && (
                        <a
                          href={deployProgress.inspectorUrl || deployProgress.logsUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors"
                        >
                          View Logs
                        </a>
                      )}
                      {onCancelDeploy && (
                        <button
                          onClick={onCancelDeploy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/30 text-sky-900 dark:text-sky-100 text-xs font-medium hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deploy Success */}
            {deployResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-emerald-900 dark:text-emerald-100 mb-1">
                      Deployment Ready
                    </div>
                    <div className="text-sm text-emerald-800 dark:text-emerald-200 mb-2">
                      <strong>
                        {deployResult.provider === "render"
                          ? deployResult.serviceName
                          : deployResult.projectName}
                      </strong>{" "}
                      is live
                    </div>
                    {deployResult.provider === "vercel" ? (
                      <a
                        href={deployResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Deployment
                      </a>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {deployResult.url && (
                          <a
                            href={deployResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                          >
                            View App
                          </a>
                        )}
                        {deployResult.dashboardUrl && (
                          <a
                            href={deployResult.dashboardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-900 dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            Dashboard
                          </a>
                        )}
                        {deployResult.logsUrl && (
                          <a
                            href={deployResult.logsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100 text-xs font-medium hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
                          >
                            Logs
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Auto-fix Progress */}
            {deployAutoFixProgress && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">
                      Auto-fixing ({deployAutoFixProgress.round}/{deployAutoFixProgress.total})
                    </div>
                    <div className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                      {deployAutoFixProgress.step}
                      {deployAutoFixProgress.modelLabel && ` • ${deployAutoFixProgress.modelLabel}`}
                    </div>
                    {onCancelAutoFix && deployAutoFixing && (
                      <button
                        onClick={onCancelAutoFix}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {(deployError || deployAutoFixError || chatError) && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-red-900 dark:text-red-100 mb-1">
                      Error
                    </div>
                    <div className="text-sm text-red-800 dark:text-red-200 mb-3">
                      {deployError || deployAutoFixError || chatError}
                    </div>
                    {deployError && onStartAutoFix && !deployAutoFixing && (
                      <button
                        type="button"
                        onClick={onStartAutoFix}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        Auto-fix Deploy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info/Fallback Notice */}
            {fallbackNotice && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      {fallbackNotice}
                    </div>
                    {onDismissFallback && (
                      <button
                        onClick={onDismissFallback}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}