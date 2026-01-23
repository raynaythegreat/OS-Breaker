"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useApiUsage, Provider } from "@/contexts/ApiUsageContext";

interface ApiUsageDisplayProps {
  currentProvider: Provider;
  compact?: boolean;
}

function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(value >= 100 ? 0 : 2)}`;
}

function getUsageColor(current: number, limit: number): string {
  if (!Number.isFinite(limit)) return "text-emerald-600 dark:text-emerald-400";
  const ratio = current / limit;
  if (ratio >= 0.9) return "text-red-600 dark:text-red-400";
  if (ratio >= 0.7) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function getProgressColor(current: number, limit: number): string {
  if (!Number.isFinite(limit)) return "bg-emerald-500";
  const ratio = current / limit;
  if (ratio >= 0.9) return "bg-red-500";
  if (ratio >= 0.7) return "bg-amber-500";
  return "bg-emerald-500";
}

const providerLabels: Record<Provider, string> = {
  claude: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  opencodezen: "OpenCode Zen",
  fireworks: "Fireworks",
  mistral: "Mistral",
  cohere: "Cohere",
  perplexity: "Perplexity",
  zai: "Z.ai",
};

const providerIcons: Record<Provider, React.ReactNode> = {
  claude: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  openai: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  ),
  gemini: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 19.7778H22L12 2ZM12 5.68889L17.5111 16H6.48889L12 5.68889Z" />
    </svg>
  ),
  groq: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3A1 1 0 0013 14v-7z" />
    </svg>
  ),
  openrouter: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  ollama: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  opencodezen: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    </svg>
  ),
  fireworks: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.6 4.9 5.1.1-4.1 3 1.6 4.9-4.2-3-4.2 3 1.6-4.9-4.1-3 5.1-.1L12 2z" />
    </svg>
  ),
  mistral: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.82l7 3.5v7l-7-3.5v-7zm16 0v7l-7 3.5v-7l7-3.5z" />
    </svg>
  ),
  cohere: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  ),
  perplexity: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l9.6 5.5v11L12 24l-9.6-5.5v-11L12 2zm0 2.3l-7.2 4.2v8.4L12 21.7l7.2-4.2V8.5L12 4.3z" />
    </svg>
  ),
  zai: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
};

export default function ApiUsageDisplay({
  currentProvider,
  compact = false,
}: ApiUsageDisplayProps) {
  const { usage, limits, getProviderUsage } = useApiUsage();
  const [expanded, setExpanded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const currentUsage = getProviderUsage(currentProvider);
  const currentLimits = limits[currentProvider];
  const isUnlimited = !Number.isFinite(currentLimits.daily);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const usageOverlay = expanded ? (
    <div className="fixed inset-0 z-[999]" onClick={() => setExpanded(false)}>
      <div
        className="absolute top-16 right-4 z-[1000]"
        onClick={(e) => e.stopPropagation()}
      >
        <ApiUsagePanel
          currentProvider={currentProvider}
          onClose={() => setExpanded(false)}
        />
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="relative inline-flex">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors border border-surface-200 dark:border-surface-700 shadow-sm"
          title={`${providerLabels[currentProvider]}: ${currentUsage.today}${isUnlimited ? "" : `/${currentLimits.daily}`} today`}
        >
          <span className="text-gold-500">{providerIcons[currentProvider]}</span>
          <span
            className={`font-medium ${getUsageColor(currentUsage.today, currentLimits.daily)}`}
          >
            {currentUsage.today}
            {isUnlimited ? "" : `/${currentLimits.daily}`}
          </span>
        </button>
        {usageOverlay &&
          (isClient ? createPortal(usageOverlay, document.body) : usageOverlay)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 hover:border-gold-500/50 transition-all shadow-sm"
      >
        <span className="text-gold-500">{providerIcons[currentProvider]}</span>
        <span className="font-semibold">{providerLabels[currentProvider]}</span>
        <span className="text-surface-300 dark:text-surface-600">|</span>
        <span
          className={getUsageColor(currentUsage.today, currentLimits.daily)}
        >
          {currentUsage.today}
          {isUnlimited ? "" : `/${currentLimits.daily}`}
        </span>
        <span className="text-surface-500 dark:text-surface-400">today</span>
        <svg
          className={`w-3.5 h-3.5 text-surface-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {usageOverlay &&
        (isClient ? createPortal(usageOverlay, document.body) : usageOverlay)}
    </div>
  );
}

function ApiUsagePanel({
  currentProvider,
  onClose,
}: {
  currentProvider: Provider;
  onClose: () => void;
}) {
  const { usage, limits, billing, rateLimits, refreshBilling, resetUsage } =
    useApiUsage();
  const [refreshing, setRefreshing] = useState(false);
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const providers: Provider[] = [
    "claude",
    "openai",
    "gemini",
    "groq",
    "openrouter",
    "ollama",
    "opencodezen",
    "fireworks",
    "mistral",
    "perplexity",
    "zai",
  ];

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (data?.ollama) {
          setOllamaReachable(data.ollama.reachable ?? null);
          setOllamaError(data.ollama.error ?? null);
        }
      } catch {
        // ignore
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-80 sm:w-96 max-h-[calc(100vh-6rem)] flex flex-col p-5 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wider">
          API Usage
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              try {
                await refreshBilling();
              } finally {
                setRefreshing(false);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition-colors disabled:opacity-50"
            title="Refresh billing"
            disabled={refreshing}
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400 transition-colors"
            title="Close"
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
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {providers.map((provider) => {
          const providerUsage = usage[provider];
          const providerLimits = limits[provider];
          const providerBilling = billing[provider];
          const providerRateLimit = rateLimits[provider];
          const isUnlimited = !Number.isFinite(providerLimits.daily);
          const isCurrent = provider === currentProvider;
          const remainingLabel =
            provider === "ollama"
              ? ollamaReachable === false
                ? "Offline"
                : ollamaReachable === true
                  ? "Connected"
                  : "Checking"
              : provider === "groq"
                ? providerRateLimit?.requests?.remaining != null
                  ? `${providerRateLimit.requests.remaining} req left`
                  : providerBilling?.configured
                    ? "Rate limits pending"
                    : "Not configured"
                : providerBilling?.remainingUsd != null
                  ? `Left ${formatUsd(providerBilling.remainingUsd)}`
                  : providerBilling?.configured
                    ? "Billing unavailable"
                    : "Not configured";

          const note =
            provider === "ollama"
              ? ollamaReachable === false
                ? ollamaError
                  ? `Offline: ${ollamaError}`
                  : "Offline: start Ollama or check OLLAMA_BASE_URL."
                : ollamaReachable === true
                  ? "Connected: unlimited"
                  : "Checking connection…"
              : provider === "groq"
                ? (() => {
                    const requests = providerRateLimit?.requests;
                    const tokens = providerRateLimit?.tokens;
                    const parts: string[] = [];
                    if (
                      requests?.remaining != null ||
                      requests?.limit != null
                    ) {
                      parts.push(
                        `Req: ${requests?.remaining ?? "?"}/${requests?.limit ?? "?"}`,
                      );
                    }
                    if (tokens?.remaining != null || tokens?.limit != null) {
                      parts.push(
                        `Tok: ${tokens?.remaining ?? "?"}/${tokens?.limit ?? "?"}`,
                      );
                    }
                    if (parts.length === 0) {
                      return "Rate limits appear after your first request.";
                    }
                    return parts.join(" • ");
                  })()
                : providerLimits.note;

          return (
            <div
              key={provider}
              className={`p-3.5 rounded-lg border transition-all ${
                isCurrent
                  ? "bg-gold-50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-800"
                  : "bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      isCurrent
                        ? "text-gold-600 dark:text-gold-400"
                        : "text-surface-400 dark:text-surface-500"
                    }
                  >
                    {providerIcons[provider]}
                  </span>
                  <span
                    className={`text-sm font-semibold ${isCurrent ? "text-gold-900 dark:text-gold-100" : "text-surface-700 dark:text-surface-300"}`}
                  >
                    {providerLabels[provider]}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gold-500 text-white uppercase tracking-tighter">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-surface-400 dark:text-surface-500 uppercase">
                    {formatTimeAgo(providerUsage.lastRequest)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-surface-500 dark:text-surface-400 mb-1 font-medium">
                    Requests Today
                  </div>
                  <div
                    className={`font-bold text-base ${getUsageColor(providerUsage.today, providerLimits.daily)}`}
                  >
                    {providerUsage.today}
                    {!isUnlimited && (
                      <span className="text-xs text-surface-400 dark:text-surface-500 font-normal">
                        /{providerLimits.daily}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-surface-500 dark:text-surface-400 mb-1 font-medium">
                    Status / Balance
                  </div>
                  <div className="text-surface-900 dark:text-surface-100 font-bold truncate">
                    {remainingLabel}
                  </div>
                </div>
              </div>

              {!isUnlimited && (
                <div className="mt-3 h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(providerUsage.today, providerLimits.daily)}`}
                    style={{
                      width: `${Math.min(100, (providerUsage.today / providerLimits.daily) * 100)}%`,
                    }}
                  />
                </div>
              )}

              <p className="mt-3 text-[10px] text-surface-500 dark:text-surface-400 leading-relaxed italic">
                {note}
              </p>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (window.confirm("Reset all API usage statistics?")) {
            resetUsage();
          }
        }}
        className="mt-6 w-full py-2 text-xs font-bold text-surface-400 dark:text-surface-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-widest"
      >
        Reset Usage Statistics
      </button>
    </div>
  );
}