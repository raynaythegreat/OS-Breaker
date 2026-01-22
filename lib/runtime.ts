export function getRuntimeEnv() {
  const onVercel = process.env.VERCEL === "1";
  const onRender =
    process.env.RENDER === "true" ||
    (typeof process.env.RENDER_SERVICE_ID === "string" &&
      process.env.RENDER_SERVICE_ID.trim().length > 0);
  const onCloud = onVercel || onRender;
  return { onVercel, onRender, onCloud };
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || "http://localhost:11434";
}

export function getPlatformHint(): string {
  const platform = process.platform;
  if (platform === "linux") return "linux";
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "unknown";
}

export function summarizeProvidersFromEnv(): string[] {
  const providers: string[] = [];
  
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (process.env.CLAUDE_API_KEY) providers.push("claude");
  if (process.env.GEMINI_API_KEY) providers.push("gemini");
  if (process.env.OPENROUTER_API_KEY) providers.push("openrouter");
  if (process.env.GROQ_API_KEY) providers.push("groq");
  if (process.env.FIREWORKS_API_KEY) providers.push("fireworks");
  if (process.env.OLLAMA_BASE_URL) providers.push("ollama");
  
  return providers;
}

