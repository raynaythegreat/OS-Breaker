"use client";

import { useState, useEffect } from "react";

const PROVIDERS = [
  { id: "opencodezen", name: "OpenCode Zen (Unified)", env: "OPENCODE_API_KEY", description: "Access OpenAI, Anthropic, Gemini, and more.", link: "https://opencode.ai/zen" },
  { id: "openrouter", name: "OpenRouter", env: "OPENROUTER_API_KEY", description: "Access a wide range of free and premium models.", link: "https://openrouter.ai/keys" },
  { id: "groq", name: "Groq", env: "GROQ_API_KEY", description: "High-speed inference for Llama, Mixtral, and Gemma.", link: "https://console.groq.com/keys" },
  { id: "fireworks", name: "Fireworks AI", env: "FIREWORKS_API_KEY", description: "Access to open-source and custom models.", link: "https://fireworks.ai/api-keys" },
];

const IMAGE_PROVIDERS = [
  { id: "openai_image", name: "DALL-E (via OpenCode Zen)", needsKey: "opencodezen" },
  { id: "fireworks_image", name: "Fireworks Image", needsKey: "fireworks" },
  { id: "ideogram", name: "Ideogram", env: "IDEOGRAM_API_KEY", link: "https://ideogram.ai/user/api" },
];

export default function ApiKeysSection() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "connected" | "failed">("idle");

  useEffect(() => {
    const loadedKeys: Record<string, string> = {};
    [...PROVIDERS, ...IMAGE_PROVIDERS].forEach((p) => {
      const stored = localStorage.getItem(`gatekeep-api-key-${p.id}`);
      if (stored) loadedKeys[p.id] = stored;
    });
    setKeys(loadedKeys);
    
    const storedImageGen = localStorage.getItem("gatekeep-image-gen-enabled");
    setImageGenEnabled(storedImageGen === "true");
    
    const storedOllama = localStorage.getItem("gatekeep-ollama-url");
    if (storedOllama) setOllamaUrl(storedOllama);
  }, []);

  const handleKeyChange = (id: string, value: string) => {
    setKeys((prev) => ({ ...prev, [id]: value }));
    if (value) {
      localStorage.setItem(`gatekeep-api-key-${id}`, value);
    } else {
      localStorage.removeItem(`gatekeep-api-key-${id}`);
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImageGenToggle = (enabled: boolean) => {
    setImageGenEnabled(enabled);
    localStorage.setItem("gatekeep-image-gen-enabled", String(enabled));
  };

  const checkOllamaConnection = async () => {
    setOllamaStatus("checking");
    localStorage.setItem("gatekeep-ollama-url", ollamaUrl);
    try {
      const res = await fetch(ollamaUrl);
      if (res.ok) {
        setOllamaStatus("connected");
      } else {
        setOllamaStatus("failed");
      }
    } catch {
      setOllamaStatus("failed");
    }
  };

  const renderProviderInput = (provider: any) => (
    <div key={provider.id} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-cyan-100">{provider.name}</label>
        {provider.link && (
          <a href={provider.link} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">
            Get API Key
          </a>
        )}
      </div>
      {provider.description && <p className="text-xs text-cyan-200/40">{provider.description}</p>}
      <div className="relative">
        <input
          type={showKey[provider.id] ? "text" : "password"}
          value={keys[provider.id] || ""}
          onChange={(e) => handleKeyChange(provider.id, e.target.value)}
          placeholder={`Enter ${provider.name} API Key`}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
        <button
          type="button"
          onClick={() => toggleShowKey(provider.id)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
        >
          {/* Eye icon SVG */}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Provider Configuration</h3>
          <p className="text-xs text-cyan-200/50">Manage your AI provider keys. OpenCode Zen unifies OpenAI, Anthropic, and Gemini.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROVIDERS.map(renderProviderInput)}
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Local AI (Ollama)</h3>
          <p className="text-xs text-cyan-200/50">
            Connect to your local Ollama instance. 
            <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="ml-1 text-cyan-400 hover:underline">Download Ollama</a>
          </p>
        </div>
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
             <label className="text-sm font-medium text-cyan-100">Ollama URL</label>
             <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
          </div>
          <button
            onClick={checkOllamaConnection}
            className="px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-200 hover:bg-cyan-600/30 border border-cyan-500/30 transition-colors h-[38px]"
          >
            {ollamaStatus === "checking" ? "Checking..." : ollamaStatus === "connected" ? "Connected" : "Connect"}
          </button>
        </div>
        {ollamaStatus === "connected" && <p className="text-xs text-emerald-400">Successfully connected to Ollama.</p>}
        {ollamaStatus === "failed" && <p className="text-xs text-rose-400">Failed to connect. Make sure Ollama is running and CORS is configured if needed.</p>}
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Image Generation</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-cyan-200/70">Enable Image Gen</span>
            <button
              onClick={() => handleImageGenToggle(!imageGenEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${imageGenEnabled ? "bg-cyan-600" : "bg-white/10"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${imageGenEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>
        {imageGenEnabled && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {IMAGE_PROVIDERS.map((provider) => 
              provider.env 
                ? renderProviderInput(provider) 
                : (
                  <div key={provider.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                     <p className="text-sm text-cyan-100 font-medium">{provider.name}</p>
                     <p className="text-xs text-cyan-200/60 mt-1">
                       Uses your {PROVIDERS.find(p => p.id === provider.needsKey)?.name} key.
                     </p>
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
