"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import GlassesLogo from "@/components/ui/GlassesLogo";

interface SettingsPageProps {
  onLogout: () => void;
}

interface Status {
  runtime?: {
    onVercel: boolean;
    onRender?: boolean;
    vercelEnv: string | null;
    vercelUrl: string | null;
    vercelGitRef: string | null;
  };
  claude: { configured: boolean };
  openai: { configured: boolean };
  gemini: { configured: boolean };
  groq: {
    configured: boolean;
    source?: string | null;
    warning?: string | null;
  };
  openrouter: { configured: boolean };
  fireworks?: { configured: boolean };
  nanobanana?: { configured: boolean };
  ideogram?: { configured: boolean };
  ollama: {
    configured: boolean;
    reachable: boolean | null;
    error: string | null;
    source?: string | null;
    url?: string | null;
    warning?: string | null;
  };
  github: { configured: boolean; username: string | null };
  vercel: { configured: boolean };
  render?: { configured: boolean };
}

export default function SettingsPage({ onLogout }: SettingsPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [groqSyncing, setGroqSyncing] = useState(false);
  const [groqSyncMessage, setGroqSyncMessage] = useState<{
    kind: "success" | "error";
    text: string;
    deploymentUrl?: string | null;
  } | null>(null);
  const [renderSyncing, setRenderSyncing] = useState(false);
  const [renderSyncMessage, setRenderSyncMessage] = useState<{
    kind: "success" | "error";
    text: string;
    deploymentUrl?: string | null;
  } | null>(null);
  const [ollamaRetrying, setOllamaRetrying] = useState(false);
  const [ollamaNgrokStarting, setOllamaNgrokStarting] = useState(false);
  const [ollamaNgrokSyncing, setOllamaNgrokSyncing] = useState(false);
  const [ollamaRetryMessage, setOllamaRetryMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [ollamaNgrokMessage, setOllamaNgrokMessage] = useState<{
    kind: "success" | "error";
    text: string;
    url?: string | null;
    deploymentUrl?: string | null;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncGroqToVercel = useCallback(async () => {
    setGroqSyncing(true);
    setGroqSyncMessage(null);
    try {
      const response = await fetch("/api/groq/sync", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to sync GROQ_API_KEY to Vercel");
      }

      setGroqSyncMessage({
        kind: "success",
        text: "Synced GROQ_API_KEY to Vercel and started a new deployment.",
        deploymentUrl: typeof data?.url === "string" ? data.url : null,
      });

      await fetchStatus();
    } catch (error) {
      setGroqSyncMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to sync GROQ_API_KEY to Vercel",
        deploymentUrl: null,
      });
    } finally {
      setGroqSyncing(false);
    }
  }, [fetchStatus]);

  const syncRenderToVercel = useCallback(async () => {
    setRenderSyncing(true);
    setRenderSyncMessage(null);
    try {
      const response = await fetch("/api/render/sync", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to sync RENDER_API_KEY to Vercel");
      }

      setRenderSyncMessage({
        kind: "success",
        text: "Synced RENDER_API_KEY to Vercel and started a new deployment.",
        deploymentUrl: typeof data?.url === "string" ? data.url : null,
      });

      await fetchStatus();
    } catch (error) {
      setRenderSyncMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to sync RENDER_API_KEY to Vercel",
        deploymentUrl: null,
      });
    } finally {
      setRenderSyncing(false);
    }
  }, [fetchStatus]);

  const retryFetchOllama = useCallback(async () => {
    setOllamaRetrying(true);
    setOllamaRetryMessage(null);
    setOllamaNgrokMessage(null);
    setGroqSyncMessage(null);
    setRenderSyncMessage(null);
    try {
      // Best-effort: when running locally, try to start Ollama + Cloudflare Tunnel.
      const localRetryRes = await fetch("/api/ollama/retry", {
        method: "POST",
      });
      const localRetryData = await localRetryRes.json().catch(() => null);
      const localRetryError =
        localRetryData && typeof localRetryData.error === "string"
          ? (localRetryData.error as string)
          : null;
      const localRetryUnsupported = Boolean(
        localRetryError && /local mac|localhost/i.test(localRetryError),
      );

      const statusResponse = await fetch("/api/status");
      const statusData = (await statusResponse.json()) as Status;
      setStatus(statusData);

      if (!statusData?.ollama?.configured) {
        setOllamaRetryMessage({
          kind: "error",
          text: "Ollama is not configured. Set OLLAMA_BASE_URL (or your tunnel) first.",
        });
        return;
      }

      if (statusData?.ollama?.reachable === false) {
        setOllamaRetryMessage({
          kind: "error",
          text: statusData?.ollama?.error
            ? localRetryUnsupported
              ? `Ollama is still offline: ${statusData.ollama.error} (Open GateKeep on your Mac to restart Ollama/cloudflared.)`
              : `Ollama is still offline: ${statusData.ollama.error}`
            : localRetryData?.attempted
              ? "Ollama is still offline after retry. Start Ollama or check OLLAMA_BASE_URL (or your tunnel)."
              : localRetryUnsupported
                ? "Ollama is offline. This deployment can't restart your tunnel—open GateKeep on your Mac to start Ollama/cloudflared, then retry."
                : "Ollama is still offline. Start Ollama or check OLLAMA_BASE_URL (or your tunnel).",
        });
        return;
      }

      const modelsResponse = await fetch("/api/ollama/models");
      const modelsData = await modelsResponse.json();
      if (!modelsResponse.ok || modelsData?.error) {
        throw new Error(modelsData?.error || "Failed to fetch Ollama models");
      }

      const count = Array.isArray(modelsData?.models)
        ? modelsData.models.length
        : 0;
      setOllamaRetryMessage({
        kind: "success",
        text:
          count > 0
            ? `Loaded ${count} Ollama model${count === 1 ? "" : "s"}.`
            : "Connected, but no models were returned.",
      });
    } catch (error) {
      setOllamaRetryMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to fetch Ollama models",
      });
    } finally {
      setOllamaRetrying(false);
    }
  }, []);

  const startNgrokTunnel = useCallback(async () => {
    setOllamaNgrokStarting(true);
    setOllamaNgrokMessage(null);
    setOllamaRetryMessage(null);
    setRenderSyncMessage(null);
    try {
      const response = await fetch("/api/ollama/ngrok", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!data?.ok || typeof data?.publicUrl !== "string") {
        throw new Error(data?.error || "Failed to start ngrok");
      }
      setOllamaNgrokMessage({
        kind: "success",
        text:
          "ngrok tunnel is running. Use this URL as OLLAMA_BASE_URL in Vercel, or set OLLAMA_BASE_URL=ngrok locally for auto-refresh.",
        url: data.publicUrl,
        deploymentUrl: null,
      });
    } catch (error) {
      setOllamaNgrokMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to start ngrok",
        url: null,
        deploymentUrl: null,
      });
    } finally {
      setOllamaNgrokStarting(false);
    }
  }, []);

  const syncNgrokToVercel = useCallback(async () => {
    setOllamaNgrokSyncing(true);
    setOllamaNgrokMessage(null);
    setOllamaRetryMessage(null);
    setRenderSyncMessage(null);
    try {
      const response = await fetch("/api/ollama/ngrok/sync", {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!data?.ok) {
        throw new Error(data?.error || "Failed to sync ngrok to Vercel");
      }
      setOllamaNgrokMessage({
        kind: "success",
        text: "Synced ngrok tunnel to Vercel and started a new deployment.",
        url:
          typeof data?.ngrok?.publicUrl === "string"
            ? data.ngrok.publicUrl
            : null,
        deploymentUrl: typeof data?.url === "string" ? data.url : null,
      });
    } catch (error) {
      setOllamaNgrokMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to sync ngrok to Vercel",
        url: null,
        deploymentUrl: null,
      });
    } finally {
      setOllamaNgrokSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  type StatusItem = {
    name: string;
    description: string;
    configured: boolean | undefined;
    reachable?: boolean | null;
    error?: string | null;
    warning?: string | null;
    icon: JSX.Element;
  };

  const statusItems: StatusItem[] = [
    {
      name: "Claude API",
      description: "Anthropic Claude for AI assistance",
      configured: status?.claude?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      name: "OpenAI API",
      description: "OpenAI GPT models",
      configured: status?.openai?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
        </svg>
      ),
    },
    {
      name: "Google Gemini",
      description: "Google Gemini models",
      configured: status?.gemini?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 19.7778H22L12 2ZM12 5.68889L17.5111 16H6.48889L12 5.68889Z" />
        </svg>
      ),
    },
    {
      name: "Groq",
      description: "Groq (free-tier rate limits apply)",
      configured: status?.groq?.configured,
      warning: status?.groq?.warning || null,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5a1 1 0 10-2 0v4.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3A1 1 0 0013 14v-7z" />
        </svg>
      ),
    },
    {
      name: "OpenRouter",
      description: "Free & paid AI models",
      configured: status?.openrouter?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      name: "Fireworks",
      description: "Image generation",
      configured: status?.fireworks?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.6 4.9 5.1.1-4.1 3 1.6 4.9-4.2-3-4.2 3 1.6-4.9-4.1-3 5.1-.1L12 2z" />
        </svg>
      ),
    },
    {
      name: "Nanobanana",
      description: "Image generation",
      configured: status?.nanobanana?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 6a5 5 0 019-1l2 2a5 5 0 01-7 7l-4-4a3 3 0 010-4z" />
        </svg>
      ),
    },
    {
      name: "Ideogram",
      description: "Image generation",
      configured: status?.ideogram?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v3H4V4zm0 6h16v3H4v-3zm0 6h16v3H4v-3z" />
        </svg>
      ),
    },
    {
      name: "Ollama",
      description: "Local or hosted Ollama models",
      configured: status?.ollama?.configured,
      reachable: status?.ollama?.reachable,
      error: status?.ollama?.error,
      warning: status?.ollama?.warning || null,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 5a1 1 0 00-1 1v3H8a1 1 0 000 2h3v3a1 1 0 102 0v-3h3a1 1 0 100-2h-3V8a1 1 0 00-1-1z" />
        </svg>
      ),
    },
    {
      name: "GitHub",
      description: status?.github?.username
        ? `@${status.github.username}`
        : "Repository management",
      configured: status?.github?.configured,
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      ),
    },
    {
      name: "Vercel",
      description: "Deployment platform",
      configured: status?.vercel?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 76 65" fill="currentColor">
          <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
        </svg>
      ),
    },
    {
      name: "Render",
      description: "Deployment platform",
      configured: status?.render?.configured,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" />
        </svg>
      ),
    },
  ];

  const runtimeLabel = (() => {
    const runtime = status?.runtime;
    if (!runtime) return null;
    if (runtime.onVercel) {
      const envLabel = runtime.vercelEnv
        ? runtime.vercelEnv.toUpperCase()
        : "VERCEL";
      const parts = [`Runtime: ${envLabel}`];
      if (runtime.vercelGitRef) parts.push(`ref: ${runtime.vercelGitRef}`);
      if (runtime.vercelUrl) parts.push(runtime.vercelUrl);
      return parts.join(" · ");
    }

    if (runtime.onRender) return "Runtime: RENDER";
    return "Runtime: Local";
  })();

  const groqSetupHint = (() => {
    const runtime = status?.runtime;
    if (runtime?.onVercel) {
      if (runtime.vercelEnv === "preview") {
        return (
          <>
            You are on a Preview deployment. Set{" "}
            <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
              GROQ_API_KEY
            </code>{" "}
            in Vercel Environment Variables (Preview), then redeploy.
          </>
        );
      }

      if (runtime.vercelEnv === "production") {
        return (
          <>
            You are on Production. Set{" "}
            <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
              GROQ_API_KEY
            </code>{" "}
            in Vercel Environment Variables (Production), then redeploy.
          </>
        );
      }

      return (
        <>
          Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            GROQ_API_KEY
          </code>{" "}
          in Vercel Environment Variables (Production + Preview), then redeploy.
        </>
      );
    }

    if (runtime?.onRender) {
      return (
        <>
          Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            GROQ_API_KEY
          </code>{" "}
          in Render Environment Variables, then redeploy.
        </>
      );
    }

    return (
      <>
        Set{" "}
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
          GROQ_API_KEY
        </code>{" "}
        in{" "}
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
          .env.local
        </code>
        , then restart the dev server.
      </>
    );
  })();

  const renderSetupHint = (() => {
    const runtime = status?.runtime;
    if (runtime?.onVercel) {
      if (runtime.vercelEnv === "preview") {
        return (
          <>
            You are on a Preview deployment. Set{" "}
            <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
              RENDER_API_KEY
            </code>{" "}
            in Vercel Environment Variables (Preview), then redeploy.
          </>
        );
      }

      if (runtime.vercelEnv === "production") {
        return (
          <>
            You are on Production. Set{" "}
            <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
              RENDER_API_KEY
            </code>{" "}
            in Vercel Environment Variables (Production), then redeploy.
          </>
        );
      }

      return (
        <>
          Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            RENDER_API_KEY
          </code>{" "}
          in Vercel Environment Variables (Production + Preview), then redeploy.
        </>
      );
    }

    if (runtime?.onRender) {
      return (
        <>
          Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            RENDER_API_KEY
          </code>{" "}
          in Render Environment Variables, then redeploy.
        </>
      );
    }

    return (
      <>
        Set{" "}
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
          RENDER_API_KEY
        </code>{" "}
        in{" "}
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
          .env.local
        </code>
        , then restart the dev server.
      </>
    );
  })();

  const ollamaSetupHint = (() => {
    const runtime = status?.runtime;
    if (!runtime?.onVercel && !runtime?.onRender) {
      return (
        <>
          Start Ollama locally (default{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            http://localhost:11434
          </code>
          ), then refresh.
        </>
      );
    }

    if (runtime?.onRender) {
      return (
        <>
          Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            OLLAMA_BASE_URL
          </code>{" "}
          to your public tunnel URL in Render Environment Variables, then
          redeploy.
        </>
      );
    }

    if (runtime.vercelEnv === "preview") {
      return (
        <>
          You are on a Preview deployment. Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            OLLAMA_BASE_URL
          </code>{" "}
          to your public tunnel URL in Vercel Environment Variables (Preview),
          then redeploy.
        </>
      );
    }

    if (runtime.vercelEnv === "production") {
      return (
        <>
          You are on Production. Set{" "}
          <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
            OLLAMA_BASE_URL
          </code>{" "}
          to your public tunnel URL in Vercel Environment Variables
          (Production), then redeploy.
        </>
      );
    }

    return (
      <>
        Set{" "}
        <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
          OLLAMA_BASE_URL
        </code>{" "}
        to your public tunnel URL in Vercel Environment Variables (Production +
        Preview), then redeploy.
      </>
    );
  })();

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* API Status */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              API Configuration
            </h3>
            <button
              onClick={fetchStatus}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Refresh
            </button>
          </div>
          {runtimeLabel && (
            <p className="text-sm text-slate-500 mb-3">{runtimeLabel}</p>
          )}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <svg
                  className="animate-spin h-6 w-6 text-indigo-500"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : (
              statusItems.map((item) => {
                const showOffline =
                  item.name === "Ollama" &&
                  item.configured &&
                  item.reachable === false;
                const showChecking =
                  item.name === "Ollama" &&
                  item.configured &&
                  item.reachable === null;

                const badgeText = showChecking
                  ? "Checking"
                  : showOffline
                    ? "Offline"
                    : item.configured
                      ? "Connected"
                      : "Not Configured";

                const badgeClass = showChecking
                  ? "bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-300"
                  : showOffline
                    ? "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300"
                    : item.configured
                      ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {item.description}
                        </p>
                        {showOffline && item.error && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {item.error}
                          </p>
                        )}
                        {item.warning && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            {item.warning}
                          </p>
                        )}
                        {item.name === "Groq" && item.configured === false && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {groqSetupHint}
                          </p>
                        )}
                        {item.name === "Groq" && groqSyncMessage && (
                          <div
                            className={`text-xs mt-1 ${
                              groqSyncMessage.kind === "success"
                                ? "text-green-700 dark:text-green-300"
                                : "text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            <p>{groqSyncMessage.text}</p>
                            {groqSyncMessage.deploymentUrl && (
                              <p className="mt-1">
                                <a
                                  href={groqSyncMessage.deploymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Open deployment
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                        {item.name === "Render" &&
                          item.configured === false && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {renderSetupHint}
                            </p>
                          )}
                        {item.name === "Render" && renderSyncMessage && (
                          <div
                            className={`text-xs mt-1 ${
                              renderSyncMessage.kind === "success"
                                ? "text-green-700 dark:text-green-300"
                                : "text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            <p>{renderSyncMessage.text}</p>
                            {renderSyncMessage.deploymentUrl && (
                              <p className="mt-1">
                                <a
                                  href={renderSyncMessage.deploymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Open deployment
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                        {item.name === "Ollama" &&
                          item.configured === false && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {ollamaSetupHint}
                            </p>
                          )}
                        {item.name === "Ollama" && status?.ollama?.url && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            URL:{" "}
                            <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                              {status.ollama.url}
                            </code>
                            {status.ollama.source
                              ? ` (${status.ollama.source})`
                              : null}
                          </p>
                        )}
                        {item.name === "Ollama" && ollamaRetryMessage && (
                          <p
                            className={`text-xs mt-1 ${
                              ollamaRetryMessage.kind === "success"
                                ? "text-green-700 dark:text-green-300"
                                : "text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            {ollamaRetryMessage.text}
                          </p>
                        )}
                        {item.name === "Ollama" && ollamaNgrokMessage && (
                          <div
                            className={`text-xs mt-1 ${
                              ollamaNgrokMessage.kind === "success"
                                ? "text-green-700 dark:text-green-300"
                                : "text-amber-700 dark:text-amber-300"
                            }`}
                          >
                            <p>{ollamaNgrokMessage.text}</p>
                            {ollamaNgrokMessage.url && (
                              <p className="mt-1">
                                <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                  {ollamaNgrokMessage.url}
                                </code>
                              </p>
                            )}
                            {ollamaNgrokMessage.deploymentUrl && (
                              <p className="mt-1">
                                <a
                                  href={ollamaNgrokMessage.deploymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Open deployment
                                </a>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                      >
                        {badgeText}
                      </div>
                      {item.name === "Groq" &&
                        status?.runtime?.onVercel === false &&
                        status?.runtime?.onRender !== true && (
                          <button
                            type="button"
                            onClick={syncGroqToVercel}
                            disabled={
                              groqSyncing ||
                              !status?.vercel?.configured ||
                              !status?.github?.configured
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={
                              status?.vercel?.configured &&
                              status?.github?.configured
                                ? "Sets GROQ_API_KEY in Vercel (Production + Preview) and triggers a deploy"
                                : "Configure VERCEL_TOKEN and GITHUB_TOKEN in .env.local to sync automatically"
                            }
                          >
                            {groqSyncing ? "Syncing…" : "Sync to Vercel"}
                          </button>
                        )}
                      {item.name === "Render" &&
                        status?.runtime?.onVercel === false &&
                        status?.runtime?.onRender !== true && (
                          <button
                            type="button"
                            onClick={syncRenderToVercel}
                            disabled={
                              renderSyncing ||
                              !status?.vercel?.configured ||
                              !status?.github?.configured
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={
                              status?.vercel?.configured &&
                              status?.github?.configured
                                ? "Sets RENDER_API_KEY in Vercel (Production + Preview) and triggers a deploy"
                                : "Configure VERCEL_TOKEN and GITHUB_TOKEN in .env.local to sync automatically"
                            }
                          >
                            {renderSyncing ? "Syncing…" : "Sync to Vercel"}
                          </button>
                        )}
                      {item.name === "Ollama" &&
                        status?.runtime?.onVercel === false &&
                        status?.runtime?.onRender !== true && (
                          <>
                            <button
                              type="button"
                              onClick={startNgrokTunnel}
                              disabled={ollamaNgrokStarting}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {ollamaNgrokStarting
                                ? "Starting ngrok…"
                                : "Start ngrok"}
                            </button>
                            <button
                              type="button"
                              onClick={syncNgrokToVercel}
                              disabled={
                                ollamaNgrokSyncing ||
                                !status?.vercel?.configured
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title={
                                status?.vercel?.configured
                                  ? "Starts ngrok (if needed), updates OLLAMA_BASE_URL in Vercel, and triggers a deploy"
                                  : "Configure VERCEL_TOKEN in .env.local to sync automatically"
                              }
                            >
                              {ollamaNgrokSyncing
                                ? "Syncing…"
                                : "Sync to Vercel"}
                            </button>
                          </>
                        )}
                      {item.name === "Ollama" && item.configured && (
                        <button
                          type="button"
                          onClick={retryFetchOllama}
                          disabled={ollamaRetrying || showChecking}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Retry fetching Ollama models"
                        >
                          {ollamaRetrying ? (
                            <>
                              <svg
                                className="animate-spin h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Retrying…
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-3.5 h-3.5"
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
                              Retry
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Local: configure keys in{" "}
            <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
              .env.local
            </code>
            . Vercel: set them in Project Settings → Environment Variables.
          </p>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Appearance
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  Theme
                </h4>
                <p className="text-sm text-slate-500">
                  Choose your preferred color scheme
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <svg
                      className="w-5 h-5 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Light
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Dark
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Account
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  Sign Out
                </h4>
                <p className="text-sm text-slate-500">
                  Sign out of your current session
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            About
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-glow">
                <GlassesLogo className="w-7 h-7 text-black" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  GateKeep
                </h4>
                <p className="text-sm text-slate-500">Version 1.0.0</p>
                <p className="text-xs text-slate-400 mt-1">
                  AI-powered web development assistant
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
