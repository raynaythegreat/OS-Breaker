"use client";

import { useEffect, useMemo, useState } from "react";

export type ImageProviderId = "fireworks" | "nanobanana" | "ideogram";

export interface ImageProviderOption {
  id: ImageProviderId;
  label: string;
  description: string;
  configured: boolean;
  models?: string[];
  defaultModel?: string;
}

interface ImageGeneratorModalProps {
  open: boolean;
  providers: ImageProviderOption[];
  defaultProvider?: ImageProviderId;
  onClose: () => void;
  onGenerate: (params: {
    provider: ImageProviderId;
    prompt: string;
    size: string;
    model?: string;
  }) => Promise<boolean>;
  loading: boolean;
  error?: string | null;
}

const SIZE_OPTIONS = [
  { value: "512x512", label: "512 x 512" },
  { value: "768x768", label: "768 x 768" },
  { value: "1024x1024", label: "1024 x 1024" },
];

export default function ImageGeneratorModal({
  open,
  providers,
  defaultProvider,
  onClose,
  onGenerate,
  loading,
  error,
}: ImageGeneratorModalProps) {
  const providerFallback = providers[0]?.id ?? "fireworks";
  const [provider, setProvider] = useState<ImageProviderId>(
    defaultProvider ?? providerFallback,
  );
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [model, setModel] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const currentProviderConfig = useMemo(
    () => providers.find((item) => item.id === provider),
    [provider, providers],
  );
  const modelOptions = currentProviderConfig?.models ?? [];
  const defaultModelValue = currentProviderConfig?.defaultModel ?? "";

  const hasConfiguredProvider = useMemo(
    () => providers.some((item) => item.configured),
    [providers],
  );

  useEffect(() => {
    if (open) {
      setLocalError(null);
      setPrompt("");
      setSize("1024x1024");
      const nextProvider = defaultProvider ?? providerFallback;
      setProvider(nextProvider);
      const initialProvider = providers.find((item) => item.id === nextProvider);
      setModel(initialProvider?.defaultModel ?? "");
    }
  }, [open, defaultProvider, providerFallback, providers]);

  useEffect(() => {
    if (!open) return;
    setModel(defaultModelValue);
  }, [defaultModelValue, open, provider]);

  if (!open) return null;

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setLocalError("Prompt is required.");
      return;
    }

    if (!hasConfiguredProvider) {
      setLocalError("No image providers are configured yet.");
      return;
    }

    setLocalError(null);
    const success = await onGenerate({
      provider,
      prompt: trimmedPrompt,
      size,
      model: model.trim() || undefined,
    });
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-cyan-300/30 bg-black/80 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-cyan-50">
              Generate Image
            </h2>
            <p className="text-xs text-cyan-200/70">
              Generated images attach to your next message.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 text-cyan-200/80 hover:text-cyan-50 transition-colors"
            aria-label="Close image generator"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-cyan-100/80 mb-2">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as ImageProviderId)}
              className="w-full rounded-xl border border-cyan-300/30 bg-black/60 px-3 py-2 text-sm text-slate-900 dark:text-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              {providers.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={!item.configured}
                >
                  {item.label}
                  {item.configured ? "" : " (not configured)"}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-slate-600 dark:text-cyan-200/60">
              {providers.find((item) => item.id === provider)?.description ||
                "OpenAI-compatible image endpoint."}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-cyan-100/80 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Describe the image you want to generate..."
              className="w-full rounded-xl border border-cyan-300/30 bg-black/60 px-3 py-2 text-sm text-slate-900 dark:text-cyan-50 placeholder-slate-900/70 dark:placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-cyan-100/80 mb-2">
                Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-xl border border-cyan-300/30 bg-black/60 px-3 py-2 text-sm text-slate-900 dark:text-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              >
                {SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-cyan-100/80 mb-2">
                Model (optional)
              </label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Overrides env default"
                list={modelOptions.length > 0 ? `image-models-${provider}` : undefined}
                className="w-full rounded-xl border border-cyan-300/30 bg-black/60 px-3 py-2 text-sm text-slate-900 dark:text-cyan-50 placeholder-slate-900/70 dark:placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
              />
              {modelOptions.length > 0 && (
                <datalist id={`image-models-${provider}`}>
                  {modelOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              )}
            </div>
          </div>
        </div>

        {(localError || error) && (
          <div className="mt-4 text-xs text-red-200">
            {localError || error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-cyan-200/30 text-cyan-100/80 hover:text-cyan-50 hover:border-cyan-200/50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-cyan-200 text-black font-semibold text-sm hover:bg-cyan-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
